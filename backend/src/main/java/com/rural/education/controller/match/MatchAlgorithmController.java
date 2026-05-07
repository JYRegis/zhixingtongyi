package com.rural.education.controller.match;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.algorithm.UpdateWeightRequest;
import com.rural.education.model.entity.AlgorithmWeightConfig;
import com.rural.education.service.AlgorithmService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/algorithm")
@RequiredArgsConstructor
public class MatchAlgorithmController {
    private final CurrentUserUtil currentUserUtil;
    private final AlgorithmService algorithmService;

    @GetMapping("/weights")
    public ApiResponse<List<AlgorithmWeightConfig>> getWeights() {
        return ApiResponse.success(algorithmService.getWeights());
    }

    @PutMapping("/weights/{configId}")
    public ApiResponse<Void> updateWeight(@PathVariable Long configId, @Valid @RequestBody UpdateWeightRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        algorithmService.updateWeight(userId, configId, request);
        return ApiResponse.success();
    }

    @PostMapping("/recalculate-weights")
    public ApiResponse<Void> recalculateWeights() {
        Long userId = currentUserUtil.getCurrentUserId();
        algorithmService.recalculateWeights(userId);
        return ApiResponse.success();
    }
}
