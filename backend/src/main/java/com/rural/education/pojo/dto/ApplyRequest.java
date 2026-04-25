package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApplyRequest {
    @NotNull(message = "teacherId 不能为空")
    private Long teacherId;
}

