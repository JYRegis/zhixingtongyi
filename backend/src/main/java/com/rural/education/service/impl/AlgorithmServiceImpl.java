package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.dto.request.system.UpdateWeightRequest;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BizException;
import com.rural.education.model.entity.AlgorithmWeightConfig;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.mapper.AlgorithmWeightConfigMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.service.AlgorithmService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlgorithmServiceImpl extends ServiceImpl<AlgorithmWeightConfigMapper, AlgorithmWeightConfig> implements AlgorithmService {
    private final AlgorithmWeightConfigMapper algorithmWeightConfigMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final UserAccessService userAccessService;

    @Override
    public List<AlgorithmWeightConfig> getWeights() {
        return algorithmWeightConfigMapper.selectList(null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateWeight(Long userId, Long configId, UpdateWeightRequest request) {
        userAccessService.requireAnyRole(userId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        AlgorithmWeightConfig config = algorithmWeightConfigMapper.selectById(configId);
        if (config == null) {
            throw new BizException("权重配置不存在");
        }
        algorithmWeightConfigMapper.update(null,
                new LambdaUpdateWrapper<AlgorithmWeightConfig>()
                        .eq(AlgorithmWeightConfig::getId, configId)
                        .set(AlgorithmWeightConfig::getWeight, request.getWeight())
                        .set(AlgorithmWeightConfig::getEnabled, request.getEnabled())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recalculateWeights(Long userId) {
        userAccessService.requireAnyRole(userId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        List<StudentProfile> students = studentProfileMapper.selectList(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getProfileStatus, 1)
        );
        for (StudentProfile student : students) {
            int emergencyWeight = computeEmergencyWeight(student.getGrade());
            studentProfileMapper.update(null,
                    new LambdaUpdateWrapper<StudentProfile>()
                            .eq(StudentProfile::getId, student.getId())
                            .set(StudentProfile::getEmergencyWeight, emergencyWeight)
            );
        }
    }

    private int computeEmergencyWeight(String grade) {
        if (grade == null) return 50;
        String g = grade.trim();
        if (g.contains("初三") || g.contains("高三") || g.contains("九")) return 100;
        if (g.contains("初二") || g.contains("高二") || g.contains("八")) return 80;
        if (g.contains("初一") || g.contains("高一") || g.contains("七")) return 60;
        if (g.contains("六年级") || g.contains("六")) return 40;
        return 30;
    }
}
