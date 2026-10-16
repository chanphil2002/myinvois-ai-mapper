package com.mytax.mapper.billing;

import com.mytax.mapper.auth.User;
import com.mytax.mapper.auth.UserRepository;
import com.mytax.mapper.billing.dto.PaymentResponse;
import com.mytax.mapper.billing.dto.RedirectResponse;
import com.mytax.mapper.billing.dto.SubscriptionResponse;
import com.mytax.mapper.config.StripeProperties;
import com.mytax.mapper.referral.ReferralService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Subscriptions and payments through Stripe.
 *
 * <ul>
 *   <li><b>Pay once</b> — Stripe Checkout in payment mode: FPX online banking, Visa/Mastercard, Apple
 *   Pay (whichever are enabled in the Stripe Dashboard). Buys 30 days of access; no renewal.</li>
 *   <li><b>Auto-renew</b> — Checkout in subscription mode: card / Apple Pay charged monthly by Stripe
 *   Billing. (FPX needs the customer to approve each transfer, so Stripe hides it here.)</li>
 * </ul>
 * Activation, renewals and cancellations arrive by signed webhook ({@link #handleWebhook}); the
 * browser redirect is only cosmetic.
 */
@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final Duration ONE_OFF_PERIOD = Duration.ofDays(30);

    /** Plan catalog: id -> display name + monthly price in sen. Keep in sync with the frontend. */
    private record Plan(String name, int amountCents) {
    }

    private static final Map<String, Plan> PLANS = Map.of(
            "beginner", new Plan("Beginner User", 2900),
            "heavy", new Plan("Heavy User", 9900),
            "elite", new Plan("Elite User", 29900)
    );

    private final StripeProperties stripe;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ReferralService referralService;
    private final String appUrl;

    public BillingService(StripeProperties stripe, SubscriptionRepository subscriptionRepository,
                          PaymentRepository paymentRepository, UserRepository userRepository,
                          ReferralService referralService, @Value("${app.public-url:http://localhost:5173}") String appUrl) {
        this.stripe = stripe;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.referralService = referralService;
        this.appUrl = appUrl.replaceAll("/+$", "");
    }

    // ---- Checkout ------------------------------------------------------------------------------

    @Transactional
    public RedirectResponse checkout(Long userId, String planId, boolean autoRenew) {
        Plan plan = PLANS.get(planId);
        if (plan == null) {
            throw new IllegalArgumentException("Unknown plan: " + planId);
        }
        requireConfigured();
        User user = userRepository.findById(userId).orElseThrow();
        Subscription sub = subscriptionRepository.save(Subscription.builder()
                .userId(userId)
                .plan(planId)
                .status(SubscriptionStatus.PENDING)
                .amountCents(plan.amountCents())
                .build());
        Session session = createCheckout(user, sub, plan, autoRenew, null);
        sub.setStripeCheckoutSessionId(session.getId());
        subscriptionRepository.save(sub);
        return new RedirectResponse(session.getUrl());
    }

    /**
     * Turns auto-renew on/off. For an existing Stripe subscription this flips cancel-at-period-end.
     * For a one-off (pay-once) plan, turning it on opens Checkout to save a card for a subscription
     * that starts when the current period ends — no double charge.
     */
    @Transactional
    public RedirectResponse setAutoRenew(Long userId, boolean enabled) {
        requireConfigured();
        Subscription current = activeSubscription(userId)
                .orElseThrow(() -> new IllegalStateException("You don't have an active plan"));
        if (current.getStripeSubscriptionId() != null) {
            try {
                com.stripe.model.Subscription remote = com.stripe.model.Subscription.retrieve(
                        current.getStripeSubscriptionId(), options());
                remote.update(SubscriptionUpdateParams.builder().setCancelAtPeriodEnd(!enabled).build(), options());
            } catch (StripeException e) {
                throw gatewayError("update auto-renew", e);
            }
            current.setAutoRenew(enabled);
            subscriptionRepository.save(current);
            return new RedirectResponse(null);
        }
        if (!enabled) {
            cancelScheduledRenewal(userId);
            return new RedirectResponse(null);
        }
        Plan plan = PLANS.get(current.getPlan());
        User user = userRepository.findById(userId).orElseThrow();
        Subscription renewal = subscriptionRepository.save(Subscription.builder()
                .userId(userId)
                .plan(current.getPlan())
                .status(SubscriptionStatus.PENDING)
                .amountCents(plan.amountCents())
                .build());
        Instant startAt = current.getPeriodEnd() != null && current.getPeriodEnd().isAfter(Instant.now().plus(Duration.ofDays(2)))
                ? current.getPeriodEnd() : null; // Stripe needs a trial end at least 48h ahead
        Session session = createCheckout(user, renewal, plan, true, startAt);
        renewal.setStripeCheckoutSessionId(session.getId());
        subscriptionRepository.save(renewal);
        return new RedirectResponse(session.getUrl());
    }

    /** Stripe Customer Portal: update card, view invoices, cancel. */
    public RedirectResponse billingPortal(Long userId) {
        requireConfigured();
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getStripeCustomerId() == null) {
            throw new IllegalStateException("No billing details yet — subscribe to a plan first");
        }
        try {
            var session = com.stripe.model.billingportal.Session.create(
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                            .setCustomer(user.getStripeCustomerId())
                            .setReturnUrl(appUrl + "/billing")
                            .build(), options());
            return new RedirectResponse(session.getUrl());
        } catch (StripeException e) {
            throw gatewayError("open the billing portal", e);
        }
    }

    private Session createCheckout(User user, Subscription sub, Plan plan, boolean recurring, Instant startAt) {
        var price = SessionCreateParams.LineItem.PriceData.builder()
                .setCurrency("myr")
                .setUnitAmount((long) plan.amountCents())
                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("MyTax " + plan.name()).build());
        if (recurring) {
            price.setRecurring(SessionCreateParams.LineItem.PriceData.Recurring.builder()
                    .setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH).build());
        }
        String id = String.valueOf(sub.getId());
        var params = SessionCreateParams.builder()
                .setMode(recurring ? SessionCreateParams.Mode.SUBSCRIPTION : SessionCreateParams.Mode.PAYMENT)
                .setCustomer(customerFor(user))
                .setClientReferenceId(id)
                .putMetadata("mytaxSubscriptionId", id)
                .setSuccessUrl(appUrl + "/billing?checkout=success")
                .setCancelUrl(appUrl + "/billing?checkout=cancelled")
                .addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L).setPriceData(price.build()).build());
        if (recurring) {
            var data = SessionCreateParams.SubscriptionData.builder().putMetadata("mytaxSubscriptionId", id);
            if (startAt != null) {
                data.setTrialEnd(startAt.getEpochSecond()); // first charge when the current period ends
            }
            params.setSubscriptionData(data.build());
        } else {
            params.setPaymentIntentData(SessionCreateParams.PaymentIntentData.builder()
                    .putMetadata("mytaxSubscriptionId", id).build());
        }
        try {
            return Session.create(params.build(), options());
        } catch (StripeException e) {
            throw gatewayError("start checkout", e);
        }
    }

    private String customerFor(User user) {
        if (user.getStripeCustomerId() != null) {
            return user.getStripeCustomerId();
        }
        try {
            Customer customer = Customer.create(CustomerCreateParams.builder()
                    .setEmail(user.getEmail())
                    .setName(user.getCompanyName())
                    .putMetadata("mytaxUserId", String.valueOf(user.getId()))
                    .build(), options());
            user.setStripeCustomerId(customer.getId());
            userRepository.save(user);
            return customer.getId();
        } catch (StripeException e) {
            throw gatewayError("create the customer", e);
        }
    }

    // ---- Webhook -------------------------------------------------------------------------------

    /** Verifies and applies a Stripe webhook event. Returns false when the signature is invalid. */
    @Transactional
    public boolean handleWebhook(String payload, String signature) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, stripe.getWebhookSecret());
        } catch (SignatureVerificationException | RuntimeException e) {
            log.warn("Stripe webhook rejected: {}", e.getMessage());
            return false;
        }
        StripeObject object = event.getDataObjectDeserializer().getObject().orElseGet(() -> {
            try {
                return event.getDataObjectDeserializer().deserializeUnsafe();
            } catch (Exception e) {
                throw new IllegalStateException("Unreadable Stripe event " + event.getId(), e);
            }
        });
        switch (event.getType()) {
            case "checkout.session.completed", "checkout.session.async_payment_succeeded" ->
                    onCheckoutCompleted((Session) object);
            case "invoice.paid" -> onInvoicePaid((Invoice) object);
            case "customer.subscription.updated" -> onSubscriptionUpdated((com.stripe.model.Subscription) object);
            case "customer.subscription.deleted" -> onSubscriptionDeleted((com.stripe.model.Subscription) object);
            default -> log.debug("Ignoring Stripe event {}", event.getType());
        }
        return true;
    }

    private void onCheckoutCompleted(Session session) {
        Optional<Subscription> found = subscriptionRepository.findFirstByStripeCheckoutSessionId(session.getId())
                .or(() -> byMetadata(session.getMetadata()));
        if (found.isEmpty()) {
            log.warn("Checkout {} has no matching subscription", session.getId());
            return;
        }
        Subscription sub = found.get();
        if ("subscription".equals(session.getMode())) {
            // Activation (and each renewal) comes from invoice.paid; just link the Stripe subscription.
            sub.setStripeSubscriptionId(session.getSubscription());
            sub.setAutoRenew(true);
            subscriptionRepository.save(sub);
            return;
        }
        if ("paid".equals(session.getPaymentStatus()) && sub.getStatus() == SubscriptionStatus.PENDING) {
            activate(sub, Instant.now().plus(ONE_OFF_PERIOD), false);
            recordPayment(sub, "stripe-" + (session.getPaymentIntent() != null ? session.getPaymentIntent() : session.getId()),
                    session.getAmountTotal() == null ? sub.getAmountCents() : session.getAmountTotal().intValue(), null);
        }
    }

    private void onInvoicePaid(Invoice invoice) {
        if (invoice.getSubscription() == null || invoice.getAmountPaid() == null || invoice.getAmountPaid() == 0) {
            return; // not a subscription charge, or the RM 0 invoice that opens a deferred-start trial
        }
        Subscription sub = subscriptionRepository.findFirstByStripeSubscriptionIdOrderByIdDesc(invoice.getSubscription())
                .or(() -> {
                    try {
                        return byMetadata(com.stripe.model.Subscription.retrieve(invoice.getSubscription(), options()).getMetadata());
                    } catch (StripeException e) {
                        return Optional.empty();
                    }
                })
                .orElse(null);
        if (sub == null) {
            log.warn("Paid invoice {} has no matching subscription", invoice.getId());
            return;
        }
        sub.setStripeSubscriptionId(invoice.getSubscription());
        Long end = invoice.getLines() != null && !invoice.getLines().getData().isEmpty()
                ? invoice.getLines().getData().get(0).getPeriod().getEnd() : null;
        activate(sub, end != null ? Instant.ofEpochSecond(end) : Instant.now().plus(ONE_OFF_PERIOD), true);
        recordPayment(sub, "stripe-" + invoice.getId(), invoice.getAmountPaid().intValue(), invoice.getHostedInvoiceUrl());
    }

    private void onSubscriptionUpdated(com.stripe.model.Subscription remote) {
        subscriptionRepository.findFirstByStripeSubscriptionIdOrderByIdDesc(remote.getId()).ifPresent(sub -> {
            sub.setAutoRenew(!Boolean.TRUE.equals(remote.getCancelAtPeriodEnd())
                    && Set.of("active", "trialing").contains(remote.getStatus()));
            subscriptionRepository.save(sub);
        });
    }

    private void onSubscriptionDeleted(com.stripe.model.Subscription remote) {
        subscriptionRepository.findFirstByStripeSubscriptionIdOrderByIdDesc(remote.getId()).ifPresent(sub -> {
            sub.setAutoRenew(false);
            if (sub.getStatus() == SubscriptionStatus.ACTIVE) {
                sub.setStatus(SubscriptionStatus.EXPIRED);
            } else if (sub.getStatus() == SubscriptionStatus.PENDING) {
                sub.setStatus(SubscriptionStatus.CANCELLED);
            }
            subscriptionRepository.save(sub);
        });
    }

    /** Makes {@code sub} the user's plan; any other active plan is superseded (and stops billing). */
    private void activate(Subscription sub, Instant periodEnd, boolean autoRenew) {
        for (Subscription other : subscriptionRepository.findByUserIdAndStatus(sub.getUserId(), SubscriptionStatus.ACTIVE)) {
            if (other.getId().equals(sub.getId())) {
                continue;
            }
            other.setStatus(SubscriptionStatus.CANCELLED);
            if (other.getStripeSubscriptionId() != null && !other.getStripeSubscriptionId().equals(sub.getStripeSubscriptionId())) {
                cancelRemote(other.getStripeSubscriptionId()); // plan switch: don't keep charging for the old plan
            }
            other.setAutoRenew(false);
            subscriptionRepository.save(other);
        }
        sub.setStatus(SubscriptionStatus.ACTIVE);
        if (sub.getPaidAt() == null) {
            sub.setPaidAt(Instant.now());
        }
        sub.setPeriodEnd(periodEnd);
        sub.setAutoRenew(autoRenew);
        subscriptionRepository.save(sub);
        log.info("Subscription {} active for user {} until {} (auto-renew {})", sub.getId(), sub.getUserId(), periodEnd, autoRenew);
    }

    private void recordPayment(Subscription sub, String ref, int amountCents, String receiptUrl) {
        if (paymentRepository.existsByProviderRef(ref)) {
            return; // webhook retried
        }
        Plan plan = PLANS.get(sub.getPlan());
        paymentRepository.save(new Payment(sub.getUserId(), sub.getId(), "STRIPE", ref, amountCents,
                "MyTax " + (plan != null ? plan.name() : sub.getPlan()), receiptUrl, Instant.now()));
        referralService.recordPayment(sub.getUserId(), sub.getId(), ref, amountCents);
    }

    private void cancelScheduledRenewal(Long userId) {
        for (Subscription pending : subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.PENDING)) {
            if (pending.getStripeSubscriptionId() != null) {
                cancelRemote(pending.getStripeSubscriptionId());
            }
            pending.setStatus(SubscriptionStatus.CANCELLED);
            subscriptionRepository.save(pending);
        }
    }

    private void cancelRemote(String stripeSubscriptionId) {
        try {
            com.stripe.model.Subscription.retrieve(stripeSubscriptionId, options()).cancel(
                    com.stripe.param.SubscriptionCancelParams.builder().build(), options());
        } catch (StripeException e) {
            log.warn("Could not cancel Stripe subscription {}: {}", stripeSubscriptionId, e.getMessage());
        }
    }

    // ---- Queries -------------------------------------------------------------------------------

    public SubscriptionResponse getCurrent(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        boolean renewalScheduled = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.PENDING)
                .stream().anyMatch(s -> s.getStripeSubscriptionId() != null);
        return activeSubscription(userId)
                .map(sub -> {
                    Plan plan = PLANS.get(sub.getPlan());
                    return new SubscriptionResponse(sub.getPlan(), plan != null ? plan.name() : sub.getPlan(),
                            sub.getStatus(), sub.getAmountCents(), sub.getPaidAt(), sub.getPeriodEnd(),
                            sub.isAutoRenew() || renewalScheduled, user.getStripeCustomerId() != null, renewalScheduled);
                })
                .orElse(null);
    }

    public List<PaymentResponse> payments(Long userId) {
        return paymentRepository.findByUserIdOrderByPaidAtDesc(userId).stream()
                .map(p -> new PaymentResponse(p.getId(), p.getDescription(), p.getAmountCents(), p.getProvider(),
                        p.getReceiptUrl(), p.getPaidAt()))
                .toList();
    }

    /** Expiry job: paid periods that ran out without renewal end the plan (a day's grace for webhooks). */
    @Transactional
    public int expireLapsed() {
        int n = 0;
        for (Subscription sub : subscriptionRepository.findByStatusAndPeriodEndBefore(
                SubscriptionStatus.ACTIVE, Instant.now().minus(Duration.ofDays(1)))) {
            // A renewing Stripe plan gets 3 days for a late/retried renewal before we give up on it.
            if (sub.isAutoRenew() && sub.getPeriodEnd().isAfter(Instant.now().minus(Duration.ofDays(3)))) {
                continue;
            }
            sub.setStatus(SubscriptionStatus.EXPIRED);
            sub.setAutoRenew(false);
            subscriptionRepository.save(sub);
            n++;
        }
        return n;
    }

    // ---- helpers -------------------------------------------------------------------------------

    private Optional<Subscription> activeSubscription(Long userId) {
        return subscriptionRepository.findFirstByUserIdAndStatusOrderByIdDesc(userId, SubscriptionStatus.ACTIVE);
    }

    private Optional<Subscription> byMetadata(Map<String, String> metadata) {
        String id = metadata == null ? null : metadata.get("mytaxSubscriptionId");
        return id == null ? Optional.empty() : subscriptionRepository.findById(Long.valueOf(id));
    }

    private RequestOptions options() {
        return RequestOptions.builder().setApiKey(stripe.getSecretKey()).build();
    }

    private void requireConfigured() {
        if (!stripe.isConfigured()) {
            // A clean 400 the UI can show, not a 500.
            throw new IllegalArgumentException("Payments aren't set up yet — add your Stripe keys (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).");
        }
    }

    private IllegalStateException gatewayError(String action, StripeException e) {
        log.error("Stripe failed to {}: {}", action, e.getMessage());
        return new IllegalStateException("Payment provider couldn't " + action + ": " + e.getUserMessage());
    }
}
