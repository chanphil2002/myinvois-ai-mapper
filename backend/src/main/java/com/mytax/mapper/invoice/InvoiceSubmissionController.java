package com.mytax.mapper.invoice;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.invoice.dto.SubmissionResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class InvoiceSubmissionController {

    private final SubmissionService submissionService;

    public InvoiceSubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping("/api/mapped-invoices/{id}/submit")
    public ApiResponse<SubmissionResponse> submit(@PathVariable Long id) {
        return ApiResponse.ok(submissionService.submit(id, CurrentUser.id()));
    }

    @GetMapping("/api/mapped-invoices/{id}/submissions")
    public ApiResponse<List<SubmissionResponse>> list(@PathVariable Long id) {
        return ApiResponse.ok(submissionService.listForInvoice(id, CurrentUser.id()));
    }

    @PostMapping("/api/submissions/{id}/refresh")
    public ApiResponse<SubmissionResponse> refresh(@PathVariable Long id) {
        return ApiResponse.ok(submissionService.refreshStatus(id, CurrentUser.id()));
    }
}
