package com.rural.education.controller.admin;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.response.admin.DashboardOverviewResponse;
import com.rural.education.dto.response.admin.MatchSuccessRateResponse;
import com.rural.education.dto.response.admin.RegionDistributionResponse;
import com.rural.education.dto.response.admin.SubjectDistributionResponse;
import com.rural.education.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('0','1')")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard/overview")
    public ApiResponse<DashboardOverviewResponse> overview() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(dashboardService.getOverview(userId));
    }

    @GetMapping("/statistics/match-success-rate")
    public ApiResponse<MatchSuccessRateResponse> matchSuccessRate(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(dashboardService.getMatchSuccessRate(userId, startDate, endDate));
    }

    @GetMapping("/statistics/region-distribution")
    public ApiResponse<List<RegionDistributionResponse>> regionDistribution() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(dashboardService.getRegionDistribution(userId));
    }

    @GetMapping("/statistics/subject-distribution")
    public ApiResponse<List<SubjectDistributionResponse>> subjectDistribution() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(dashboardService.getSubjectDistribution(userId));
    }
}
