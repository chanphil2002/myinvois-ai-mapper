package com.mytax.mapper.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportMessageRequest(
        @NotBlank @Size(max = 255) String subject,
        @NotBlank @Size(max = 5000) String body
) {
}
