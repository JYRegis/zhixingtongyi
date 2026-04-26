package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.teacher.TeacherProfileRequest;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.vo.TeacherVO;

public interface TeacherService extends IService<TeacherProfile> {
    void createProfile(Long userId, TeacherProfileRequest request);

    void updateProfile(Long userId, TeacherProfileRequest request);

    TeacherVO getProfile(Long userId);

    void updateContinuousMatch(Long userId, Boolean enabled);
}

