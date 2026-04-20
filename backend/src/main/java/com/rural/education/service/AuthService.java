package com.rural.education.service;

import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;

public interface AuthService {
    LoginResponse wxLogin(WxLoginRequest request);

    // 新增：模拟登录接口，用于 Swagger 测试环境
    LoginResponse mockLogin(WxLoginRequest request);

    void logout(String token);
    String refreshToken(String token);
}