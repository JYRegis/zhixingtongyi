package com.rural.education.security;

import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("auth")
@RequiredArgsConstructor
public class AuthChecker {

    private final UserAccessService userAccessService;

    /**
     * 用于 @PreAuthorize SpEL 表达式：
     * {@code @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")}
     */
    public boolean hasL2Permission(String permission) {
        return userAccessService.hasL2Permission(permission);
    }
}
