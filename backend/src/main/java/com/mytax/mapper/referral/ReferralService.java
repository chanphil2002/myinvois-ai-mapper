package com.mytax.mapper.referral;

import com.mytax.mapper.auth.User;
import com.mytax.mapper.auth.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Applies salesperson referral codes to users and records commission on referred users' payments. */
@Service
public class ReferralService {

    private static final Logger log = LoggerFactory.getLogger(ReferralService.class);

    private final ReferralCodeRepository codeRepository;
    private final SalespersonRepository salespersonRepository;
    private final CommissionRepository commissionRepository;
    private final UserRepository userRepository;

    public ReferralService(ReferralCodeRepository codeRepository, SalespersonRepository salespersonRepository,
                           CommissionRepository commissionRepository, UserRepository userRepository) {
        this.codeRepository = codeRepository;
        this.salespersonRepository = salespersonRepository;
        this.commissionRepository = commissionRepository;
        this.userRepository = userRepository;
    }

    /** Resolves an active code (case-insensitive); rejects unknown or disabled codes. */
    public ReferralCode requireActiveCode(String code) {
        ReferralCode rc = codeRepository.findByCodeIgnoreCase(code == null ? "" : code.trim())
                .filter(ReferralCode::isActive)
                .orElseThrow(() -> new IllegalArgumentException("That referral code isn't valid"));
        salespersonRepository.findById(rc.getSalespersonId())
                .filter(Salesperson::isActive)
                .orElseThrow(() -> new IllegalArgumentException("That referral code isn't valid"));
        return rc;
    }

    /** Attaches a referral code to a user who doesn't have one yet (a referral can't be changed later). */
    @Transactional
    public String applyCode(Long userId, String code) {
        User user = userRepository.findById(userId).orElseThrow();
        if (user.getReferralCodeId() != null) {
            throw new IllegalStateException("A referral code is already applied to your account");
        }
        ReferralCode rc = requireActiveCode(code);
        user.setReferralCodeId(rc.getId());
        userRepository.save(user);
        return rc.getCode();
    }

    public String codeFor(User user) {
        return user.getReferralCodeId() == null ? null
                : codeRepository.findById(user.getReferralCodeId()).map(ReferralCode::getCode).orElse(null);
    }

    /**
     * Records the referring salesperson's commission for one successful payment (recurring: every
     * payment, at the salesperson's current %). Idempotent per {@code paymentRef}; isolated in its
     * own transaction so a commission problem never breaks payment processing.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPayment(Long userId, Long subscriptionId, String paymentRef, int amountCents) {
        if (paymentRef == null || amountCents <= 0 || commissionRepository.existsByPaymentRef(paymentRef)) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getReferralCodeId() == null) {
            return;
        }
        codeRepository.findById(user.getReferralCodeId())
                .flatMap(rc -> salespersonRepository.findById(rc.getSalespersonId()))
                .filter(Salesperson::isActive)
                .ifPresent(sp -> {
                    int commission = BigDecimal.valueOf(amountCents).multiply(sp.getCommissionPercent())
                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
                    commissionRepository.save(new Commission(sp.getId(), userId, subscriptionId, paymentRef,
                            amountCents, sp.getCommissionPercent(), commission));
                    log.info("Commission {} sen for salesperson {} (user {}, payment {})", commission, sp.getId(),
                            userId, paymentRef);
                });
    }
}
