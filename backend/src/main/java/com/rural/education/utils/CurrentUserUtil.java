package com.rural.education.utils;

import com.rural.education.exception.AuthException;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserUtil {
    public Long getCurrentUserId() {
        Long userIdFromThreadLocal = CurrentUserContext.getUserId();
        if (userIdFromThreadLocal != null) {
            return userIdFromThreadLocal;
        }
        throw new AuthException("未登录");
    }
}
