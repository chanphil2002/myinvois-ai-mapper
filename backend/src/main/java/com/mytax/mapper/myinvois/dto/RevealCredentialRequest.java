package com.mytax.mapper.myinvois.dto;

import jakarta.validation.constraints.NotBlank;

/** Account-password re-authentication to reveal the stored MyInvois client secret. */
public record RevealCredentialRequest(
        @NotBlank String password,
        /** Which environment's secret to reveal; defaults to the active one. */
        com.mytax.mapper.myinvois.MyInvoisEnvironment environment
) {
}
