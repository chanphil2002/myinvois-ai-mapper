package com.mytax.mapper.mapping;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.config.GeminiProperties;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.XlsxParser;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Calls the Gemini generateContent API with a JSON response schema so the model's output is
 * structured JSON matching {@link MappedInvoiceDraft}, rather than free text we'd have to parse.
 * Images/PDFs are sent as inline_data parts (vision); .xlsx is parsed to text first via
 * {@link XlsxParser} since Gemini has no spreadsheet-cell understanding of raw binary xlsx.
 *
 * Uses the "generateContent" REST endpoint rather than Google's newer "Interactions API" —
 * generateContent remains fully supported and its structured-output shape (response_schema)
 * is stable and well documented; the newer API was still rolling out per-field detail at the
 * time this was written.
 */
@Service
@ConditionalOnProperty(name = "app.mapping.engine", havingValue = "gemini", matchIfMissing = true)
public class GeminiMappingService implements MappingEngine {

    private static final Logger log = LoggerFactory.getLogger(GeminiMappingService.class);

    private static final Set<String> IMAGE_TYPES = Set.of("png", "jpg", "jpeg", "webp", "gif");

    // gemini-3.5-flash occasionally degenerates under response_schema constraints: instead of
    // closing a string field it emits a runaway repeated-character or rambling "thinking out loud"
    // sequence until it hits the token limit. This is a decoding-time model quirk, not something
    // any single generation_config/prompt combination reliably avoids (tested: thinking on/off/
    // dynamic/bounded, schema maxLength, prompt simplification — all still fail intermittently).
    // Detecting and retrying is the practical mitigation.
    private static final int MAX_ATTEMPTS = 3;
    private static final int MAX_REASONABLE_STRING_LENGTH = 400;
    private static final Pattern RUNAWAY_REPEAT = Pattern.compile("(.)\\1{29,}");

    private final GeminiProperties properties;
    private final XlsxParser xlsxParser;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiMappingService(GeminiProperties properties, XlsxParser xlsxParser, ObjectMapper objectMapper) {
        this.properties = properties;
        this.xlsxParser = xlsxParser;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    @Override
    public MappingResult map(Document document, byte[] fileBytes) {
        String fileType = document.getFileType().toLowerCase();
        Map<String, Object> userPart = buildContentPart(fileType, fileBytes);

        Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt()))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(userPart)
                )),
                "generation_config", Map.of(
                        "response_mime_type", "application/json",
                        "response_schema", responseSchema(),
                        "max_output_tokens", 8192,
                        // Dynamic thinking budget — matches Google's recommended default and was the
                        // most reliable option in testing (fixed budgets, including 0, still degenerated).
                        "thinking_config", Map.of("thinking_budget", -1)
                )
        );

        String uri = properties.getBaseUrl() + "/v1beta/models/" + properties.getModel()
                + ":generateContent";

        Exception lastFailure = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            JsonNode response = restClient.post()
                    .uri(uri)
                    .headers(h -> h.set("x-goog-api-key", properties.getApiKey()))
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            String json = extractJsonText(response);
            try {
                JsonNode parsedJson = objectMapper.readTree(json);
                String runaway = findRunawayString(parsedJson);
                if (runaway != null) {
                    throw new IllegalStateException(
                            "Gemini produced a runaway/degenerate string value: " + runaway.substring(0, 60) + "...");
                }
                MappedInvoiceDraft draft = objectMapper.treeToValue(parsedJson, MappedInvoiceDraft.class);
                String oversizedUnitCode = findOversizedUnitCode(draft);
                if (oversizedUnitCode != null) {
                    throw new IllegalStateException(
                            "Gemini produced an oversized unitCode value: " + oversizedUnitCode.substring(0, 60) + "...");
                }
                return new MappingResult(draft, response == null ? "{}" : response.toString(), properties.getModel());
            } catch (Exception e) {
                lastFailure = e;
                log.warn("Gemini mapping attempt {}/{} produced malformed output for document {}: {}",
                        attempt, MAX_ATTEMPTS, document.getId(), e.getMessage());
            }
        }
        throw new IllegalStateException(
                "Gemini produced malformed structured output " + MAX_ATTEMPTS + " times in a row: "
                        + (lastFailure == null ? "unknown error" : lastFailure.getMessage()), lastFailure);
    }

    /**
     * unitCode is stored in a VARCHAR(10) column. The generic {@link #findRunawayString} check
     * only catches severe degeneration (400+ chars or a long repeated run); a shorter field like
     * this can still overflow the column with a moderate amount of "thinking out loud" text that
     * doesn't trip that heuristic, so it gets its own tighter bound.
     */
    private String findOversizedUnitCode(MappedInvoiceDraft draft) {
        if (draft.lineItems() == null) {
            return null;
        }
        for (MappedInvoiceDraft.LineItemDraft item : draft.lineItems()) {
            if (item.unitCode() != null && item.unitCode().length() > 10) {
                return item.unitCode();
            }
        }
        return null;
    }

    /**
     * Detects the degenerate-output pattern (runaway repeated character, or an anomalously long
     * value from the model "thinking out loud" inside a field instead of the separate thoughts
     * channel) by walking every string leaf in the parsed response.
     */
    private String findRunawayString(JsonNode node) {
        if (node.isTextual()) {
            String text = node.asText();
            if (text.length() > MAX_REASONABLE_STRING_LENGTH || RUNAWAY_REPEAT.matcher(text).find()) {
                return text;
            }
            return null;
        }
        if (node.isObject() || node.isArray()) {
            Iterator<JsonNode> children = node.elements();
            while (children.hasNext()) {
                String found = findRunawayString(children.next());
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private Map<String, Object> buildContentPart(String fileType, byte[] fileBytes) {
        if (IMAGE_TYPES.contains(fileType) || "pdf".equals(fileType)) {
            String mediaType = "pdf".equals(fileType)
                    ? "application/pdf"
                    : "jpg".equals(fileType) ? "image/jpeg" : "image/" + fileType;
            return Map.of(
                    "inline_data", Map.of(
                            "mime_type", mediaType,
                            "data", Base64.getEncoder().encodeToString(fileBytes)
                    )
            );
        }
        if ("xlsx".equals(fileType) || "xls".equals(fileType)) {
            List<List<String>> rows = xlsxParser.parse(fileBytes);
            StringBuilder text = new StringBuilder("Spreadsheet rows (tab-separated), row 1 is likely headers:\n");
            for (List<String> row : rows) {
                text.append(String.join("\t", row)).append('\n');
            }
            return Map.of("text", text.toString());
        }
        throw new UnsupportedOperationException(
                "Mapping for file type '" + fileType + "' is not implemented in this scaffold. " +
                        "Supported: xlsx/xls, pdf, png/jpg/jpeg/webp/gif.");
    }

    private String extractJsonText(JsonNode response) {
        if (response == null) {
            throw new IllegalStateException("Empty response from Gemini API");
        }
        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            throw new IllegalStateException("Gemini response had no candidates: " + response);
        }
        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            throw new IllegalStateException("Gemini response had no content parts: " + response);
        }
        return parts.get(0).path("text").asText();
    }

    private String systemPrompt() {
        return """
                You are an expert at reading Malaysian sales documents (invoices, receipts, order lists) \
                and mapping them into fields required for LHDN MyInvois e-Invoice submission (UBL 2.1-based). \
                Extract every field you can find. If a field is not present in the source document, omit it \
                rather than guessing. For invoiceTypeCode use "01" (standard invoice) unless the document clearly \
                indicates otherwise (e.g. "02" credit note, "03" debit note). currencyCode defaults to "MYR" if not stated. \
                For each field and each line item, include a confidenceScore between 0 and 1 reflecting how certain \
                you are the value was read/mapped correctly.

                Do not perform any arithmetic — do not multiply, apply percentages, or sum values, even if it looks \
                straightforward (e.g. quantity × unit price, or a discount/tax percentage against a subtotal). Only \
                report a number if it is written literally in the source document. If a total, tax amount, or line \
                amount is blank, marked "TBD", or left for a formula to fill in, omit that field entirely rather than \
                computing it — the user will fill it in during review.

                The supplier is always this app's own account holder, not something to read from the document — leave \
                supplierTin/supplierName as a best-effort cross-check only; they are not used for submission. \
                For the buyer, extract as much identity/contact detail as the document states: buyerIdType is "NRIC" \
                for an individual's national ID or "BRN" for a company registration number — only set it together with \
                buyerIdValue when the document actually shows that ID. Extract buyer address into buyerAddressLine1/2, \
                buyerCity, buyerPostalZone (postcode), buyerStateCode (a Malaysian state name if written, e.g. \
                "Selangor" — leave as free text, do not guess a numeric code), buyerCountryCode (ISO 3-letter, default \
                "MYS" for Malaysia), buyerPhone, buyerEmail. For each line item, unitCode is a short unit description \
                if stated (e.g. "unit", "kg", "box") — default to "unit" if quantity is a plain count with no unit shown.""";
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> lineItemSchema = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "description", Map.of("type", "STRING"),
                        "quantity", Map.of("type", "NUMBER"),
                        "unitPrice", Map.of("type", "NUMBER"),
                        "taxAmount", Map.of("type", "NUMBER"),
                        "classificationCode", Map.of("type", "STRING"),
                        "unitCode", Map.of("type", "STRING"),
                        "confidenceScore", Map.of("type", "NUMBER")
                ),
                "required", List.of("description", "quantity", "unitPrice")
        );

        return Map.of(
                "type", "OBJECT",
                "properties", Map.ofEntries(
                        Map.entry("invoiceTypeCode", Map.of("type", "STRING")),
                        Map.entry("issueDate", Map.of("type", "STRING", "description", "ISO-8601 date, e.g. 2026-07-18")),
                        Map.entry("currencyCode", Map.of("type", "STRING")),
                        Map.entry("supplierTin", Map.of("type", "STRING")),
                        Map.entry("supplierName", Map.of("type", "STRING")),
                        Map.entry("buyerTin", Map.of("type", "STRING")),
                        Map.entry("buyerName", Map.of("type", "STRING")),
                        Map.entry("buyerIdType", Map.of("type", "STRING")),
                        Map.entry("buyerIdValue", Map.of("type", "STRING")),
                        Map.entry("buyerSst", Map.of("type", "STRING")),
                        Map.entry("buyerAddressLine1", Map.of("type", "STRING")),
                        Map.entry("buyerAddressLine2", Map.of("type", "STRING")),
                        Map.entry("buyerCity", Map.of("type", "STRING")),
                        Map.entry("buyerPostalZone", Map.of("type", "STRING")),
                        Map.entry("buyerStateCode", Map.of("type", "STRING")),
                        Map.entry("buyerCountryCode", Map.of("type", "STRING")),
                        Map.entry("buyerPhone", Map.of("type", "STRING")),
                        Map.entry("buyerEmail", Map.of("type", "STRING")),
                        Map.entry("subtotal", Map.of("type", "NUMBER")),
                        Map.entry("taxTotal", Map.of("type", "NUMBER")),
                        Map.entry("grandTotal", Map.of("type", "NUMBER")),
                        Map.entry("discountTotal", Map.of("type", "NUMBER")),
                        Map.entry("confidenceScore", Map.of("type", "NUMBER")),
                        Map.entry("lineItems", Map.of("type", "ARRAY", "items", lineItemSchema))
                ),
                "required", List.of("lineItems")
        );
    }
}
