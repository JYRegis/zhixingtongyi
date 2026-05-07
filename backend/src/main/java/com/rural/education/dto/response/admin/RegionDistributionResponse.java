package com.rural.education.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegionDistributionResponse {
    private String regionCode;
    private String regionName;
    private Long schoolCount;
    private Long studentCount;
}
