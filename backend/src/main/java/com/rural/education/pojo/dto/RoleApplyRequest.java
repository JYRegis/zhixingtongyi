package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleApplyRequest {
    @NotBlank(message = "targetRole 不能为空")
    private String targetRole;
}

