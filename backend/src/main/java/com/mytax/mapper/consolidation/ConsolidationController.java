package com.mytax.mapper.consolidation;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.consolidation.dto.ConsolidatedInvoiceResponse;
import com.mytax.mapper.consolidation.dto.CreateConsolidatedInvoiceRequest;
import com.mytax.mapper.consolidation.dto.CreateManualConsolidatedInvoiceRequest;
import com.mytax.mapper.consolidation.dto.UpdateConsolidatedInvoiceRequest;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ConsolidationController {

    private final ConsolidationService consolidationService;

    public ConsolidationController(ConsolidationService consolidationService) {
        this.consolidationService = consolidationService;
    }

    @GetMapping("/api/transactions/eligible")
    public ApiResponse<List<SalesTransactionResponse>> listEligibleTransactions() {
        return ApiResponse.ok(consolidationService.listEligibleTransactions(CurrentUser.id()));
    }

    @PostMapping("/api/consolidated-invoices")
    public ApiResponse<ConsolidatedInvoiceResponse> generate(@Valid @RequestBody CreateConsolidatedInvoiceRequest request) {
        return ApiResponse.ok(consolidationService.generate(CurrentUser.id(), request));
    }

    @PostMapping("/api/consolidated-invoices/manual")
    public ApiResponse<ConsolidatedInvoiceResponse> createManual(
            @Valid @RequestBody CreateManualConsolidatedInvoiceRequest request) {
        return ApiResponse.ok(consolidationService.createManual(CurrentUser.id(), request));
    }

    @GetMapping("/api/consolidated-invoices")
    public ApiResponse<List<ConsolidatedInvoiceResponse>> list() {
        return ApiResponse.ok(consolidationService.listForUser(CurrentUser.id()));
    }

    @GetMapping("/api/consolidated-invoices/{id}")
    public ApiResponse<ConsolidatedInvoiceResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(consolidationService.getOwnedResponse(id, CurrentUser.id()));
    }

    @PatchMapping("/api/consolidated-invoices/{id}")
    public ApiResponse<ConsolidatedInvoiceResponse> update(@PathVariable Long id,
                                                             @Valid @RequestBody UpdateConsolidatedInvoiceRequest request) {
        return ApiResponse.ok(consolidationService.update(id, CurrentUser.id(), request));
    }

    @PostMapping("/api/consolidated-invoices/{id}/confirm")
    public ApiResponse<ConsolidatedInvoiceResponse> confirm(@PathVariable Long id) {
        return ApiResponse.ok(consolidationService.confirm(id, CurrentUser.id()));
    }
}
