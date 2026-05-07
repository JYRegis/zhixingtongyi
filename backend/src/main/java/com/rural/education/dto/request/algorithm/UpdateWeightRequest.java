package com.rural.education.dto.request.algorithm;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class UpdateWeightRequest {
    public BigDecimal weight;
    public Boolean enabled;
}
