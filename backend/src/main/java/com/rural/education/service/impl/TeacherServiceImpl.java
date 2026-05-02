package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.enums.AuditStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.dto.request.teacher.TeacherProfileRequest;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.vo.TeacherVO;
import com.rural.education.service.TeacherService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeacherServiceImpl extends ServiceImpl<TeacherProfileMapper, TeacherProfile> implements TeacherService {
    private final UserAccessService userAccessService;
    private final TeacherProfileMapper teacherProfileMapper;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void createProfile(Long userId, TeacherProfileRequest request) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        TeacherProfile existed = teacherProfileMapper.selectOne(
                new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId)
        );
        if (existed != null) {
            throw new BusinessException("教师资料已存在，请使用更新接口");
        }
        TeacherProfile profile = new TeacherProfile();
        profile.setUserId(userId);
        profile.setRealName(request.getRealName());
        profile.setSchool(request.getSchool());
        profile.setGrade(request.getGrade());
        profile.setFreeTime(toJson(request.getFreeTime()));
        profile.setSkilledSubjects(toJson(request.getSkilledSubjects()));
        profile.setPersonalSkills(request.getPersonalSkills());
        profile.setPersonalityDesc(request.getPersonalityDesc());
        profile.setCertificationStatus(AuditStatus.PENDING.getCode());
        profile.setContinuousMatch(1);
        teacherProfileMapper.insert(profile);
        evictRecommendationCache();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProfile(Long userId, TeacherProfileRequest request) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        teacherProfileMapper.update(
                null,
                new LambdaUpdateWrapper<TeacherProfile>()
                        .eq(TeacherProfile::getUserId, userId)
                        .set(TeacherProfile::getRealName, request.getRealName())
                        .set(TeacherProfile::getSchool, request.getSchool())
                        .set(TeacherProfile::getGrade, request.getGrade())
                        .set(TeacherProfile::getFreeTime, toJson(request.getFreeTime()))
                        .set(TeacherProfile::getSkilledSubjects, toJson(request.getSkilledSubjects()))
                        .set(TeacherProfile::getPersonalSkills, request.getPersonalSkills())
                        .set(TeacherProfile::getPersonalityDesc, request.getPersonalityDesc())
                        .set(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode())
        );
        evictRecommendationCache();
    }

    @Override
    public TeacherVO getProfile(Long userId) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        TeacherProfile row = teacherProfileMapper.selectOne(
                new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId)
        );
        if (row == null) {
            return null;
        }
        TeacherVO vo = objectMapper.convertValue(row, TeacherVO.class);
        vo.setFreeTime(parseJsonMapList(row.getFreeTime()));
        vo.setSkilledSubjects(parseJsonList(row.getSkilledSubjects()));
        return vo;
    }

    @Override
    public void updateContinuousMatch(Long userId, Boolean enabled) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        teacherProfileMapper.update(
                null,
                new LambdaUpdateWrapper<TeacherProfile>()
                        .eq(TeacherProfile::getUserId, userId)
                        .set(TeacherProfile::getContinuousMatch, Boolean.TRUE.equals(enabled) ? 1 : 0)
        );
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new BusinessException("JSON序列化失败");
        }
    }

    private List<Object> parseJsonList(String value) {
        if (value == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(String.valueOf(value), new TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<java.util.Map<String, Object>> parseJsonMapList(String value) {
        if (value == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(String.valueOf(value), new TypeReference<List<java.util.Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private void evictRecommendationCache() {
        try {
            java.util.Set<String> keys = redisTemplate.keys("match:recommendations:student:*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception ignore) {
            // ignore cache eviction failure
        }
    }
}

