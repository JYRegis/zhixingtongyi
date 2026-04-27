package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.system.UpdateWeightRequest;
import com.rural.education.model.entity.AlgorithmWeightConfig;

import java.util.List;

public interface AlgorithmService extends IService<AlgorithmWeightConfig> {

    List<AlgorithmWeightConfig> getWeights();

    void updateWeight(Long userId, Long configId, UpdateWeightRequest request);

    void recalculateWeights(Long userId);
}
