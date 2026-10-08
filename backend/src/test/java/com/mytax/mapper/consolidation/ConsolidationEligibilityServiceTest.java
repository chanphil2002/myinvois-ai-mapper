package com.mytax.mapper.consolidation;

import com.mytax.mapper.mapping.dto.SalesTransactionDraft;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ConsolidationEligibilityServiceTest {

    private final ConsolidationEligibilityService service = new ConsolidationEligibilityService();

    @Test
    void eligibleWhenNoBuyerIdentified() {
        assertThat(service.isEligible(draft(null, null))).isTrue();
    }

    @Test
    void notEligibleWhenBuyerTinPresent() {
        assertThat(service.isEligible(draft("C1234567890", null))).isFalse();
    }

    @Test
    void notEligibleWhenBuyerNamePresent() {
        assertThat(service.isEligible(draft(null, "Acme Sdn Bhd"))).isFalse();
    }

    @Test
    void blankBuyerFieldsTreatedAsAbsent() {
        assertThat(service.isEligible(draft("   ", "   "))).isTrue();
    }

    private SalesTransactionDraft draft(String buyerTin, String buyerName) {
        return new SalesTransactionDraft(null, "Item", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO,
                null, "unit", buyerName, buyerTin, BigDecimal.ONE);
    }
}
