package com.mytax.mapper.usage;

import com.mytax.mapper.billing.SubscriptionRepository;
import com.mytax.mapper.billing.SubscriptionStatus;
import com.mytax.mapper.usage.dto.UsageResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

/**
 * Server-side source of truth for AI parsing usage. Each successful parse is recorded; the
 * remaining credits for the current period (a day on the free tier, a month on paid plans) are
 * computed from those records rather than inferred on the client.
 */
@Service
public class UsageService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final int FREE_DAILY_LIMIT = 2;

    private record Plan(String name, int monthlyLimit) {
    }

    private static final Map<String, Plan> PLANS = Map.of(
            "beginner", new Plan("Beginner User", 30),
            "heavy", new Plan("Heavy User", 500),
            "elite", new Plan("Elite User", 1500)
    );

    private final AiUsageEventRepository usageRepository;
    private final SubscriptionRepository subscriptionRepository;

    public UsageService(AiUsageEventRepository usageRepository, SubscriptionRepository subscriptionRepository) {
        this.usageRepository = usageRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Transactional
    public void record(Long userId, String operation, Long documentId) {
        usageRepository.save(new AiUsageEvent(userId, operation, documentId));
    }

    public UsageResponse getUsage(Long userId) {
        String planId = subscriptionRepository
                .findFirstByUserIdAndStatusOrderByIdDesc(userId, SubscriptionStatus.ACTIVE)
                .map(s -> s.getPlan())
                .orElse(null);

        boolean free = planId == null || !PLANS.containsKey(planId);
        long limit;
        String planName;
        String periodLabel;
        Instant periodStart;

        if (free) {
            limit = FREE_DAILY_LIMIT;
            planName = "Free";
            periodLabel = "today";
            periodStart = LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant();
        } else {
            Plan plan = PLANS.get(planId);
            limit = plan.monthlyLimit();
            planName = plan.name();
            periodLabel = "this month";
            periodStart = LocalDate.now(ZONE).withDayOfMonth(1).atStartOfDay(ZONE).toInstant();
        }

        long used = usageRepository.countByUserIdAndCreatedAtAfter(userId, periodStart);
        long remaining = Math.max(0, limit - used);
        return new UsageResponse(planId == null ? "free" : planId, planName, free, used, limit, remaining, periodLabel);
    }
}
