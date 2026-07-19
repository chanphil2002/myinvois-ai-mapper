package com.mytax.mapper.profile.dto;

public record BusinessProfileResponse(
        Long id,
        String registrationName,
        String tin,
        String idType,
        String idValue,
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
