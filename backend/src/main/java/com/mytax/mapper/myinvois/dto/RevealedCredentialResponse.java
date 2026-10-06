package com.mytax.mapper.myinvois.dto;

import com.mytax.mapper.myinvois.MyInvoisEnvironment;

/** Decrypted MyInvois credentials, returned only after a successful account-password re-auth. */
public record RevealedCredentialResponse(
        String clientId,
        String clientSecret,
        MyInvoisEnvironment environment
) {
}
