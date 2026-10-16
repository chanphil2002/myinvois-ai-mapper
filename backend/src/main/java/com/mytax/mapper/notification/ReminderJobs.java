package com.mytax.mapper.notification;

import com.mytax.mapper.billing.Subscription;
import com.mytax.mapper.billing.SubscriptionRepository;
import com.mytax.mapper.billing.SubscriptionStatus;
import com.mytax.mapper.consolidation.ConsolidatedInvoice;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceRepository;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceStatus;
import com.mytax.mapper.invoice.Submission;
import com.mytax.mapper.invoice.SubmissionRepository;
import com.mytax.mapper.invoice.SubmissionService;
import com.mytax.mapper.invoice.SubmissionStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;

/**
 * Background jobs behind the notifications: LHDN status polling (so "accepted" arrives without the
 * user pressing Refresh), plan-expiry reminders, and consolidated e-invoice deadline reminders.
 * Every notification carries a dedupe key, so re-running a job never duplicates an alert.
 */
@Component
public class ReminderJobs {

    private static final Logger log = LoggerFactory.getLogger(ReminderJobs.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy");
    /** LHDN guidance: a month's consolidated e-invoice within 7 days after month end. */
    private static final int CONSOLIDATION_GRACE_DAYS = 7;

    private final SubmissionRepository submissionRepository;
    private final SubmissionService submissionService;
    private final SubscriptionRepository subscriptionRepository;
    private final ConsolidatedInvoiceRepository consolidatedInvoiceRepository;
    private final NotificationService notificationService;
    private final com.mytax.mapper.billing.BillingService billingService;

    public ReminderJobs(SubmissionRepository submissionRepository, SubmissionService submissionService,
                        SubscriptionRepository subscriptionRepository,
                        ConsolidatedInvoiceRepository consolidatedInvoiceRepository,
                        NotificationService notificationService,
                        com.mytax.mapper.billing.BillingService billingService) {
        this.submissionRepository = submissionRepository;
        this.submissionService = submissionService;
        this.subscriptionRepository = subscriptionRepository;
        this.consolidatedInvoiceRepository = consolidatedInvoiceRepository;
        this.notificationService = notificationService;
        this.billingService = billingService;
    }

    /** Every 2 minutes: ask LHDN about submissions from the last 3 days that have no verdict yet. */
    @Scheduled(initialDelay = 60_000, fixedDelay = 120_000)
    public void pollPendingSubmissions() {
        List<Submission> pending = submissionRepository.findByStatusInAndSubmittedAtAfter(
                EnumSet.of(SubmissionStatus.PENDING, SubmissionStatus.IN_PROGRESS),
                Instant.now().minus(Duration.ofDays(3)));
        for (Submission s : pending) {
            Long owner = submissionService.ownerOf(s);
            if (owner == null) {
                continue;
            }
            try {
                submissionService.refreshStatus(s.getId(), owner); // notifies on Valid / Invalid
            } catch (Exception e) {
                log.warn("Background status check failed for submission {}: {}", s.getId(), e.getMessage());
            }
        }
    }

    /** Reminder jobs: shortly after start-up, then every 6 hours (dedupe keys prevent repeats). */
    @Scheduled(initialDelay = 120_000, fixedDelay = 6 * 3_600_000)
    public void runReminders() {
        billingService.expireLapsed();
        remindExpiringSubscriptions();
        remindConsolidatedDeadlines();
    }

    /** Plans that end within 7 days and won't renew: remind at 7 days and again at 1 day. */
    void remindExpiringSubscriptions() {
        Instant now = Instant.now();
        for (Subscription sub : subscriptionRepository.findByStatusAndAutoRenewFalseAndPeriodEndBetween(
                SubscriptionStatus.ACTIVE, now, now.plus(Duration.ofDays(7)))) {
            long hoursLeft = Duration.between(now, sub.getPeriodEnd()).toHours();
            String bucket = hoursLeft <= 24 ? "1d" : "7d";
            String ends = DAY.format(sub.getPeriodEnd().atZone(ZONE));
            notificationService.notify(sub.getUserId(), NotificationType.SUBSCRIPTION_EXPIRING,
                    hoursLeft <= 24 ? "Your plan ends tomorrow" : "Your plan ends on " + ends,
                    "Auto-renew is off, so your MyTax plan stops on " + ends
                            + ". Renew or turn on auto-renew in Billing to keep your AI allowance.",
                    "/billing", "sub-" + sub.getId() + "-expiring-" + bucket);
        }
    }

    /** Unsubmitted consolidated invoices: remind 3 days before, 1 day before, on the day, and once overdue. */
    void remindConsolidatedDeadlines() {
        LocalDate today = LocalDate.now(ZONE);
        for (ConsolidatedInvoice inv : consolidatedInvoiceRepository.findByStatusIn(
                EnumSet.of(ConsolidatedInvoiceStatus.DRAFT, ConsolidatedInvoiceStatus.CONFIRMED))) {
            if (inv.getPeriodEnd() == null) {
                continue;
            }
            LocalDate due = inv.getPeriodEnd().withDayOfMonth(inv.getPeriodEnd().lengthOfMonth())
                    .plusDays(CONSOLIDATION_GRACE_DAYS);
            long days = ChronoUnit.DAYS.between(today, due);
            String bucket = days < 0 ? (days >= -7 ? "overdue" : null)
                    : days == 0 ? "today" : days == 1 ? "1d" : days <= 3 ? "3d" : null;
            if (bucket == null) {
                continue;
            }
            String name = inv.getInvoiceName() != null && !inv.getInvoiceName().isBlank()
                    ? inv.getInvoiceName() : "Consolidated invoice #" + inv.getId();
            String title = switch (bucket) {
                case "overdue" -> name + " is overdue";
                case "today" -> name + " is due today";
                case "1d" -> name + " is due tomorrow";
                default -> name + " is due in " + days + " days";
            };
            notificationService.notify(inv.getUserId(), NotificationType.CONSOLIDATED_DUE, title,
                    "Your consolidated e-invoice for " + DAY.format(inv.getPeriodStart()) + " – "
                            + DAY.format(inv.getPeriodEnd()) + " should be submitted to LHDN by " + DAY.format(due)
                            + ". Review and submit it as soon as possible.",
                    "/consolidated-invoices/" + inv.getId(), "cons-" + inv.getId() + "-" + due + "-" + bucket);
        }
    }
}
