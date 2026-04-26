package com.rural.education.utils;

import com.rural.education.exception.AuthException;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtil {
    public Long getCurrentUserId() {
        Long userId = CurrentUserContext.getUserId();
        if (userId != null) {
            return userId;
        }
        throw new AuthException("未登录");
    }
}

