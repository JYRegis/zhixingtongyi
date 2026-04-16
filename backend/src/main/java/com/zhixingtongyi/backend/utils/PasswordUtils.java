package com.zhixingtongyi.backend.utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 密码编码器
 */
@Component
public class PasswordUtils {

    private final BCryptPasswordEncoder encoder;

    public PasswordUtils(BCryptPasswordEncoder encoder) {
        this.encoder = encoder;
    }

    /**
     * 使用 BCrypt 自动加盐加密
     */
    public String encode(CharSequence rawPassword) {
        return encoder.encode(rawPassword);
    }

    /**
     * 验证密码
     */
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return encoder.matches(rawPassword, encodedPassword);
    }
}