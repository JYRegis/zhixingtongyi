package com.rural.education.controller.auth;

import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;
import com.rural.education.dto.response.common.ApiResponse;
import com.rural.education.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class WxAuthController {

    private final AuthService authService;

    // 真实的微信登录接口（需前端传来真实 code）
    @PostMapping("/wx-login")
    public ApiResponse<LoginResponse> wxLogin(@RequestBody WxLoginRequest request) {
        return ApiResponse.success(authService.wxLogin(request));
    }

    // ========== 新增：供 Swagger 调用的模拟登录接口 ==========
    @PostMapping("/mock-login")
    public ApiResponse<LoginResponse> mockLogin(@RequestBody WxLoginRequest request) {
        return ApiResponse.success(authService.mockLogin(request));
    }
}