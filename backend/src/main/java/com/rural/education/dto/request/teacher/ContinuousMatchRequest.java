package com.rural.education.dto.request.teacher;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ContinuousMatchRequest {
    @NotNull(message = "enabled 不能为空")
    private Boolean enabled;
}

