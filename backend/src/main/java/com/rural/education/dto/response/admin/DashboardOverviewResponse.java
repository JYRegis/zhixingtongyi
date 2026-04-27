package com.rural.education.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewResponse {
    private Long totalUsers;
    private Long matchedPairs;
    private Long activeMeetings;
    private Long totalServiceHours;
}
