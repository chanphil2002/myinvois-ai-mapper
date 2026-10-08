package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.config.ConsolidationProperties;
import com.mytax.mapper.consolidation.ConsolidatedInvoice;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceStatus;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.profile.BusinessProfile;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConsolidatedUblDocumentBuilderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UblJsonSupport support = new UblJsonSupport();
    private final ConsolidationProperties consolidationProperties = new ConsolidationProperties();
    private final ConsolidatedUblDocumentBuilder builder =
            new ConsolidatedUblDocumentBuilder(objectMapper, support, consolidationProperties);

    @Test
    void buildIncludesInvoicePeriodGenericBuyerAndOneLinePerTransaction() throws Exception {
        BusinessProfile supplier = BusinessProfile.builder()
                .registrationName("Test Supplier Sdn Bhd")
                .tin("C1111111111")
                .idType("BRN")
                .idValue("202001234567")
                .countryCode("MYS")
                .build();

        ConsolidatedInvoice invoice = ConsolidatedInvoice.builder()
                .userId(1L)
                .periodStart(LocalDate.of(2026, 1, 1))
                .periodEnd(LocalDate.of(2026, 1, 31))
                .subtotal(new BigDecimal("100.00"))
                .taxTotal(new BigDecimal("6.00"))
                .grandTotal(new BigDecimal("106.00"))
                .status(ConsolidatedInvoiceStatus.CONFIRMED)
                .build();
        invoice.setId(42L);

        SalesTransaction t1 = SalesTransaction.builder()
                .documentId(1L).description("Coffee").quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("50.00")).taxAmount(new BigDecimal("3.00")).unitCode("unit")
                .build();
        t1.setId(1L);
        SalesTransaction t2 = SalesTransaction.builder()
                .documentId(1L).description("Tea").quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("50.00")).taxAmount(new BigDecimal("3.00")).unitCode("unit")
                .build();
        t2.setId(2L);

        BuiltDocument built = builder.build(supplier, invoice, List.of(t1, t2));

        assertThat(built.codeNumber()).isEqualTo("CON-42");

        String json = new String(Base64.getDecoder().decode(built.base64Document()), StandardCharsets.UTF_8);
        JsonNode invoiceNode = objectMapper.readTree(json).path("Invoice").get(0);

        JsonNode period = invoiceNode.path("InvoicePeriod").get(0);
        assertThat(period.path("StartDate").get(0).path("_").asText()).isEqualTo("2026-01-01");
        assertThat(period.path("EndDate").get(0).path("_").asText()).isEqualTo("2026-01-31");

        JsonNode buyerParty = invoiceNode.path("AccountingCustomerParty").get(0).path("Party").get(0);
        assertThat(buyerParty.path("PartyLegalEntity").get(0).path("RegistrationName").get(0).path("_").asText())
                .isEqualTo(consolidationProperties.getGenericBuyerName());

        assertThat(invoiceNode.path("InvoiceLine")).hasSize(2);

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        assertThat(built.sha256Hash()).isEqualTo(hex.toString());
    }
}
