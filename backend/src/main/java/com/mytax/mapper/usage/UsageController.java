package com.mytax.mapper.usage;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.usage.dto.UsageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usage")
public class UsageController {

    private final UsageService usageService;

    public UsageController(UsageService usageService) {
        this.usageService = usageService;
    }

    @GetMapping
    public ApiResponse<UsageResponse> current() {
        return ApiResponse.ok(usageService.getUsage(CurrentUser.id()));
    }
}
