package com.mytax.mapper.document.dto;

import com.mytax.mapper.document.DocumentStatus;

import java.time.Instant;

public record DocumentResponse(
        Long id,
        String originalFilename,
        String fileType,
        DocumentStatus status,
        Instant uploadedAt
) {
}
