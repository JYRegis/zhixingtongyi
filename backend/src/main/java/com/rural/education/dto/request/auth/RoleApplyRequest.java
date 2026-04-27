package com.rural.education.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleApplyRequest {
    @NotBlank(message = "targetRole 不能为空")
    private String targetRole;
}

