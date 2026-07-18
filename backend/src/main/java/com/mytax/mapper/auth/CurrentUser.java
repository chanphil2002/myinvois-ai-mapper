package com.mytax.mapper.auth;

import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static User get() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof AppUserPrincipal appUserPrincipal) {
            return appUserPrincipal.getUser();
        }
        throw new IllegalStateException("No authenticated user in security context");
    }

    public static Long id() {
        return get().getId();
    }
}
