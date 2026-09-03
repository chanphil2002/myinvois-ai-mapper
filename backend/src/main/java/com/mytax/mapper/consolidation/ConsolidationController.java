package com.mytax.mapper.consolidation;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.consolidation.dto.AddBatchItemRequest;
import com.mytax.mapper.consolidation.dto.ConsolidationBatchResponse;
import com.mytax.mapper.consolidation.dto.CreateConsolidationBatchRequest;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consolidation-batches")
public class ConsolidationController {

    private final ConsolidationService consolidationService;

    public ConsolidationController(ConsolidationService consolidationService) {
        this.consolidationService = consolidationService;
    }

    @PostMapping
    public ApiResponse<ConsolidationBatchResponse> getOrCreateBatch(@RequestBody CreateConsolidationBatchRequest request) {
        return ApiResponse.ok(consolidationService.getOrCreateBatch(CurrentUser.id(), request.periodYear(), request.periodMonth()));
    }

    @GetMapping
    public ApiResponse<List<ConsolidationBatchResponse>> list() {
        return ApiResponse.ok(consolidationService.listBatches(CurrentUser.id()));
    }

    @GetMapping("/{id}")
    public ApiResponse<ConsolidationBatchResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(consolidationService.getOwnedResponse(id, CurrentUser.id()));
    }

    @GetMapping("/{id}/eligible-invoices")
    public ApiResponse<List<MappedInvoiceResponse>> eligibleInvoices(@PathVariable Long id) {
        return ApiResponse.ok(consolidationService.listEligibleInvoices(id, CurrentUser.id()));
    }

    @PostMapping("/{id}/items")
    public ApiResponse<ConsolidationBatchResponse> addItem(@PathVariable Long id, @RequestBody AddBatchItemRequest request) {
        return ApiResponse.ok(consolidationService.addInvoice(id, CurrentUser.id(), request.mappedInvoiceId()));
    }

    @DeleteMapping("/{id}/items/{mappedInvoiceId}")
    public ApiResponse<ConsolidationBatchResponse> removeItem(@PathVariable Long id, @PathVariable Long mappedInvoiceId) {
        return ApiResponse.ok(consolidationService.removeInvoice(id, CurrentUser.id(), mappedInvoiceId));
    }

    @PostMapping("/{id}/generate")
    public ApiResponse<ConsolidationBatchResponse> generate(@PathVariable Long id) {
        return ApiResponse.ok(consolidationService.generate(id, CurrentUser.id()));
    }
}
