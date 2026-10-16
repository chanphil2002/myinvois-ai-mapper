package com.mytax.mapper.auth;

import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.referral.ReferralService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** The signed-in user's own account: profile basics (incl. role) and referral code. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    public record MeResponse(Long userId, String email, String companyName, String role, String referralCode,
                             String avatar) {
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
                referralService.codeFor(user), user.getAvatar()));
    }

    private static final java.util.regex.Pattern AVATAR =
            java.util.regex.Pattern.compile("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$");
    /** The client crops and downsizes to 256×256 first; this bound just rejects anything unreasonable. */
    private static final int MAX_AVATAR_CHARS = 400_000;

    /** Set the profile photo (a cropped square image as a data URL). */
    @PutMapping("/avatar")
    public ApiResponse<Map<String, String>> setAvatar(@RequestBody Map<String, String> body) {
        String image = body.get("image");
        if (image == null || image.length() > MAX_AVATAR_CHARS || !AVATAR.matcher(image).matches()) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP image under 300 KB");
        }
        User user = userRepository.findById(CurrentUser.id()).orElseThrow();
        user.setAvatar(image);
        userRepository.save(user);
        return ApiResponse.ok(Map.of("avatar", image));
    }

    @DeleteMapping("/avatar")
    public ApiResponse<Void> removeAvatar() {
        User user = userRepository.findById(CurrentUser.id()).orElseThrow();
        user.setAvatar(null);
        userRepository.save(user);
        return ApiResponse.ok(null);
    }

    /** Apply a salesperson's referral code after sign-up (once). */
    @PostMapping("/referral")
    public ApiResponse<Map<String, String>> applyReferral(@RequestBody Map<String, String> body) {
        return ApiResponse.ok(Map.of("referralCode", referralService.applyCode(CurrentUser.id(), body.get("code"))));
    }
}
