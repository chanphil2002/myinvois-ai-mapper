package com.mytax.mapper.auth.dto;

public record AuthResponse(
        String token,
        Long userId,
        String email,
        String companyName,
        /** OWNER or ADMIN — admins get the admin console. */
        String role
) {
}
