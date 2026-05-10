package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.enums.AuditStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.dto.request.student.StudentProfileRequest;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.vo.StudentVO;
import com.rural.education.service.StudentService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentServiceImpl extends ServiceImpl<StudentProfileMapper, StudentProfile> implements StudentService {
    private final UserAccessService userAccessService;
    private final StudentProfileMapper studentProfileMapper;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveDraft(Long userId, StudentProfileRequest request) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        StudentProfile existed = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (existed != null) {
            studentProfileMapper.update(
                    null,
                    new LambdaUpdateWrapper<StudentProfile>()
                            .eq(StudentProfile::getUserId, userId)
                            .set(StudentProfile::getRealName, request.getRealName())
                            .set(StudentProfile::getSchoolId, request.getSchoolId())
                            .set(StudentProfile::getGrade, request.getGrade())
                            .set(StudentProfile::getSubjectsNeeded, toJson(request.getSubjectsNeeded()))
                            .set(StudentProfile::getFreeTime, toJson(request.getFreeTime()))
                            .set(StudentProfile::getPersonalityDesc, request.getPersonalityDesc())
                            .set(StudentProfile::getProfileStatus, 0)
            );
        } else {
            if (request.getBindAdminId() != null) {
                userAccessService.requireRole(request.getBindAdminId(), UserRole.L2_ADMIN.getCode());
            }
            StudentProfile profile = new StudentProfile();
            profile.setUserId(userId);
            profile.setRealName(request.getRealName());
            profile.setSchoolId(request.getSchoolId());
            profile.setGrade(request.getGrade());
            profile.setSubjectsNeeded(toJson(request.getSubjectsNeeded()));
            profile.setFreeTime(toJson(request.getFreeTime()));
            profile.setPersonalityDesc(request.getPersonalityDesc());
            profile.setProfileStatus(0);
            profile.setBindAdminId(request.getBindAdminId());
            profile.setAuditStatus(AuditStatus.PENDING.getCode());
            studentProfileMapper.insert(profile);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProfile(Long userId, StudentProfileRequest request) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        StudentProfile existed = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (existed == null) {
            throw new BusinessException("请先保存学生资料");
        }
        studentProfileMapper.update(
                null,
                new LambdaUpdateWrapper<StudentProfile>()
                        .eq(StudentProfile::getUserId, userId)
                        .set(StudentProfile::getRealName, request.getRealName())
                        .set(StudentProfile::getSchoolId, request.getSchoolId())
                        .set(StudentProfile::getGrade, request.getGrade())
                        .set(StudentProfile::getSubjectsNeeded, toJson(request.getSubjectsNeeded()))
                        .set(StudentProfile::getFreeTime, toJson(request.getFreeTime()))
                        .set(StudentProfile::getPersonalityDesc, request.getPersonalityDesc())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitProfile(Long userId) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        StudentProfile profile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (profile == null) {
            throw new BusinessException("请先保存学生资料");
        }
        if (isBlank(profile.getGrade()) || isBlank(profile.getSubjectsNeeded()) || isBlank(profile.getFreeTime())) {
            throw new BusinessException("提交前需补全 grade、subjectsNeeded、freeTime");
        }
        studentProfileMapper.update(
                null,
                new LambdaUpdateWrapper<StudentProfile>()
                        .eq(StudentProfile::getUserId, userId)
                        .set(StudentProfile::getProfileStatus, 1)
        );
    }

    @Override
    public StudentVO getProfile(Long userId) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        StudentProfile row = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (row == null) {
            return null;
        }
        StudentVO vo = objectMapper.convertValue(row, StudentVO.class);
        vo.setSubjectsNeeded(parseJsonList(row.getSubjectsNeeded()));
        vo.setFreeTime(parseJsonMapList(row.getFreeTime()));
        return vo;
    }

    private boolean isBlank(Object obj) {
        return obj == null || String.valueOf(obj).isBlank() || "[]".equals(String.valueOf(obj).trim());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new BusinessException("JSON序列化失败");
        }
    }

    private List<Object> parseJsonList(Object value) {
        if (value == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(String.valueOf(value), new TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<java.util.Map<String, Object>> parseJsonMapList(Object value) {
        if (value == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(String.valueOf(value), new TypeReference<List<java.util.Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
