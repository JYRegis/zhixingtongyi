package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.AdminProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.model.entity.AdminProfile;
import com.rural.education.model.entity.User;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserAccessServiceImpl extends ServiceImpl<UserMapper, User> implements UserAccessService {
    private final UserMapper userMapper;
    private final AdminProfileMapper adminProfileMapper;

    @Override
    public User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    @Override
    public void requireRole(Long userId, int role) {
        User user = requireUser(userId);
        if (user.getRole() == null || user.getRole() != role) {
            throw new BusinessException("无权限操作");
        }
    }

    @Override
    public void requireAnyRole(Long userId, int... roles) {
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
    public void requireL2WithPermission(Long userId, String permission) {
        requireRole(userId, UserRole.L2_ADMIN.getCode());
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
        );
        if (adminProfile == null) {
            throw new BusinessException("管理员资料不存在");
        }
        String permissions = adminProfile.getPermissions();
        if (permissions == null || !permissions.contains(permission)) {
            throw new BusinessException("缺少权限: " + permission);
        }
    }
}
