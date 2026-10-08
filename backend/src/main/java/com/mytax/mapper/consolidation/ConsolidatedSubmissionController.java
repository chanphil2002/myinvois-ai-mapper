package com.mytax.mapper.consolidation;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.invoice.dto.SubmissionResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Submission endpoints for consolidated invoices. Status refresh is intentionally NOT duplicated
 * here — {@code POST /api/submissions/{id}/refresh} on {@code InvoiceSubmissionController} already
 * handles both individual and consolidated submissions (see {@code SubmissionService.refreshStatus}).
 */
@RestController
public class ConsolidatedSubmissionController {

    private final ConsolidatedSubmissionService consolidatedSubmissionService;

    public ConsolidatedSubmissionController(ConsolidatedSubmissionService consolidatedSubmissionService) {
        this.consolidatedSubmissionService = consolidatedSubmissionService;
    }

    @PostMapping("/api/consolidated-invoices/{id}/submit")
    public ApiResponse<SubmissionResponse> submit(@PathVariable Long id) {
        return ApiResponse.ok(consolidatedSubmissionService.submit(id, CurrentUser.id()));
    }

    @GetMapping("/api/consolidated-invoices/{id}/submissions")
    public ApiResponse<List<SubmissionResponse>> list(@PathVariable Long id) {
        return ApiResponse.ok(consolidatedSubmissionService.listForConsolidatedInvoice(id, CurrentUser.id()));
    }
}
