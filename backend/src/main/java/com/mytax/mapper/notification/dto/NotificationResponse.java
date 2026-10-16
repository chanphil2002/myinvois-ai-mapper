package com.mytax.mapper.notification.dto;

import com.mytax.mapper.notification.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String body,
        String link,
        boolean read,
        Instant createdAt
) {
}
