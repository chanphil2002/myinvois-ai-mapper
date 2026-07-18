package com.mytax.mapper.invoice;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.invoice.dto.UpdateMappedInvoiceRequest;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mapped-invoices")
public class InvoiceReviewController {

    private final InvoiceReviewService invoiceReviewService;

    public InvoiceReviewController(InvoiceReviewService invoiceReviewService) {
        this.invoiceReviewService = invoiceReviewService;
    }

    @GetMapping("/{id}")
    public ApiResponse<MappedInvoiceResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(invoiceReviewService.getOwnedResponse(id, CurrentUser.id()));
    }

    @PatchMapping("/{id}")
    public ApiResponse<MappedInvoiceResponse> update(@PathVariable Long id, @RequestBody UpdateMappedInvoiceRequest request) {
        return ApiResponse.ok(invoiceReviewService.update(id, CurrentUser.id(), request));
    }

    @PostMapping("/{id}/confirm")
    public ApiResponse<MappedInvoiceResponse> confirm(@PathVariable Long id) {
        return ApiResponse.ok(invoiceReviewService.confirm(id, CurrentUser.id()));
    }
}
