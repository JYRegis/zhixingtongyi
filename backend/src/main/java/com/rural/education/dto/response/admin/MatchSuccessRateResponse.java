package com.rural.education.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchSuccessRateResponse {
    private String startDate;
    private String endDate;
    private Long totalApplications;
    private Long acceptedCount;
    private BigDecimal successRate;
}
