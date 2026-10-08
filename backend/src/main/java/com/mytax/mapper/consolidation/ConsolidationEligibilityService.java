package com.mytax.mapper.consolidation;

import com.mytax.mapper.mapping.dto.SalesTransactionDraft;
import org.springframework.stereotype.Component;

/**
 * The one place the "who counts as eligible for consolidation" rule lives. LHDN's exact policy
 * (B2C only, excluded industries, generic-buyer requirements, etc.) isn't available in this
 * codebase or the reference Postman collection — this is a pragmatic default (no buyer TIN/name
 * present = the classic B2C signal), always paired with a manual override grid in the UI
 * ({@code ConsolidationBuilder}) so a wrong default here never silently ships. Replace this
 * class's logic with a real LHDN-conformant rule set once one is available, without touching
 * extraction or grouping code.
 */
@Component
public class ConsolidationEligibilityService {

    public boolean isEligible(SalesTransactionDraft draft) {
        boolean hasBuyerTin = draft.buyerTin() != null && !draft.buyerTin().isBlank();
        boolean hasBuyerName = draft.buyerName() != null && !draft.buyerName().isBlank();
        return !hasBuyerTin && !hasBuyerName;
    }
}
