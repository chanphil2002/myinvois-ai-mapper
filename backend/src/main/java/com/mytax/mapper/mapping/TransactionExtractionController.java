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

    public TransactionExtractionController(TransactionExtractionService transactionExtractionService) {
        this.transactionExtractionService = transactionExtractionService;
    }

    @PostMapping
    public ApiResponse<List<SalesTransactionResponse>> extract(@PathVariable Long documentId) {
        return ApiResponse.ok(transactionExtractionService.extractTransactions(documentId, CurrentUser.id()));
    }

    @GetMapping
    public ApiResponse<List<SalesTransactionResponse>> list(@PathVariable Long documentId) {
        return ApiResponse.ok(transactionExtractionService.listForDocument(documentId, CurrentUser.id()));
    }
}
