package com.mytax.mapper.admin;

import com.mytax.mapper.admin.AdminDtos.*;
import com.mytax.mapper.auth.User;
import com.mytax.mapper.auth.UserRepository;
import com.mytax.mapper.billing.Subscription;
import com.mytax.mapper.billing.SubscriptionRepository;
import com.mytax.mapper.billing.SubscriptionStatus;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.referral.*;
import com.mytax.mapper.usage.AiUsageEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin console: platform overview, user management, salespeople, referral codes and commissions. */
@Service
public class AdminService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SalespersonRepository salespersonRepository;
    private final ReferralCodeRepository codeRepository;
    private final CommissionRepository commissionRepository;
    private final AiUsageEventRepository usageRepository;

    public AdminService(UserRepository userRepository, SubscriptionRepository subscriptionRepository,
                        SalespersonRepository salespersonRepository, ReferralCodeRepository codeRepository,
                        CommissionRepository commissionRepository, AiUsageEventRepository usageRepository) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.salespersonRepository = salespersonRepository;
        this.codeRepository = codeRepository;
        this.commissionRepository = commissionRepository;
        this.usageRepository = usageRepository;
    }

    // ---- Overview -------------------------------------------------------------------------------

    public Overview overview() {
        List<User> users = userRepository.findAll();
        Map<Long, Subscription> active = activeSubscriptionsByUser();
        Instant monthAgo = Instant.now().minus(Duration.ofDays(30));
        Map<String, Long> byPlan = new TreeMap<>(active.values().stream()
                .collect(Collectors.groupingBy(Subscription::getPlan, Collectors.counting())));
        byPlan.put("free", users.size() - (long) active.size());
        Instant monthStart = LocalDate.now(ZONE).withDayOfMonth(1).atStartOfDay(ZONE).toInstant();
        BigDecimal aiCost = users.stream()
                .map(u -> usageRepository.sumCostSince(u.getId(), monthStart))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Overview(
                users.size(),
                users.stream().filter(User::isActive).count(),
                users.stream().filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(monthAgo)).count(),
                active.size(),
                byPlan,
                active.values().stream().mapToLong(Subscription::getAmountCents).sum(),
                commissionRepository.sumAmountByStatus(Commission.Status.PENDING),
                commissionRepository.sumAmountByStatus(Commission.Status.PAID),
                aiCost);
    }

    // ---- Users ----------------------------------------------------------------------------------

    public List<UserRow> users(String query) {
        Map<Long, Subscription> active = activeSubscriptionsByUser();
        Map<Long, ReferralCode> codes = codeRepository.findAll().stream()
                .collect(Collectors.toMap(ReferralCode::getId, Function.identity()));
        Map<Long, String> salespeople = salespersonRepository.findAll().stream()
                .collect(Collectors.toMap(Salesperson::getId, Salesperson::getName));
        String q = query == null ? "" : query.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(u -> q.isEmpty() || u.getEmail().toLowerCase().contains(q)
                        || (u.getCompanyName() != null && u.getCompanyName().toLowerCase().contains(q)))
                .sorted(Comparator.comparing(User::getId).reversed())
                .map(u -> {
                    Subscription sub = active.get(u.getId());
                    ReferralCode rc = u.getReferralCodeId() == null ? null : codes.get(u.getReferralCodeId());
                    return new UserRow(u.getId(), u.getEmail(), u.getCompanyName(), u.getRole(), u.isActive(),
                            sub == null ? "free" : sub.getPlan(), sub == null ? null : sub.getPeriodEnd(),
                            sub != null && sub.isAutoRenew(), rc == null ? null : rc.getCode(),
                            rc == null ? null : salespeople.get(rc.getSalespersonId()), u.getCreatedAt());
                })
                .toList();
    }

    @Transactional
    public void updateUser(Long adminId, Long userId, UpdateUser request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (userId.equals(adminId) && (Boolean.FALSE.equals(request.active())
                || (request.role() != null && !"ADMIN".equals(request.role())))) {
            throw new IllegalStateException("You can't deactivate or demote your own admin account");
        }
        if (request.active() != null) {
            user.setActive(request.active());
        }
        if (request.role() != null) {
            if (!Set.of("OWNER", "ADMIN").contains(request.role())) {
                throw new IllegalArgumentException("Role must be OWNER or ADMIN");
            }
            user.setRole(request.role());
        }
        userRepository.save(user);
    }

    // ---- Salespeople ----------------------------------------------------------------------------

    public List<SalespersonRow> salespeople() {
        List<ReferralCode> codes = codeRepository.findAll();
        List<User> users = userRepository.findAll();
        Map<Long, Subscription> active = activeSubscriptionsByUser();
        return salespersonRepository.findAll().stream()
                .sorted(Comparator.comparing(Salesperson::getId).reversed())
                .map(sp -> {
                    Set<Long> codeIds = codes.stream().filter(c -> c.getSalespersonId().equals(sp.getId()))
                            .map(ReferralCode::getId).collect(Collectors.toSet());
                    List<User> referred = users.stream()
                            .filter(u -> u.getReferralCodeId() != null && codeIds.contains(u.getReferralCodeId()))
                            .toList();
                    return new SalespersonRow(sp.getId(), sp.getName(), sp.getEmail(), sp.getPhone(),
                            sp.getCommissionPercent(), sp.isActive(),
                            codes.stream().filter(c -> c.getSalespersonId().equals(sp.getId()))
                                    .map(ReferralCode::getCode).toList(),
                            referred.size(),
                            referred.stream().filter(u -> active.containsKey(u.getId())).count(),
                            commissionRepository.sumAmountBySalespersonAndStatus(sp.getId(), Commission.Status.PENDING),
                            commissionRepository.sumAmountBySalespersonAndStatus(sp.getId(), Commission.Status.PAID),
                            sp.getCreatedAt());
                })
                .toList();
    }

    @Transactional
    public Long saveSalesperson(Long id, SaveSalesperson request) {
        Salesperson sp = id == null ? new Salesperson()
                : salespersonRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Salesperson not found"));
        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw new IllegalArgumentException("Name is required");
            }
            sp.setName(request.name().trim());
        } else if (id == null) {
            throw new IllegalArgumentException("Name is required");
        }
        if (request.email() != null) sp.setEmail(blankToNull(request.email()));
        if (request.phone() != null) sp.setPhone(blankToNull(request.phone()));
        if (request.commissionPercent() != null) {
            if (request.commissionPercent().signum() < 0 || request.commissionPercent().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Commission must be between 0 and 100%");
            }
            sp.setCommissionPercent(request.commissionPercent());
        }
        if (request.active() != null) sp.setActive(request.active());
        return salespersonRepository.save(sp).getId();
    }

    // ---- Referral codes -------------------------------------------------------------------------

    public List<CodeRow> codes() {
        Map<Long, String> salespeople = salespersonRepository.findAll().stream()
                .collect(Collectors.toMap(Salesperson::getId, Salesperson::getName));
        Map<Long, Long> signups = userRepository.findAll().stream()
                .filter(u -> u.getReferralCodeId() != null)
                .collect(Collectors.groupingBy(User::getReferralCodeId, Collectors.counting()));
        return codeRepository.findAll().stream()
                .sorted(Comparator.comparing(ReferralCode::getId).reversed())
                .map(c -> new CodeRow(c.getId(), c.getCode(), c.getSalespersonId(), salespeople.get(c.getSalespersonId()),
                        c.isActive(), signups.getOrDefault(c.getId(), 0L), c.getCreatedAt()))
                .toList();
    }

    /** Creates a code for a salesperson; generates one (e.g. "AMIR-7KQ2") when none is given. */
    @Transactional
    public String createCode(CreateCode request) {
        Salesperson sp = salespersonRepository.findById(request.salespersonId())
                .orElseThrow(() -> new EntityNotFoundException("Salesperson not found"));
        String code = request.code() == null || request.code().isBlank() ? generateCode(sp.getName())
                : request.code().trim().toUpperCase();
        if (!code.matches("[A-Z0-9-]{3,40}")) {
            throw new IllegalArgumentException("Codes use 3–40 letters, digits or dashes");
        }
        if (codeRepository.existsByCodeIgnoreCase(code)) {
            throw new IllegalArgumentException("That code is already taken");
        }
        return codeRepository.save(new ReferralCode(code, sp.getId())).getCode();
    }

    @Transactional
    public void updateCode(Long id, UpdateCode request) {
        ReferralCode code = codeRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Code not found"));
        if (request.active() != null) {
            code.setActive(request.active());
        }
        codeRepository.save(code);
    }

    private String generateCode(String name) {
        String prefix = name.replaceAll("[^A-Za-z]", "").toUpperCase();
        prefix = prefix.isEmpty() ? "MYTAX" : prefix.substring(0, Math.min(6, prefix.length()));
        String code;
        do {
            StringBuilder sb = new StringBuilder(prefix).append('-');
            for (int i = 0; i < 4; i++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            code = sb.toString();
        } while (codeRepository.existsByCodeIgnoreCase(code));
        return code;
    }

    // ---- Commissions ----------------------------------------------------------------------------

    public List<CommissionRow> commissions(String status) {
        Map<Long, String> salespeople = salespersonRepository.findAll().stream()
                .collect(Collectors.toMap(Salesperson::getId, Salesperson::getName));
        Map<Long, String> emails = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));
        List<Commission> rows = status == null || status.isBlank()
                ? commissionRepository.findAllByOrderByCreatedAtDescIdDesc()
                : commissionRepository.findByStatusOrderByCreatedAtDescIdDesc(Commission.Status.valueOf(status));
        return rows.stream()
                .map(c -> new CommissionRow(c.getId(), salespeople.get(c.getSalespersonId()), emails.get(c.getUserId()),
                        c.getPaymentAmountCents(), c.getPercent(), c.getAmountCents(), c.getStatus().name(),
                        c.getCreatedAt(), c.getPaidAt()))
                .toList();
    }

    @Transactional
    public void markCommissionPaid(Long id) {
        Commission c = commissionRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Commission not found"));
        if (c.getStatus() != Commission.Status.PAID) {
            c.setStatus(Commission.Status.PAID);
            c.setPaidAt(Instant.now());
            commissionRepository.save(c);
        }
    }

    // ---- helpers --------------------------------------------------------------------------------

    private Map<Long, Subscription> activeSubscriptionsByUser() {
        Map<Long, Subscription> byUser = new HashMap<>();
        for (Subscription s : subscriptionRepository.findAll()) {
            if (s.getStatus() == SubscriptionStatus.ACTIVE) {
                byUser.merge(s.getUserId(), s, (a, b) -> a.getId() > b.getId() ? a : b);
            }
        }
        return byUser;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
