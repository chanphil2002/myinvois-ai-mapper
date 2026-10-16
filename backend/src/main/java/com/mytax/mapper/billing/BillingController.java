package com.mytax.mapper.billing;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.billing.dto.CheckoutRequest;
import com.mytax.mapper.billing.dto.PaymentResponse;
import com.mytax.mapper.billing.dto.RedirectResponse;
import com.mytax.mapper.billing.dto.SubscriptionResponse;
import com.mytax.mapper.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /** Start Stripe Checkout (FPX / card / Apple Pay; auto-renew = card or Apple Pay subscription). */
    @PostMapping("/checkout")
    public ApiResponse<RedirectResponse> checkout(@Valid @RequestBody CheckoutRequest request) {
        return ApiResponse.ok(billingService.checkout(CurrentUser.id(), request.plan(), request.autoRenew()));
    }

    @PostMapping("/auto-renew")
    public ApiResponse<RedirectResponse> autoRenew(@RequestBody Map<String, Boolean> body) {
        return ApiResponse.ok(billingService.setAutoRenew(CurrentUser.id(), Boolean.TRUE.equals(body.get("enabled"))));
    }

    @PostMapping("/portal")
    public ApiResponse<RedirectResponse> portal() {
        return ApiResponse.ok(billingService.billingPortal(CurrentUser.id()));
    }

    @GetMapping("/subscription")
    public ApiResponse<SubscriptionResponse> current() {
        return ApiResponse.ok(billingService.getCurrent(CurrentUser.id()));
    }

    @GetMapping("/payments")
    public ApiResponse<List<PaymentResponse>> payments() {
        return ApiResponse.ok(billingService.payments(CurrentUser.id()));
    }

    /** Stripe webhook — public (no JWT); authenticity is the Stripe-Signature header. */
    @PostMapping("/stripe/webhook")
    public ResponseEntity<String> webhook(@RequestBody String payload,
                                          @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        return billingService.handleWebhook(payload, signature)
                ? ResponseEntity.ok("ok")
                : ResponseEntity.badRequest().body("invalid signature");
    }
}
