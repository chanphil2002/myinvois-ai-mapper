package com.mytax.mapper.mapping;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents/{documentId}/transactions")
public class TransactionExtractionController {

    private final TransactionExtractionService transactionExtractionService;
    private final ExtractionJobSupport extractionJobSupport;

    public TransactionExtractionController(TransactionExtractionService transactionExtractionService, ExtractionJobSupport extractionJobSupport) {
        this.transactionExtractionService = transactionExtractionService;
        this.extractionJobSupport = extractionJobSupport;
    }

    @PostMapping
    public ApiResponse<List<SalesTransactionResponse>> extract(@PathVariable Long documentId) {
        try {
            return ApiResponse.ok(transactionExtractionService.extractTransactions(documentId, CurrentUser.id()));
        } catch (IllegalStateException e) {
            // An AI parse failure (the service wraps those in IllegalStateException, and ownership /
            // quota errors are other types, so another user's document is never touched). The
            // service's transaction has rolled back by now; persist the failure separately.
            extractionJobSupport.recordFailure(documentId, e.getMessage());
            throw e;
        }
    }

    @GetMapping
    public ApiResponse<List<SalesTransactionResponse>> list(@PathVariable Long documentId) {
        return ApiResponse.ok(transactionExtractionService.listForDocument(documentId, CurrentUser.id()));
    }
}
