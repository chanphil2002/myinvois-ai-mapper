package com.mytax.mapper.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Grants the ADMIN role to the accounts listed in {@code app.admin-emails} (env ADMIN_EMAILS,
 * comma-separated) at start-up — how the first admin is created. Further admins can be promoted
 * from the admin console.
 */
@Component
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final String adminEmails;

    public AdminBootstrap(UserRepository userRepository, @Value("${app.admin-emails:}") String adminEmails) {
        this.userRepository = userRepository;
        this.adminEmails = adminEmails;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void promoteConfiguredAdmins() {
        Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(e -> !e.isEmpty())
                .forEach(email -> userRepository.findByEmail(email).ifPresent(user -> {
                    if (!user.isAdmin()) {
                        user.setRole("ADMIN");
                        userRepository.save(user);
                        log.info("Granted ADMIN to {}", email);
                    }
                }));
    }
}
