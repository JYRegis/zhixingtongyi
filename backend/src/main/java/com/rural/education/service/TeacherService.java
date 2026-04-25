package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.TeacherProfile;

public interface TeacherService extends IService<TeacherProfile> {
    void createProfile(Long userId, TeacherProfileRequest request);

    void updateProfile(Long userId, TeacherProfileRequest request);

    TeacherProfileVO getProfile(Long userId);

    void updateContinuousMatch(Long userId, Boolean enabled);
}

