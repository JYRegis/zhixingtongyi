package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.dto.request.algorithm.UpdateWeightRequest;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.AlgorithmWeightConfig;
import com.rural.education.model.mapper.AlgorithmWeightConfigMapper;
import com.rural.education.service.AlgorithmService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlgorithmServiceImpl extends ServiceImpl<AlgorithmWeightConfigMapper, AlgorithmWeightConfig> implements AlgorithmService {
    private final AlgorithmWeightConfigMapper algorithmWeightConfigMapper;

    @Override
    public List<AlgorithmWeightConfig> getWeights() {
        return algorithmWeightConfigMapper.selectList(null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateWeight(Long userId, Long configId, UpdateWeightRequest request) {

        AlgorithmWeightConfig config = algorithmWeightConfigMapper.selectById(configId);
        if (config == null) {
            throw new BusinessException("权重配置不存在");
        }
        algorithmWeightConfigMapper.update(null,
                new LambdaUpdateWrapper<AlgorithmWeightConfig>()
                        .eq(AlgorithmWeightConfig::getId, configId)
                        .set(AlgorithmWeightConfig::getWeight, request.getWeight())
                        .set(AlgorithmWeightConfig::getEnabled, Boolean.TRUE.equals(request.getEnabled()) ? 1 : 0)
        );
    }
}
