package com.rural.education.service.impl;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaJscode2SessionResult;
import cn.binarywang.wx.miniapp.bean.WxMaPhoneNumberInfo;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.pojo.po.StudentProfile;
import com.rural.education.pojo.po.TeacherProfile;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.po.User;
import com.rural.education.exception.BizException;
import com.rural.education.mapper.StudentProfileMapper;
import com.rural.education.mapper.TeacherProfileMapper;
import com.rural.education.mapper.UserMapper;
import com.rural.education.service.AuthService;
import com.rural.education.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl extends ServiceImpl<UserMapper, User> implements AuthService {

    private final WxMaService wxMaService;
    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    private final TeacherProfileMapper teacherProfileMapper;
    private final StudentProfileMapper studentProfileMapper;

    @Override
    public LoginResponse wxLogin(WxLoginRequest request) {
        try {
            WxMaJscode2SessionResult session = wxMaService.getUserService().getSessionInfo(request.getCode());
            String openId = session.getOpenid();
            String phone = resolvePhone(request, session.getSessionKey());

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
                user.setPhone(phone);
                userMapper.insert(user);
            } else {
                boolean needUpdate = false;
                if (request.getUserInfo() != null && request.getUserInfo().getNickName() != null && !request.getUserInfo().getNickName().isBlank()) {
                    user.setUsername(request.getUserInfo().getNickName());
                    needUpdate = true;
                }
                if (request.getUserInfo() != null && request.getUserInfo().getAvatarUrl() != null && !request.getUserInfo().getAvatarUrl().isBlank()) {
                    user.setAvatar(request.getUserInfo().getAvatarUrl());
                    needUpdate = true;
                }
                if (phone != null && !phone.isBlank()) {
                    user.setPhone(phone);
                    needUpdate = true;
                }
                if (needUpdate) {
                    userMapper.updateById(user);
                }
            }

            String token = jwtUtil.generateToken(user.getId(), user.getRole());

            return buildLoginResponse(token, user, isNewUser);

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
        String phone = resolvePhone(request, null);

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
            user.setPhone(phone);
            userMapper.insert(user);
        } else if (phone != null && !phone.isBlank()) {
            user.setPhone(phone);
            userMapper.updateById(user);
        }

        // 4. 签发 Token
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        // 5. 返回跟微信真实登录一模一样的响应体
        return buildLoginResponse(token, user, isNewUser);
    }
    // =====================================

    @Override
    public LoginResponse phoneLogin(PhoneLoginRequest request) {
        String phone = request.getPhone();
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
        boolean isNewUser = (user == null);
        log.info("phone-login processing, phone={}, isNewUser={}", phone, isNewUser);
        if (isNewUser) {
            user = new User();
            user.setPhone(phone);
            String nick = request.getNickName();
            if (nick == null || nick.isBlank()) {
                nick = "用户" + phone.substring(phone.length() - 4);
            }
            user.setUsername(nick);
            user.setPassword(UUID.randomUUID().toString());
            user.setAvatar(request.getAvatarUrl() == null ? "" : request.getAvatarUrl());
            user.setRole(3);
            user.setStatus(1);
            userMapper.insert(user);
        } else {
            boolean needUpdate = false;
            if (request.getNickName() != null && !request.getNickName().isBlank()) {
                user.setUsername(request.getNickName());
                needUpdate = true;
            }
            if (request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()) {
                user.setAvatar(request.getAvatarUrl());
                needUpdate = true;
            }
            if (needUpdate) {
                userMapper.updateById(user);
            }
        }
        String token = jwtUtil.generateToken(user.getId(), user.getRole());
        log.info("phone-login success, userId={}, phone={}", user.getId(), user.getPhone());
        return buildLoginResponse(token, user, isNewUser);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void roleApply(Long userId, String targetRole) {
        int role;
        if ("STUDENT".equalsIgnoreCase(targetRole)) {
            role = 3;
        } else if ("TEACHER".equalsIgnoreCase(targetRole)) {
            role = 2;
        } else {
            throw new BizException("targetRole 仅支持 STUDENT 或 TEACHER");
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException("用户不存在");
        }
        user.setRole(role);
        userMapper.updateById(user);
        redisTemplate.opsForValue().set("role:apply:" + userId, targetRole.toUpperCase(), 30, TimeUnit.DAYS);
    }

    @Override
    public void logout(String token) {
        String actualToken = extractBearerToken(token);
        try {
            redisTemplate.opsForValue().set("jwt:blacklist:" + actualToken, "1", 24, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Token 注销写入黑名单失败: {}", e.getMessage());
        }
    }

    @Override
    public String refreshToken(String token) {
        String actualToken = extractBearerToken(token);
        Long userId = jwtUtil.getUserIdFromToken(actualToken);
        Integer role = jwtUtil.getRoleFromToken(actualToken);
        return jwtUtil.generateToken(userId, role);
    }

    private LoginResponse buildLoginResponse(String token, User user, boolean isNewUser) {
        boolean hasProfile = hasProfile(user.getId(), user.getRole());
        String roleApply = redisTemplate.opsForValue().get("role:apply:" + user.getId());
        return LoginResponse.builder()
                .token(token)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .role(user.getRole())
                        .avatar(user.getAvatar())
                        .phone(user.getPhone())
                        .hasProfile(isNewUser ? false : hasProfile)
                        .roleApplied(roleApply != null)
                        .build())
                .build();
    }

    private boolean hasProfile(Long userId, Integer role) {
        try {
            if (role != null && role == 2) {
                return teacherProfileMapper.selectCount(
                        new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId)
                ) > 0;
            }
            if (role != null && role == 3) {
                return studentProfileMapper.selectCount(
                        new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
                ) > 0;
            }
        } catch (Exception e) {
            log.warn("资料存在性检查失败: {}", e.getMessage());
        }
        return false;
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new BizException("Authorization 不能为空");
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new BizException("Authorization 必须是 Bearer token");
        }
        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty()) {
            throw new BizException("Bearer token 不能为空");
        }
        return token;
    }

    @SuppressWarnings("deprecation")
    private String resolvePhone(WxLoginRequest request, String sessionKey) {
        if (request == null) {
            return null;
        }
        try {
            if (request.getPhoneCode() != null && !request.getPhoneCode().isBlank()) {
                WxMaPhoneNumberInfo info = wxMaService.getUserService().getNewPhoneNoInfo(request.getPhoneCode());
                return info == null ? null : info.getPhoneNumber();
            }
        } catch (Exception e) {
            log.warn("新手机号解密失败: {}", e.getMessage());
        }
        try {
            if (sessionKey != null && !sessionKey.isBlank()
                    && request.getEncryptedData() != null && !request.getEncryptedData().isBlank()
                    && request.getIv() != null && !request.getIv().isBlank()) {
                WxMaPhoneNumberInfo info = wxMaService.getUserService()
                        .getPhoneNoInfo(sessionKey, request.getEncryptedData(), request.getIv());
                return info == null ? null : info.getPhoneNumber();
            }
        } catch (Exception e) {
            log.warn("旧手机号解密失败: {}", e.getMessage());
        }
        return null;
    }
}