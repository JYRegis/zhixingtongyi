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
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
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
        profile.setSchoolId(request.getSchoolId());
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
                        .set(TeacherProfile::getSchoolId, request.getSchoolId())
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
        TeacherVO vo = new TeacherVO();
        vo.setUserId(row.getUserId());
        vo.setRealName(row.getRealName());
        vo.setSchoolId(row.getSchoolId());
        vo.setGrade(row.getGrade());
        vo.setPersonalSkills(row.getPersonalSkills());
        vo.setPersonalityDesc(row.getPersonalityDesc());
        vo.setCertificationStatus(row.getCertificationStatus());
        vo.setAuditTime(row.getAuditTime());
        vo.setAuditNotes(row.getAuditNotes());
        vo.setContinuousMatch(row.getContinuousMatch());
        vo.setTotalServiceDuration(row.getTotalServiceDuration());
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
            // 使用 SCAN 替代 KEYS，避免阻塞 Redis
            var keys = new java.util.HashSet<String>();
            try (var cursor = redisTemplate.scan(
                    org.springframework.data.redis.core.ScanOptions.scanOptions()
                            .match("match:recommendations:student:*")
                            .count(100)
                            .build())) {
                cursor.forEachRemaining(keys::add);
            }
            if (!keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.warn("推荐缓存清理失败", e);
        }
    }
}

