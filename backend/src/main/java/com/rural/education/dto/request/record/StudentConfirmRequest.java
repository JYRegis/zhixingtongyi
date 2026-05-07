package com.rural.education.dto.request.record;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StudentConfirmRequest {
    @NotBlank(message = "action 不能为空")
    private String action;

    private String rejectReason;
}
