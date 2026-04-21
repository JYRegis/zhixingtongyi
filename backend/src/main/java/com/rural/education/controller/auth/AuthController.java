package com.rural.education.controller.auth;

import com.rural.education.dto.response.common.ApiResponse;
import com.rural.education.service.AuthService;
import jakarta.servlet.http.HttpServletRequest; // 引入 HttpServletRequest
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1.3 退出登录
    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        // 直接从全局请求体里拿 Token，不让 Swagger 强制弹输入框
        String token = request.getHeader("Authorization");
        authService.logout(token);
        return ApiResponse.success();
    }

    // 1.4 刷新Token
    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(HttpServletRequest request) {
        // 直接从全局请求体里拿 Token，不让 Swagger 强制弹输入框
        String token = request.getHeader("Authorization");

        String newToken = authService.refreshToken(token);
        Map<String, String> data = new HashMap<>();
        data.put("token", newToken);
        return ApiResponse.success(data);
    }
}