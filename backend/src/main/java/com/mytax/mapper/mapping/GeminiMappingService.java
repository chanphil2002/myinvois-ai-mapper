package com.mytax.mapper.mapping;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.config.GeminiProperties;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.XlsxParser;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    private static final Set<String> IMAGE_TYPES = Set.of("png", "jpg", "jpeg", "webp", "gif");

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
                        // Thinking is on by default on this model and was observed producing corrupted
                        // structured output (a runaway multi-thousand-digit number) under response_schema
                        // constraints; disabling it fixed it in testing. This is a straightforward
                        // extraction task that doesn't need multi-step reasoning anyway.
                        "thinking_config", Map.of("thinking_budget", 0)
                )
        );

        String uri = properties.getBaseUrl() + "/v1beta/models/" + properties.getModel()
                + ":generateContent";

        JsonNode response = restClient.post()
                .uri(uri)
                .headers(h -> h.set("x-goog-api-key", properties.getApiKey()))
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);

        String json = extractJsonText(response);
        MappedInvoiceDraft draft;
        try {
            draft = objectMapper.readValue(json, MappedInvoiceDraft.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse Gemini structured output: " + e.getMessage(), e);
        }
        return new MappingResult(draft, response == null ? "{}" : response.toString(), properties.getModel());
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
                computing it — the user will fill it in during review.""";
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
                        Map.entry("subtotal", Map.of("type", "NUMBER")),
                        Map.entry("taxTotal", Map.of("type", "NUMBER")),
                        Map.entry("grandTotal", Map.of("type", "NUMBER")),
                        Map.entry("confidenceScore", Map.of("type", "NUMBER")),
                        Map.entry("lineItems", Map.of("type", "ARRAY", "items", lineItemSchema))
                ),
                "required", List.of("lineItems")
        );
    }
}
