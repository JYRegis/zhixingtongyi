package com.rural.education.security;

import com.rural.education.exception.AuthException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long getCurrentUserId() {
        return getCurrentAuth()
                .map(JwtAuthenticationToken::getUserId)
                .orElseThrow(() -> new AuthException("未登录"));
    }

    public static Integer getCurrentRole() {
        return getCurrentAuth()
                .map(JwtAuthenticationToken::getRole)
                .orElse(null);
    }

    public static boolean isAuthenticated() {
        return getCurrentAuth().isPresent();
    }

    private static Optional<JwtAuthenticationToken> getCurrentAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth && jwtAuth.isAuthenticated()) {
            return Optional.of(jwtAuth);
        }
        return Optional.empty();
    }
}
