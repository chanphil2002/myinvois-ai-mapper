package com.mytax.mapper.mapping;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.config.AnthropicProperties;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.XlsxParser;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Calls the Claude Messages API with a forced tool-use call so the model's response is
 * structured JSON matching {@link MappedInvoiceDraft}, rather than free text we'd have to parse.
 * Images/PDFs are sent as native content blocks (vision); .xlsx is parsed to text first via
 * {@link XlsxParser} since Claude has no spreadsheet-cell understanding of raw binary xlsx.
 */
@Service
public class ClaudeMappingService implements MappingEngine {

    private static final String TOOL_NAME = "record_invoice_mapping";
    private static final Set<String> IMAGE_TYPES = Set.of("png", "jpg", "jpeg", "webp", "gif");

    private final AnthropicProperties properties;
    private final XlsxParser xlsxParser;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public ClaudeMappingService(AnthropicProperties properties, XlsxParser xlsxParser, ObjectMapper objectMapper) {
        this.properties = properties;
        this.xlsxParser = xlsxParser;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    @Override
    public MappingResult map(Document document, byte[] fileBytes) {
        String fileType = document.getFileType().toLowerCase();
        Map<String, Object> userContentBlock = buildContentBlock(fileType, fileBytes);

        Map<String, Object> requestBody = Map.of(
                "model", properties.getModel(),
                "max_tokens", 4096,
                "system", systemPrompt(),
                "tools", List.of(mappingTool()),
                "tool_choice", Map.of("type", "tool", "name", TOOL_NAME),
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(userContentBlock)
                ))
        );

        JsonNode response = restClient.post()
                .uri(properties.getBaseUrl() + "/v1/messages")
                .headers(h -> {
                    h.set("x-api-key", properties.getApiKey());
                    h.set("anthropic-version", "2023-06-01");
                    if ("pdf".equals(fileType)) {
                        h.set("anthropic-beta", "pdfs-2024-09-25");
                    }
                })
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);

        JsonNode toolInput = extractToolInput(response);
        MappedInvoiceDraft draft = objectMapper.convertValue(toolInput, MappedInvoiceDraft.class);
        return new MappingResult(draft, response == null ? "{}" : response.toString(), properties.getModel());
    }

    private Map<String, Object> buildContentBlock(String fileType, byte[] fileBytes) {
        if (IMAGE_TYPES.contains(fileType)) {
            String mediaType = "jpg".equals(fileType) ? "image/jpeg" : "image/" + fileType;
            return Map.of(
                    "type", "image",
                    "source", Map.of(
                            "type", "base64",
                            "media_type", mediaType,
                            "data", Base64.getEncoder().encodeToString(fileBytes)
                    )
            );
        }
        if ("pdf".equals(fileType)) {
            return Map.of(
                    "type", "document",
                    "source", Map.of(
                            "type", "base64",
                            "media_type", "application/pdf",
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
            return Map.of("type", "text", "text", text.toString());
        }
        throw new UnsupportedOperationException(
                "Mapping for file type '" + fileType + "' is not implemented in this scaffold. " +
                        "Supported: xlsx/xls, pdf, png/jpg/jpeg/webp/gif.");
    }

    private JsonNode extractToolInput(JsonNode response) {
        if (response == null || !response.has("content")) {
            throw new IllegalStateException("Empty response from Claude API");
        }
        for (JsonNode block : response.get("content")) {
            if ("tool_use".equals(block.path("type").asText()) && TOOL_NAME.equals(block.path("name").asText())) {
                return block.get("input");
            }
        }
        throw new IllegalStateException("Claude response did not contain a " + TOOL_NAME + " tool_use block");
    }

    private String systemPrompt() {
        return """
                You are an expert at reading Malaysian sales documents (invoices, receipts, order lists) \
                and mapping them into fields required for LHDN MyInvois e-Invoice submission (UBL 2.1-based). \
                Extract every field you can find. If a field is not present in the source document, leave it null \
                rather than guessing. For invoiceTypeCode use "01" (standard invoice) unless the document clearly \
                indicates otherwise (e.g. "02" credit note, "03" debit note). currencyCode defaults to "MYR" if not stated. \
                For each field and each line item, include a confidenceScore between 0 and 1 reflecting how certain \
                you are the value was read/mapped correctly.""";
    }

    private Map<String, Object> mappingTool() {
        Map<String, Object> lineItemSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "description", Map.of("type", "string"),
                        "quantity", Map.of("type", "number"),
                        "unitPrice", Map.of("type", "number"),
                        "taxAmount", Map.of("type", "number"),
                        "classificationCode", Map.of("type", "string", "description", "LHDN e-Invoice classification code, if identifiable"),
                        "confidenceScore", Map.of("type", "number")
                ),
                "required", List.of("description", "quantity", "unitPrice")
        );

        Map<String, Object> inputSchema = Map.of(
                "type", "object",
                "properties", Map.ofEntries(
                        Map.entry("invoiceTypeCode", Map.of("type", "string")),
                        Map.entry("issueDate", Map.of("type", "string", "description", "ISO-8601 date, e.g. 2026-07-18")),
                        Map.entry("currencyCode", Map.of("type", "string")),
                        Map.entry("supplierTin", Map.of("type", "string")),
                        Map.entry("supplierName", Map.of("type", "string")),
                        Map.entry("buyerTin", Map.of("type", "string")),
                        Map.entry("buyerName", Map.of("type", "string")),
                        Map.entry("subtotal", Map.of("type", "number")),
                        Map.entry("taxTotal", Map.of("type", "number")),
                        Map.entry("grandTotal", Map.of("type", "number")),
                        Map.entry("confidenceScore", Map.of("type", "number")),
                        Map.entry("lineItems", Map.of("type", "array", "items", lineItemSchema))
                ),
                "required", List.of("lineItems")
        );

        return Map.of(
                "name", TOOL_NAME,
                "description", "Record the mapped MyInvois e-Invoice fields extracted from the source document.",
                "input_schema", inputSchema
        );
    }
}
