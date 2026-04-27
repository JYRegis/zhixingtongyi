package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.student.StudentProfileRequest;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.vo.StudentVO;

public interface StudentService extends IService<StudentProfile> {
    void saveDraft(Long userId, StudentProfileRequest request);

    void submitProfile(Long userId);

    StudentVO getProfile(Long userId);
}

