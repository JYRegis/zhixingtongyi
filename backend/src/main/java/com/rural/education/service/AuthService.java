package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.auth.LoginRequest;
import com.rural.education.dto.request.auth.UpdateProfileRequest;
import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;
import com.rural.education.model.entity.User;

public interface AuthService extends IService<User> {
    LoginResponse wxLogin(WxLoginRequest request);

    // 新增：模拟登录接口，用于 Swagger 测试环境
    LoginResponse mockLogin(WxLoginRequest request);
    LoginResponse phoneLogin(LoginRequest request);

    void roleApply(Long userId, String targetRole);
    void logout(String token);
    String refreshToken(String token);
    void updateProfile(Long userId, UpdateProfileRequest request);
}