package com.mytax.mapper.myinvois;

import com.mytax.mapper.auth.User;
import com.mytax.mapper.auth.UserRepository;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.myinvois.dto.CredentialRequest;
import com.mytax.mapper.myinvois.dto.CredentialResponse;
import com.mytax.mapper.myinvois.dto.CredentialsOverviewResponse;
import com.mytax.mapper.myinvois.dto.RevealedCredentialResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MyInvoisCredentialService {

    private final MyInvoisCredentialRepository credentialRepository;
    private final CredentialCryptoService cryptoService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public MyInvoisCredentialService(MyInvoisCredentialRepository credentialRepository,
                                      CredentialCryptoService cryptoService,
                                      UserRepository userRepository,
                                      PasswordEncoder passwordEncoder) {
        this.credentialRepository = credentialRepository;
        this.cryptoService = cryptoService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Saves (creates or replaces) the credential for {@code request.environment()} only — sandbox and
     * production are stored side by side. The first credential a user saves becomes active.
     */
    @Transactional
    public CredentialsOverviewResponse save(Long userId, CredentialRequest request) {
        MyInvoisCredential credential = credentialRepository.findByUserIdAndEnvironment(userId, request.environment())
                .orElseGet(() -> MyInvoisCredential.builder().userId(userId).environment(request.environment()).build());
        credential.setClientId(request.clientId());
        credential.setClientSecretEncrypted(cryptoService.encrypt(request.clientSecret()));
        credentialRepository.save(credential);

        User user = getUser(userId);
        boolean activeHasCredential = credentialRepository
                .findByUserIdAndEnvironment(userId, user.getMyinvoisEnvironment()).isPresent();
        if (!activeHasCredential) {
            user.setMyinvoisEnvironment(request.environment());
            userRepository.save(user);
        }
        return overview(userId);
    }

    public CredentialsOverviewResponse overview(Long userId) {
        User user = getUser(userId);
        return new CredentialsOverviewResponse(
                user.getMyinvoisEnvironment(),
                credentialRepository.findByUserIdAndEnvironment(userId, MyInvoisEnvironment.SANDBOX).map(this::toResponse).orElse(null),
                credentialRepository.findByUserIdAndEnvironment(userId, MyInvoisEnvironment.PRODUCTION).map(this::toResponse).orElse(null));
    }

    /** Switches where submissions go. Only allowed once that environment has credentials. */
    @Transactional
    public CredentialsOverviewResponse setActive(Long userId, MyInvoisEnvironment environment) {
        if (credentialRepository.findByUserIdAndEnvironment(userId, environment).isEmpty()) {
            throw new IllegalArgumentException("Add " + label(environment) + " credentials before switching to it");
        }
        User user = getUser(userId);
        user.setMyinvoisEnvironment(environment);
        userRepository.save(user);
        return overview(userId);
    }

    public MyInvoisEnvironment activeEnvironment(Long userId) {
        return getUser(userId).getMyinvoisEnvironment();
    }

    /** Decrypted secret — only for internal use by {@link MyInvoisAuthService}, never exposed via API. */
    public MyInvoisCredential getDecryptedForUse(Long userId, MyInvoisEnvironment environment) {
        return credentialRepository.findByUserIdAndEnvironment(userId, environment)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No MyInvois " + label(environment) + " credentials configured — add them in MyInvois Settings"));
    }

    public String decryptSecret(MyInvoisCredential credential) {
        return cryptoService.decrypt(credential.getClientSecretEncrypted());
    }

    /**
     * Reveals the decrypted client secret (+ id) for one environment after re-verifying the caller's
     * account password. The secret is never returned by the normal GET; this is a deliberate,
     * password-gated reveal.
     */
    public RevealedCredentialResponse reveal(Long userId, String password, MyInvoisEnvironment environment) {
        User user = getUser(userId);
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect password");
        }
        MyInvoisEnvironment env = environment != null ? environment : user.getMyinvoisEnvironment();
        MyInvoisCredential credential = getDecryptedForUse(userId, env);
        return new RevealedCredentialResponse(credential.getClientId(),
                cryptoService.decrypt(credential.getClientSecretEncrypted()), credential.getEnvironment());
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private static String label(MyInvoisEnvironment environment) {
        return environment == MyInvoisEnvironment.PRODUCTION ? "Production" : "Sandbox";
    }

    private CredentialResponse toResponse(MyInvoisCredential credential) {
        return new CredentialResponse(credential.getId(), credential.getClientId(),
                credential.getEnvironment(), true);
    }
}
