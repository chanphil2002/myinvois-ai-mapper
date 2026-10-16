package com.mytax.mapper.notification.dto;

import java.util.List;

public record NotificationListResponse(long unreadCount, List<NotificationResponse> items) {
}
