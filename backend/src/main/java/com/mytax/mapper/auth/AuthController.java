package com.mytax.mapper.auth;

import com.mytax.mapper.auth.dto.AuthResponse;
import com.mytax.mapper.auth.dto.LoginRequest;
import com.mytax.mapper.auth.dto.RegisterRequest;
import com.mytax.mapper.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email already registered"));
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .companyName(request.companyName())
                .tin(request.tin())
                .role("OWNER")
                .build();
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(ApiResponse.ok(
                new AuthResponse(token, user.getId(), user.getEmail(), user.getCompanyName())));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalStateException("User disappeared after authentication"));

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(ApiResponse.ok(
                new AuthResponse(token, user.getId(), user.getEmail(), user.getCompanyName())));
    }
}
