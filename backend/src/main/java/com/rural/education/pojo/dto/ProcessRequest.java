package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ProcessRequest {
    @NotBlank(message = "action 不能为空")
    @Pattern(regexp = "^(?i)(accept|reject)$", message = "action 仅支持 accept/reject")
    private String action;

    private String reason;
}

