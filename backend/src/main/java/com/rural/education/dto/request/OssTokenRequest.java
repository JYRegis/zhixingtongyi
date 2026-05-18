package com.rural.education.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OssTokenRequest {
    @NotBlank(message = "businessType 不能为空")
    private String businessType;
}
