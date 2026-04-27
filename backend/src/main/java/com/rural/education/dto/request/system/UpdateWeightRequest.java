package com.rural.education.dto.request.system;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateWeightRequest {
    @NotNull(message = "weight 不能为空")
    private BigDecimal weight;

    @NotNull(message = "enabled 不能为空")
    private Integer enabled;
}
