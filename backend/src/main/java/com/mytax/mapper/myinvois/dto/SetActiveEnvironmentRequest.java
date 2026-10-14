package com.mytax.mapper.myinvois.dto;

import com.mytax.mapper.myinvois.MyInvoisEnvironment;
import jakarta.validation.constraints.NotNull;

public record SetActiveEnvironmentRequest(@NotNull MyInvoisEnvironment environment) {
}
