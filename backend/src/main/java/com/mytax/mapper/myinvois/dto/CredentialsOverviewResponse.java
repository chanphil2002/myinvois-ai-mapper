package com.mytax.mapper.myinvois.dto;

import com.mytax.mapper.myinvois.MyInvoisEnvironment;

/** Both environments' credential status plus which one submissions currently go to. */
public record CredentialsOverviewResponse(
        MyInvoisEnvironment activeEnvironment,
        CredentialResponse sandbox,
        CredentialResponse production
) {
}
