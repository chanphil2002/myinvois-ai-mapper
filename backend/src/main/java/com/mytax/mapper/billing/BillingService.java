package com.mytax.mapper.billing;

import com.mytax.mapper.auth.User;
import com.mytax.mapper.billing.dto.SubscribeResponse;
import com.mytax.mapper.billing.dto.SubscriptionResponse;
import com.mytax.mapper.config.BillplzProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    /** Plan catalog: id -> display name + price in cents (sen). Keep in sync with the frontend. */
    private record Plan(String name, int amountCents) {
    }

    private static final Map<String, Plan> PLANS = Map.of(
            "beginner", new Plan("Beginner User", 2900),
            "heavy", new Plan("Heavy User", 9900),
            "elite", new Plan("Elite User", 29900)
    );

    private final BillplzProperties properties;
    private final BillplzClient billplzClient;
    private final SubscriptionRepository subscriptionRepository;

    public BillingService(BillplzProperties properties, BillplzClient billplzClient,
                          SubscriptionRepository subscriptionRepository) {
        this.properties = properties;
        this.billplzClient = billplzClient;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Transactional
    public SubscribeResponse subscribe(User user, String planId) {
        Plan plan = PLANS.get(planId);
        if (plan == null) {
            throw new IllegalArgumentException("Unknown plan: " + planId);
        }
        if (!properties.isConfigured()) {
            // Clean 400 (not a 500) so the UI shows an actionable message.
            throw new IllegalArgumentException(
                    "Billing isn't set up yet. Add your Billplz API key and collection id to enable payments.");
        }

        String name = user.getCompanyName() != null && !user.getCompanyName().isBlank()
                ? user.getCompanyName() : user.getEmail();
        BillplzBill bill;
        try {
            bill = billplzClient.createBill(plan.amountCents(), name, user.getEmail(),
                    "MyTax " + plan.name() + " subscription");
        } catch (Exception e) {
            // Don't leak the raw gateway error (e.g. a 401 from a bad key) to the client.
            log.error("Billplz createBill failed", e);
            throw new IllegalStateException("Could not reach the payment gateway. Please try again later.");
        }
        if (bill == null || bill.url() == null) {
            throw new IllegalStateException("Billplz did not return a payment URL");
        }

        subscriptionRepository.save(Subscription.builder()
                .userId(user.getId())
                .plan(planId)
                .status(SubscriptionStatus.PENDING)
                .billplzBillId(bill.id())
                .amountCents(plan.amountCents())
                .build());

        return new SubscribeResponse(bill.url(), bill.id());
    }

    /**
     * Handles a Billplz payment callback (server-to-server). Verifies the X-Signature, then activates
     * the matching subscription when the bill is paid. Returns quietly on anything unexpected so the
     * webhook always 200s (Billplz retries non-2xx).
     */
    @Transactional
    public void handleCallback(Map<String, String> params) {
        if (!verifySignature(params)) {
            log.warn("Billplz callback rejected: X-Signature mismatch");
            return;
        }
        String billId = params.get("id");
        boolean paid = "true".equalsIgnoreCase(params.get("paid"));
        if (billId == null) {
            return;
        }
        subscriptionRepository.findFirstByBillplzBillId(billId).ifPresent(sub -> {
            if (paid && sub.getStatus() != SubscriptionStatus.ACTIVE) {
                // Supersede any previously active subscription for this user, then activate this one.
                for (Subscription other : subscriptionRepository.findByUserIdAndStatus(
                        sub.getUserId(), SubscriptionStatus.ACTIVE)) {
                    other.setStatus(SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(other);
                }
                sub.setStatus(SubscriptionStatus.ACTIVE);
                sub.setPaidAt(Instant.now());
                subscriptionRepository.save(sub);
                log.info("Subscription {} activated for user {} (plan {})", sub.getId(), sub.getUserId(), sub.getPlan());
            }
        });
    }

    public SubscriptionResponse getCurrent(Long userId) {
        return subscriptionRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId, SubscriptionStatus.ACTIVE)
                .map(sub -> {
                    Plan plan = PLANS.get(sub.getPlan());
                    return new SubscriptionResponse(sub.getPlan(), plan != null ? plan.name() : sub.getPlan(),
                            sub.getStatus(), sub.getAmountCents(), sub.getPaidAt());
                })
                .orElse(null);
    }

    /**
     * Verifies the Billplz X-Signature: concatenate each "key+value" (excluding x_signature), sort
     * ascending, join with '|', then HMAC-SHA256 with the X-Signature key. If no key is configured,
     * verification is skipped (sandbox/dev) with a warning.
     */
    private boolean verifySignature(Map<String, String> params) {
        String provided = params.get("x_signature");
        if (properties.getXSignatureKey() == null || properties.getXSignatureKey().isBlank()) {
            log.warn("Billplz X-Signature key not configured — skipping callback signature verification");
            return true;
        }
        if (provided == null) {
            return false;
        }
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (!"x_signature".equals(e.getKey())) {
                parts.add(e.getKey() + (e.getValue() == null ? "" : e.getValue()));
            }
        }
        parts.sort(String::compareTo);
        String source = String.join("|", parts);
        String computed = hmacSha256Hex(source, properties.getXSignatureKey());
        return computed != null && computed.equalsIgnoreCase(provided);
    }

    private String hmacSha256Hex(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Failed to compute Billplz signature", e);
            return null;
        }
    }
}
