package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.po.User;

public interface UserAccessService extends IService<User> {
    User requireUser(Long userId);

    void requireRole(Long userId, int role);

    void requireAnyRole(Long userId, int... roles);

    void requireL1Admin(Long userId);

    void requireL2WithPermission(Long userId, String permission);
}
