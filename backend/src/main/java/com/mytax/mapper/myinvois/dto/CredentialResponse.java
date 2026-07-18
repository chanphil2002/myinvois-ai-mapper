package com.mytax.mapper.myinvois.dto;

import com.mytax.mapper.myinvois.MyInvoisEnvironment;

public record CredentialResponse(
        Long id,
        String clientId,
        MyInvoisEnvironment environment,
        boolean configured
) {
}
