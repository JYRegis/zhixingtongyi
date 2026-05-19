package com.rural.education.dto.request.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SecondaryAdminRequest {
    @NotNull(message = "userId 不能为空")
    private Long userId;
    @NotNull(message = "schoolId 不能为空")
    private Long schoolId;
    private String regionCode;
    @NotEmpty(message = "permissions 不能为空")
    private List<String> permissions;
}
