package com.zhixingtongyi.backend.service;

import com.zhixingtongyi.backend.model.dto.LoginRequest;
import com.zhixingtongyi.backend.model.dto.RegisterRequest;
import com.zhixingtongyi.backend.model.dto.WechatLoginRequest;

public interface AuthService {
    /*
    void register(RegisterRequest registerRequest);

    String login(LoginRequest loginRequest);

     */

    String wechatLogin(WechatLoginRequest wechatLoginRequest);

    void logout();
}
