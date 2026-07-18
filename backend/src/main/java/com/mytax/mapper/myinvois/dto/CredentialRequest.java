package com.mytax.mapper.myinvois.dto;

import com.mytax.mapper.myinvois.MyInvoisEnvironment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CredentialRequest(
        @NotBlank String clientId,
        @NotBlank String clientSecret,
        @NotNull MyInvoisEnvironment environment
) {
}
