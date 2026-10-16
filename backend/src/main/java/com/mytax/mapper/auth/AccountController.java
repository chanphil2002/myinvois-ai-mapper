package com.mytax.mapper.auth;

import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.referral.ReferralService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** The signed-in user's own account: profile basics (incl. role) and referral code. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    public record MeResponse(Long userId, String email, String companyName, String role, String referralCode) {
    }

    private final UserRepository userRepository;
    private final ReferralService referralService;

    public AccountController(UserRepository userRepository, ReferralService referralService) {
        this.userRepository = userRepository;
        this.referralService = referralService;
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me() {
        User user = userRepository.findById(CurrentUser.id()).orElseThrow();
        return ApiResponse.ok(new MeResponse(user.getId(), user.getEmail(), user.getCompanyName(), user.getRole(),
                referralService.codeFor(user)));
    }

    /** Apply a salesperson's referral code after sign-up (once). */
    @PostMapping("/referral")
    public ApiResponse<Map<String, String>> applyReferral(@RequestBody Map<String, String> body) {
        return ApiResponse.ok(Map.of("referralCode", referralService.applyCode(CurrentUser.id(), body.get("code"))));
    }
}
