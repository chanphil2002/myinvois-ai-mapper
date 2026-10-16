package com.mytax.mapper.notification;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.notification.dto.NotificationListResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<NotificationListResponse> list(@RequestParam(defaultValue = "30") int limit) {
        return ApiResponse.ok(notificationService.list(CurrentUser.id(), limit));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<Void> read(@PathVariable Long id) {
        notificationService.markRead(CurrentUser.id(), id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/read-all")
    public ApiResponse<Void> readAll() {
        notificationService.markAllRead(CurrentUser.id());
        return ApiResponse.ok(null);
    }
}
