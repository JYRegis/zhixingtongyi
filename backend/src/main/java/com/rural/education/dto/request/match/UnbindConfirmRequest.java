package com.rural.education.dto.request.match;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UnbindConfirmRequest {
    @NotBlank(message = "action 不能为空")
    @Pattern(regexp = "^(?i)(accept|reject)$", message = "action 仅支持 accept/reject")
    private String action;

    @NotBlank(message = "role 不能为空")
    @Pattern(regexp = "^(?i)(STUDENT|TEACHER|SECONDARY_ADMIN)$", message = "role 仅支持 STUDENT/TEACHER/SECONDARY_ADMIN")
    private String role;

    private String rejectReason;
}

