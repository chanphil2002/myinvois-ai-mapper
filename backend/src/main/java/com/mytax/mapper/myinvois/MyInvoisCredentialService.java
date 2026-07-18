package com.mytax.mapper.myinvois;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.myinvois.dto.CredentialRequest;
import com.mytax.mapper.myinvois.dto.CredentialResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MyInvoisCredentialService {

    private final MyInvoisCredentialRepository credentialRepository;
    private final CredentialCryptoService cryptoService;

    public MyInvoisCredentialService(MyInvoisCredentialRepository credentialRepository,
                                      CredentialCryptoService cryptoService) {
        this.credentialRepository = credentialRepository;
        this.cryptoService = cryptoService;
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

    private CredentialResponse toResponse(MyInvoisCredential credential) {
        return new CredentialResponse(credential.getId(), credential.getClientId(),
                credential.getEnvironment(), true);
    }
}
