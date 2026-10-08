package com.mytax.mapper.mapping;

import com.mytax.mapper.document.Document;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;
import com.mytax.mapper.mapping.dto.SalesTransactionDraft;

import java.util.List;

public interface MappingEngine {

    /**
     * @return the extracted/mapped invoice draft plus the raw model response (stored for audit/debugging).
     */
    MappingResult map(Document document, byte[] fileBytes);

    /**
     * Consolidated-mode variant: extracts every individual sales transaction found in the
     * document (e.g. one per spreadsheet row) instead of treating the whole document as one
     * invoice. Used to build candidates for {@code ConsolidationService} grouping.
     *
     * @return the extracted transaction drafts plus the raw model response.
     */
    TransactionExtractionResult mapTransactions(Document document, byte[] fileBytes);

    record MappingResult(MappedInvoiceDraft draft, String rawResponseJson, String modelName) {
    }

    record TransactionExtractionResult(List<SalesTransactionDraft> drafts, String rawResponseJson, String modelName) {
    }
}
