package com.rural.education.service;

import com.rural.education.dto.response.admin.DashboardOverviewResponse;
import com.rural.education.dto.response.admin.MatchSuccessRateResponse;
import com.rural.education.dto.response.admin.RegionDistributionResponse;
import com.rural.education.dto.response.admin.SubjectDistributionResponse;

import java.util.List;

public interface DashboardService {

    DashboardOverviewResponse getOverview(Long userId);

    MatchSuccessRateResponse getMatchSuccessRate(Long userId, String startDate, String endDate);

    List<RegionDistributionResponse> getRegionDistribution(Long userId);

    List<SubjectDistributionResponse> getSubjectDistribution(Long userId);
}
