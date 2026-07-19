package com.mytax.mapper.profile.dto;

import jakarta.validation.constraints.NotBlank;

public record BusinessProfileRequest(
        @NotBlank String registrationName,
        @NotBlank String tin,
        @NotBlank String idType,
        @NotBlank String idValue,
        String sstRegistration,
        String ttxRegistration,
        String msicCode,
        String msicDescription,
        String addressLine1,
        String addressLine2,
        String city,
        String postalZone,
        String stateCode,
        String countryCode,
        String phone,
        String email
) {
}
