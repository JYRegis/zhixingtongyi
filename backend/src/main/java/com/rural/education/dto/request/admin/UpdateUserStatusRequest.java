package com.rural.education.dto.request.admin;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotNull(message = "status 不能为空")
    private Integer status;
}

