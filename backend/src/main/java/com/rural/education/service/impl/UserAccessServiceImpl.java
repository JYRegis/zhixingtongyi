package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.AdminProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.model.entity.AdminProfile;
import com.rural.education.model.entity.User;
import com.rural.education.service.UserAccessService;
import com.rural.education.security.JwtAuthenticationToken;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAccessServiceImpl extends ServiceImpl<UserMapper, User> implements UserAccessService {
    private final UserMapper userMapper;
    private final AdminProfileMapper adminProfileMapper;
    private final ObjectMapper objectMapper;

    @Override
    public User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    @Override
    public Integer getCurrentRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            return jwtAuth.getRole();
        }
        return null;
    }

    @Override
    public void requireRole(int role) {
        Integer currentRole = getCurrentRole();
        if (currentRole == null || currentRole != role) {
            throw new BusinessException("无权限操作");
        }
    }

    @Override
    public void requireAnyRole(int... roles) {
        Integer currentRole = getCurrentRole();
        if (currentRole == null) {
            throw new BusinessException("无权限操作");
        }
        for (int role : roles) {
            if (currentRole == role) {
                return;
            }
        }
        throw new BusinessException("无权限操作");
    }

    @Override
    public void requireRole(Long userId, int role) {
        Integer currentRole = getCurrentRole();
        if (currentRole != null && currentRole == role) {
            return;
        }
        User user = requireUser(userId);
        if (user.getRole() == null || user.getRole() != role) {
            throw new BusinessException("无权限操作");
        }
    }

    @Override
    public void requireAnyRole(Long userId, int... roles) {
        Integer currentRole = getCurrentRole();
        if (currentRole != null) {
            for (int role : roles) {
                if (currentRole == role) {
                    return;
                }
            }
            throw new BusinessException("无权限操作");
        }
        User user = requireUser(userId);
        if (user.getRole() == null) {
            throw new BusinessException("无权限操作");
        }
        for (int role : roles) {
            if (user.getRole() == role) {
                return;
            }
        }
        throw new BusinessException("无权限操作");
    }

    @Override
    public void requireL1Admin(Long userId) {
        requireRole(userId, UserRole.L1_ADMIN.getCode());
    }

    @Override
    public boolean hasL2Permission(String permission) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth) || !jwtAuth.isAuthenticated()) {
            return false;
        }
        if (jwtAuth.isL1Admin()) {
            return true;
        }
        Long userId = jwtAuth.getUserId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }
        if (user.getRole() != null && user.getRole() == UserRole.L1_ADMIN.getCode()) {
            return true;
        }
        if (user.getRole() == null || user.getRole() != UserRole.L2_ADMIN.getCode()) {
            return false;
        }
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId));
        if (adminProfile == null) {
            return false;
        }
        String permissions = adminProfile.getPermissions();
        return permissions != null && hasExactPermission(permissions, permission);
    }

    @Override
    public void requireL2WithPermission(Long userId, String permission) {
        Integer currentRole = getCurrentRole();
        if (currentRole != null && currentRole == UserRole.L1_ADMIN.getCode()) {
            return;
        }
        User user = requireUser(userId);
        if (user.getRole() != null && user.getRole() == UserRole.L1_ADMIN.getCode()) {
            return;
        }
        if (user.getRole() == null || user.getRole() != UserRole.L2_ADMIN.getCode()) {
            throw new BusinessException("无权限操作");
        }
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
        );
        if (adminProfile == null) {
            throw new BusinessException("管理员资料不存在");
        }
        String permissions = adminProfile.getPermissions();
        if (permissions == null || !hasExactPermission(permissions, permission)) {
            throw new BusinessException("缺少权限: " + permission);
        }
    }

    private boolean hasExactPermission(String permissionsJson, String permission) {
        try {
            List<String> list = objectMapper.readValue(permissionsJson, new TypeReference<List<String>>() {});
            return list.contains("*") || list.contains(permission);
        } catch (Exception e) {
            return false;
        }
    }
}
