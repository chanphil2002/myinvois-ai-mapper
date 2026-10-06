package com.mytax.mapper.myinvois;

import com.mytax.mapper.auth.User;
import com.mytax.mapper.auth.UserRepository;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.myinvois.dto.CredentialRequest;
import com.mytax.mapper.myinvois.dto.CredentialResponse;
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

    @Transactional
    public CredentialResponse save(Long userId, CredentialRequest request) {
        MyInvoisCredential credential = credentialRepository.findByUserId(userId)
                .orElseGet(() -> MyInvoisCredential.builder().userId(userId).build());

        credential.setClientId(request.clientId());
        credential.setClientSecretEncrypted(cryptoService.encrypt(request.clientSecret()));
        credential.setEnvironment(request.environment());

        credential = credentialRepository.save(credential);
        return toResponse(credential);
    }

    public CredentialResponse get(Long userId) {
        return credentialRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("No MyInvois credentials configured for this user"));
    }

    /** Decrypted secret — only for internal use by {@link MyInvoisAuthService}, never exposed via API. */
    public MyInvoisCredential getDecryptedForUse(Long userId) {
        return credentialRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No MyInvois credentials configured for this user"));
    }

    public String decryptSecret(MyInvoisCredential credential) {
        return cryptoService.decrypt(credential.getClientSecretEncrypted());
    }

    /**
     * Reveals the decrypted client secret (+ id) after re-verifying the caller's account password.
     * The secret is never returned by the normal GET; this is a deliberate, password-gated reveal.
     */
    public RevealedCredentialResponse reveal(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect password");
        }
        MyInvoisCredential credential = credentialRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No MyInvois credentials configured for this user"));
        return new RevealedCredentialResponse(credential.getClientId(),
                cryptoService.decrypt(credential.getClientSecretEncrypted()), credential.getEnvironment());
    }

    private CredentialResponse toResponse(MyInvoisCredential credential) {
        return new CredentialResponse(credential.getId(), credential.getClientId(),
                credential.getEnvironment(), true);
    }
}
