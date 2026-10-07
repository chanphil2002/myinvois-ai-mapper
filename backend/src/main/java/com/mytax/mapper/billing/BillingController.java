package com.mytax.mapper.billing;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.billing.dto.SubscribeRequest;
import com.mytax.mapper.billing.dto.SubscribeResponse;
import com.mytax.mapper.billing.dto.SubscriptionResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @PostMapping("/subscribe")
    public ApiResponse<SubscribeResponse> subscribe(@Valid @RequestBody SubscribeRequest request) {
        return ApiResponse.ok(billingService.subscribe(CurrentUser.get(), request.plan()));
    }

    @GetMapping("/subscription")
    public ApiResponse<SubscriptionResponse> current() {
        return ApiResponse.ok(billingService.getCurrent(CurrentUser.id()));
    }

    /** Billplz server-to-server payment callback. Public (no JWT); authenticity is the X-Signature. */
    @PostMapping("/callback")
    public ResponseEntity<String> callback(@RequestParam Map<String, String> params) {
        billingService.handleCallback(params);
        return ResponseEntity.ok("OK");
    }
}
