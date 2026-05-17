package com.rural.education.controller.auth;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.auth.RoleApplyRequest;
import com.rural.education.dto.request.auth.UpdateProfileRequest;
import com.rural.education.service.AuthService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUserUtil currentUserUtil;

    @PostMapping("/role-apply")
    public ApiResponse<Void> roleApply(@Valid @RequestBody RoleApplyRequest request) {
        authService.roleApply(currentUserUtil.getCurrentUserId(), request.getTargetRole());
        return ApiResponse.success();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        authService.logout(token);
        return ApiResponse.success();
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        String newToken = authService.refreshToken(token);
        Map<String, String> data = new HashMap<>();
        data.put("token", newToken);
        return ApiResponse.success(data);
    }

    @PutMapping("/me")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        authService.updateProfile(currentUserUtil.getCurrentUserId(), request);
        return ApiResponse.success();
    }
}

