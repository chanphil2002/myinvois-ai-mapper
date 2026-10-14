package com.mytax.mapper.usage;

import com.mytax.mapper.billing.SubscriptionRepository;
import com.mytax.mapper.billing.SubscriptionStatus;
import com.mytax.mapper.usage.dto.UsageResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mytax.mapper.common.QuotaExceededException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Propagation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

/**
 * Server-side source of truth for AI usage, metered by what each AI call actually consumed.
 *
 * <p>Every Gemini call is recorded with its token counts and cost — including attempts that were
 * rejected and retried, since those cost money too. A plan's allowance is expressed as a number of
 * "typical" parses (token sizes measured from real receipts) converted to the same cost units, so
 * users see "% of allowance used" and an approximate number of typical documents left, while a
 * single heavy document correctly consumes more than a light one.
 */
@Service
public class UsageService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000);
    /** Free tier: allowance per day, in typical parses. */
    private static final int FREE_DAILY_TYPICAL_PARSES = 2;

    private record Plan(String name, int monthlyTypicalParses) {
    }

    private static final Map<String, Plan> PLANS = Map.of(
            "beginner", new Plan("Beginner User", 30),
            "heavy", new Plan("Heavy User", 500),
            "elite", new Plan("Elite User", 1500)
    );

    private final AiUsageEventRepository usageRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BigDecimal inputUsdPerMillion;
    private final BigDecimal outputUsdPerMillion;
    private final BigDecimal typicalParseCost;

    public UsageService(AiUsageEventRepository usageRepository,
                        SubscriptionRepository subscriptionRepository,
                        @Value("${app.ai-usage.input-usd-per-million:0.30}") BigDecimal inputUsdPerMillion,
                        @Value("${app.ai-usage.output-usd-per-million:2.50}") BigDecimal outputUsdPerMillion,
                        @Value("${app.ai-usage.typical-input-tokens:2100}") long typicalInputTokens,
                        @Value("${app.ai-usage.typical-output-tokens:2300}") long typicalOutputTokens) {
        this.usageRepository = usageRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.inputUsdPerMillion = inputUsdPerMillion;
        this.outputUsdPerMillion = outputUsdPerMillion;
        this.typicalParseCost = cost(typicalInputTokens, typicalOutputTokens);
    }

    /**
     * Records one AI call. Runs in its own transaction so a failed parse (whose surrounding
     * transaction rolls back) still keeps the record of the tokens it burned.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAiCall(Long userId, String operation, Long documentId, int promptTokens, int responseTokens,
                             int thoughtTokens, boolean success) {
        BigDecimal callCost = cost(promptTokens, (long) responseTokens + thoughtTokens);
        usageRepository.save(new AiUsageEvent(userId, operation, documentId, promptTokens, responseTokens,
                thoughtTokens, callCost, success));
    }

    /** Rejects a new AI parse once the period's allowance is fully used. */
    public void requireAllowance(Long userId) {
        Period period = currentPeriod(userId);
        if (usedCost(userId, period).compareTo(period.allowance()) >= 0) {
            throw new QuotaExceededException(period.free()
                    ? "You've used today's free AI allowance. It resets at midnight, or upgrade in Billing for more."
                    : "You've used 100% of this month's AI allowance. Upgrade your plan in Billing for more.");
        }
    }

    public UsageResponse getUsage(Long userId) {
        Period period = currentPeriod(userId);
        BigDecimal used = usedCost(userId, period);
        double usedPercent = period.allowance().signum() == 0 ? 100
                : used.multiply(BigDecimal.valueOf(100)).divide(period.allowance(), 1, RoundingMode.HALF_UP).doubleValue();
        BigDecimal left = period.allowance().subtract(used).max(BigDecimal.ZERO);
        long typicalLeft = left.divide(typicalParseCost, 0, RoundingMode.FLOOR).longValue();
        return new UsageResponse(period.planId(), period.planName(), period.free(), usedPercent, typicalLeft,
                period.typicalParses(), period.label());
    }

    private record Period(String planId, String planName, boolean free, int typicalParses, BigDecimal allowance,
                          Instant start, String label) {
    }

    private Period currentPeriod(Long userId) {
        String planId = subscriptionRepository
                .findFirstByUserIdAndStatusOrderByIdDesc(userId, SubscriptionStatus.ACTIVE)
                .map(s -> s.getPlan())
                .orElse(null);
        if (planId == null || !PLANS.containsKey(planId)) {
            return new Period("free", "Free", true, FREE_DAILY_TYPICAL_PARSES,
                    typicalParseCost.multiply(BigDecimal.valueOf(FREE_DAILY_TYPICAL_PARSES)),
                    LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant(), "today");
        }
        Plan plan = PLANS.get(planId);
        return new Period(planId, plan.name(), false, plan.monthlyTypicalParses(),
                typicalParseCost.multiply(BigDecimal.valueOf(plan.monthlyTypicalParses())),
                LocalDate.now(ZONE).withDayOfMonth(1).atStartOfDay(ZONE).toInstant(), "this month");
    }

    private BigDecimal usedCost(Long userId, Period period) {
        BigDecimal metered = usageRepository.sumCostSince(userId, period.start());
        long unmetered = usageRepository.countUnmeteredSince(userId, period.start());
        return metered.add(typicalParseCost.multiply(BigDecimal.valueOf(unmetered)));
    }

    private BigDecimal cost(long inputTokens, long outputTokens) {
        return inputUsdPerMillion.multiply(BigDecimal.valueOf(inputTokens))
                .add(outputUsdPerMillion.multiply(BigDecimal.valueOf(outputTokens)))
                .divide(MILLION, 8, RoundingMode.HALF_UP);
    }
}
