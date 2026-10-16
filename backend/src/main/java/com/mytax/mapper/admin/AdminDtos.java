package com.mytax.mapper.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Request/response shapes for the admin console API. */
public final class AdminDtos {

    private AdminDtos() {
    }

    public record Overview(long totalUsers, long activeUsers, long newUsers30d, long payingUsers,
                           Map<String, Long> usersByPlan, long monthlyRevenueCents, long pendingCommissionCents,
                           long paidCommissionCents, BigDecimal aiCostThisMonthUsd) {
    }

    public record UserRow(Long id, String email, String companyName, String role, boolean active, String plan,
                          Instant planEndsAt, boolean autoRenew, String referralCode, String salesperson,
                          Instant createdAt) {
    }

    public record UpdateUser(Boolean active, String role) {
    }

    public record SalespersonRow(Long id, String name, String email, String phone, BigDecimal commissionPercent,
                                 boolean active, List<String> codes, long referredUsers, long payingUsers,
                                 long pendingCents, long paidCents, Instant createdAt) {
    }

    public record SaveSalesperson(String name, String email, String phone, BigDecimal commissionPercent,
                                  Boolean active) {
    }

    public record CodeRow(Long id, String code, Long salespersonId, String salesperson, boolean active,
                          long signups, Instant createdAt) {
    }

    public record CreateCode(Long salespersonId, String code) {
    }

    public record UpdateCode(Boolean active) {
    }

    public record CommissionRow(Long id, String salesperson, String userEmail, int paymentAmountCents,
                                BigDecimal percent, int amountCents, String status, Instant createdAt,
                                Instant paidAt) {
    }
}
