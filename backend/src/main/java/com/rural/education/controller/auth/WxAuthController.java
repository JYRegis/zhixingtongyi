package com.rural.education.controller.auth;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.auth.LoginRequest;
import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;
import com.rural.education.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class WxAuthController {

    private final AuthService authService;

    @PostMapping("/wx-login")
    public ApiResponse<LoginResponse> wxLogin(@Valid @RequestBody WxLoginRequest request) {
        return ApiResponse.success(authService.wxLogin(request));
    }

    @PostMapping("/mock-login")
    public ApiResponse<LoginResponse> mockLogin(@Valid @RequestBody WxLoginRequest request) {
        return ApiResponse.success(authService.mockLogin(request));
    }

    @PostMapping("/phone-login")
    public ApiResponse<LoginResponse> phoneLogin(@Valid @RequestBody LoginRequest request) {
        log.info("phone-login request received, phone={}", request.getPhone());
        return ApiResponse.success(authService.phoneLogin(request));
    }
}

