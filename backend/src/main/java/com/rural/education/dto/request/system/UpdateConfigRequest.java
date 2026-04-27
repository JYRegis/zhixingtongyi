package com.rural.education.dto.request.system;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateConfigRequest {
    @NotBlank(message = "configValue 不能为空")
    private String configValue;

    private String description;
}
