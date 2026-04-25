package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.po.User;

public interface AuthService extends IService<User> {
    LoginResponse wxLogin(WxLoginRequest request);

    // 新增：模拟登录接口，用于 Swagger 测试环境
    LoginResponse mockLogin(WxLoginRequest request);
    LoginResponse phoneLogin(PhoneLoginRequest request);

    void roleApply(Long userId, String targetRole);
    void logout(String token);
    String refreshToken(String token);
}