package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {
    @NotNull(message = "status 不能为空")
    private Integer status;
}

