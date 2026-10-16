package com.mytax.mapper.stats;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/api/stats/documents")
    public ApiResponse<DocumentStatsResponse> documents() {
        return ApiResponse.ok(statsService.documentStats(CurrentUser.id()));
    }
}
