package com.rural.education.utils;

import com.rural.education.exception.BizException;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserUtil {
    public Long getCurrentUserId() {
        Long userIdFromThreadLocal = CurrentUserContext.getUserId();
        if (userIdFromThreadLocal != null) {
            return userIdFromThreadLocal;
        }
        throw new BizException("未登录");
    }
}
