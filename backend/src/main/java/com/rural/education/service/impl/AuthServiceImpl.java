package com.rural.education.service.impl;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaJscode2SessionResult;
import cn.binarywang.wx.miniapp.bean.WxMaPhoneNumberInfo;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.dto.request.auth.LoginRequest;
import com.rural.education.dto.request.auth.UpdateProfileRequest;
import com.rural.education.dto.request.auth.WxLoginRequest;
import com.rural.education.dto.response.auth.LoginResponse;
import com.rural.education.model.entity.AdminProfile;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.entity.User;
import com.rural.education.model.mapper.AdminProfileMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.service.AuthService;
import com.rural.education.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
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
    private final AdminProfileMapper adminProfileMapper;
    private final ObjectMapper objectMapper;

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
                String preferredName = request.getUserInfo() != null ? request.getUserInfo().getNickName() : null;
                user.setUsername(normalizeUsername(preferredName));
                user.setPassword(UUID.randomUUID().toString());
                user.setAvatar(request.getUserInfo() != null ? request.getUserInfo().getAvatarUrl() : "");
                // role 留空：等用户在 role-select 页选择身份后通过 /auth/role-apply 设置
                user.setStatus(UserStatus.ENABLED.getCode());
                user.setPhone(phone);
                userMapper.insert(user);
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
            // role 留空：等用户在 role-select 页选择身份后通过 /auth/role-apply 设置
            user.setStatus(UserStatus.ENABLED.getCode());
            user.setPhone(phone);
            userMapper.insert(user);
        }

        // 4. 签发 Token
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        // 5. 返回跟微信真实登录一模一样的响应体
        return buildLoginResponse(token, user, isNewUser);
    }
    // =====================================

    @Override
    public LoginResponse phoneLogin(LoginRequest request) {
        String phone = request.getPhone();
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
        boolean isNewUser = (user == null);
        log.info("phone-login processing, phone={}, isNewUser={}", maskPhone(phone), isNewUser);
        if (isNewUser) {
            user = new User();
            user.setPhone(phone);
            String nick = request.getNickName();
            if (nick == null || nick.isBlank()) {
                nick = "用户" + phone.substring(phone.length() - 4);
            }
            user.setUsername(normalizeUsername(nick));
            user.setPassword(UUID.randomUUID().toString());
            user.setAvatar(request.getAvatarUrl() == null ? "" : request.getAvatarUrl());
            // role 留空：等用户在 role-select 页选择身份后通过 /auth/role-apply 设置
            user.setStatus(UserStatus.ENABLED.getCode());
            userMapper.insert(user);
        }
        String token = jwtUtil.generateToken(user.getId(), user.getRole());
        log.info("phone-login success, userId={}, phone={}", user.getId(), maskPhone(user.getPhone()));
        return buildLoginResponse(token, user, isNewUser);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void roleApply(Long userId, String targetRole) {
        int role;
        if ("STUDENT".equalsIgnoreCase(targetRole)) {
            role = UserRole.STUDENT.getCode();
        } else if ("TEACHER".equalsIgnoreCase(targetRole)) {
            role = UserRole.TEACHER.getCode();
        } else {
            throw new BusinessException("targetRole 仅支持 STUDENT 或 TEACHER");
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        // 只允许从 NULL（未选择身份）设置为 STUDENT/TEACHER
        // 已有角色的用户不允许通过 role-apply 修改身份
        if (user.getRole() != null) {
            if (Integer.valueOf(role).equals(user.getRole())) {
                throw new BusinessException("您已经是该角色，无需重复申请");
            }
            throw new BusinessException("身份已确定，无法修改");
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
        try {
            redisTemplate.opsForValue().set("jwt:blacklist:" + actualToken, "1", 24, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("旧Token黑名单写入失败: {}", e.getMessage());
        }
        return jwtUtil.generateToken(userId, role);
    }

    @Override
    public void updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        boolean needUpdate = false;
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(normalizeUsername(request.getUsername()));
            needUpdate = true;
        }
        if (request.getAvatar() != null && !request.getAvatar().isBlank()) {
            user.setAvatar(request.getAvatar());
            needUpdate = true;
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String newPhone = request.getPhone().trim();
            if (!newPhone.matches("^1\\d{10}$")) {
                throw new BusinessException("手机号格式错误");
            }
            Long collide = userMapper.selectCount(
                    new LambdaQueryWrapper<User>()
                            .eq(User::getPhone, newPhone)
                            .ne(User::getId, userId)
            );
            if (collide > 0) {
                throw new BusinessException("该手机号已被其他账号使用");
            }
            user.setPhone(newPhone);
            needUpdate = true;
        }
        if (needUpdate) {
            userMapper.updateById(user);
        }
    }

    private LoginResponse buildLoginResponse(String token, User user, boolean isNewUser) {
        boolean hasProfile = hasProfile(user.getId(), user.getRole());
        String roleApply = redisTemplate.opsForValue().get("role:apply:" + user.getId());
        Integer auditStatus = resolveAuditStatus(user.getId(), user.getRole());
        List<String> permissions = resolvePermissions(user.getId(), user.getRole());
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
                        .auditStatus(auditStatus)
                        .permissions(permissions)
                        .build())
                .build();
    }

    private Integer resolveAuditStatus(Long userId, Integer role) {
        if (role == null) {
            return null;
        }
        if (Integer.valueOf(UserRole.STUDENT.getCode()).equals(role)) {
            StudentProfile profile = studentProfileMapper.selectOne(
                    new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
            );
            return profile == null ? null : profile.getAuditStatus();
        }
        if (Integer.valueOf(UserRole.TEACHER.getCode()).equals(role)) {
            TeacherProfile profile = teacherProfileMapper.selectOne(
                    new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId)
            );
            return profile == null ? null : profile.getCertificationStatus();
        }
        return null;
    }

    private List<String> resolvePermissions(Long userId, Integer role) {
        if (role == null || !Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(role)) {
            return Collections.emptyList();
        }
        AdminProfile admin = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
        );
        if (admin == null || admin.getPermissions() == null || admin.getPermissions().isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(admin.getPermissions(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String normalizeUsername(String preferred) {
        if (preferred == null || preferred.isBlank()) {
            return "微信用户";
        }
        return preferred.trim();
    }

    private boolean hasProfile(Long userId, Integer role) {
        try {
            if (Integer.valueOf(UserRole.TEACHER.getCode()).equals(role)) {
                return teacherProfileMapper.selectCount(
                        new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId)
                ) > 0;
            }
            if (Integer.valueOf(UserRole.STUDENT.getCode()).equals(role)) {
                return studentProfileMapper.selectCount(
                        new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
                ) > 0;
            }
        } catch (Exception e) {
            log.warn("资料存在性检查失败, userId={}", userId, e);
        }
        return false;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new BusinessException("Authorization 不能为空");
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new BusinessException("Authorization 必须是 Bearer token");
        }
        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty()) {
            throw new BusinessException("Bearer token 不能为空");
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