package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.StudentProfile;

public interface StudentService extends IService<StudentProfile> {
    void saveDraft(Long userId, StudentProfileRequest request);

    void submitProfile(Long userId);

    StudentProfileVO getProfile(Long userId);
}

