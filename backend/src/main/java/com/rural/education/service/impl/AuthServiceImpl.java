package com.rural.education.service.impl;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaJscode2SessionResult;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;
import com.rural.education.entity.User;
import com.rural.education.mapper.UserMapper;
import com.rural.education.service.AuthService;
import com.rural.education.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final WxMaService wxMaService;
    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    @Override
    public LoginResponse wxLogin(WxLoginRequest request) {
        try {
            WxMaJscode2SessionResult session = wxMaService.getUserService().getSessionInfo(request.getCode());
            String openId = session.getOpenid();

            User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getWechatOpenid, openId));
            boolean isNewUser = (user == null);

            if (isNewUser) {
                user = new User();
                user.setWechatOpenid(openId);
                user.setUsername(request.getUserInfo() != null ? request.getUserInfo().getNickName() : "wx_user_" + UUID.randomUUID().toString().substring(0, 8));
                user.setPassword(UUID.randomUUID().toString());
                user.setAvatar(request.getUserInfo() != null ? request.getUserInfo().getAvatarUrl() : "");
                user.setRole(3); // 默认为普通角色(学员)
                user.setStatus(1);
                userMapper.insert(user);
            }

            String token = jwtUtil.generateToken(user.getId(), user.getRole());

            return LoginResponse.builder()
                    .token(token)
                    .user(LoginResponse.UserInfo.builder()
                            .id(user.getId())
                            .username(user.getUsername())
                            .role(user.getRole())
                            .avatar(user.getAvatar())
                            .hasProfile(!isNewUser)
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("微信登录失败", e);
            throw new RuntimeException("微信登录验证失败");
        }
    }

    // ========== 新增：模拟登录实现 ==========
    @Override
    public LoginResponse mockLogin(WxLoginRequest request) {
        // 1. 绕过微信API，直接使用一个固定的测试 OpenId
        String openId = "mock_openid_for_swagger_test";

        // 2. 查询该测试用户是否存在
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getWechatOpenid, openId));
        boolean isNewUser = (user == null);

        // 3. 不存在则自动注册
        if (isNewUser) {
            user = new User();
            user.setWechatOpenid(openId);
            // 测试用户的昵称也可以从 request 里拿（如果在 swagger 中手动传了）
            String mockName = (request.getUserInfo() != null && request.getUserInfo().getNickName() != null)
                    ? request.getUserInfo().getNickName()
                    : "测试用户_" + UUID.randomUUID().toString().substring(0, 5);

            user.setUsername(mockName);
            user.setPassword(UUID.randomUUID().toString());
            user.setAvatar("https://example.com/default-avatar.png");
            user.setRole(3); // 默认学员角色
            user.setStatus(1);
            userMapper.insert(user);
        }

        // 4. 签发 Token
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        // 5. 返回跟微信真实登录一模一样的响应体
        return LoginResponse.builder()
                .token(token)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .role(user.getRole())
                        .avatar(user.getAvatar())
                        .hasProfile(!isNewUser)
                        .build())
                .build();
    }
    // =====================================

    @Override
    public void logout(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String actualToken = token.substring(7);
            try {
                redisTemplate.opsForValue().set("jwt:blacklist:" + actualToken, "1", 24, TimeUnit.HOURS);
            } catch (Exception e) {
                log.warn("无效的 Token 尝试注销: {}", e.getMessage());
            }
        }
    }

    @Override
    public String refreshToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String actualToken = token.substring(7);
            Long userId = jwtUtil.getUserIdFromToken(actualToken);
            Integer role = jwtUtil.getRoleFromToken(actualToken);

            return jwtUtil.generateToken(userId, role);
        }
        throw new RuntimeException("Token格式错误");
    }
}