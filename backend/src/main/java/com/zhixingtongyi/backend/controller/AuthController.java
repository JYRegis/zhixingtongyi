package com.zhixingtongyi.backend.controller;

import com.zhixingtongyi.backend.common.result.Result;
import com.zhixingtongyi.backend.model.dto.LoginRequest;
import com.zhixingtongyi.backend.model.dto.RegisterRequest;
import com.zhixingtongyi.backend.model.dto.WechatLoginRequest;
import com.zhixingtongyi.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Slf4j
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /*
    @PostMapping("/auth/register")
    public Result<Void> register(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        return Result.success();
    }

    @PostMapping("/auth/login")
    public Result<String> login(@Valid @RequestBody LoginRequest loginRequest) {
        String token = authService.login(loginRequest);
        return Result.success(token);
    }

     */

    @PostMapping("/auth/wechatLogin")
    public Result<String> login(@Valid @RequestBody WechatLoginRequest wechatLoginRequest) {
        String token = authService.wechatLogin(wechatLoginRequest);
        return Result.success(token);
    }

    @PostMapping("/auth/logout")
    public Result<Void> logout() {
        authService.logout();
        return Result.success();
    }
}
