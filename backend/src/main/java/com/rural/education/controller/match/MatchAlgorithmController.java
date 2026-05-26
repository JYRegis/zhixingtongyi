package com.rural.education.controller.match;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.algorithm.UpdateWeightRequest;
import com.rural.education.model.entity.AlgorithmWeightConfig;
import com.rural.education.service.AlgorithmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/algorithm")
@RequiredArgsConstructor
public class MatchAlgorithmController {
    private final AlgorithmService algorithmService;

    @GetMapping("/weights")
    public ApiResponse<List<AlgorithmWeightConfig>> getWeights() {
        return ApiResponse.success(algorithmService.getWeights());
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @PutMapping("/weights/{configId}")
    public ApiResponse<Void> updateWeight(@PathVariable Long configId, @Valid @RequestBody UpdateWeightRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        algorithmService.updateWeight(userId, configId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @PostMapping("/recalculate-weights")
    public ApiResponse<Void> recalculateWeights() {
        Long userId = SecurityUtils.getCurrentUserId();
        algorithmService.recalculateWeights(userId);
        return ApiResponse.success();
    }
}
