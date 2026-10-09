package com.mytax.mapper.support;

import com.mytax.mapper.auth.CurrentUser;
import com.mytax.mapper.auth.User;
import com.mytax.mapper.common.ApiResponse;
import com.mytax.mapper.support.dto.SupportMessageRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private static final Logger log = LoggerFactory.getLogger(SupportController.class);
    /** Where support messages are directed. */
    public static final String SUPPORT_EMAIL = "chanphil2002@gmail.com";

    private final SupportMessageRepository repository;

    public SupportController(SupportMessageRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public ApiResponse<Boolean> submit(@Valid @RequestBody SupportMessageRequest request) {
        User user = CurrentUser.get();
        repository.save(new SupportMessage(user.getId(), user.getEmail(), request.subject(), request.body()));
        // Persisted for the record. Email delivery to SUPPORT_EMAIL requires SMTP to be configured;
        // until then the frontend also offers a direct mailto: link as a reliable fallback.
        log.info("Support message from user {} ({}): {}", user.getId(), user.getEmail(), request.subject());
        return ApiResponse.ok(Boolean.TRUE);
    }
}
