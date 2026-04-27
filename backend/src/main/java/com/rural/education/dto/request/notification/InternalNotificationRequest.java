package com.rural.education.dto.request.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class InternalNotificationRequest {
    @NotNull(message = "userId 不能为空")
    private Long userId;

    @NotBlank(message = "type 不能为空")
    private String type;

    @NotNull(message = "templateData 不能为空")
    private Map<String, Object> templateData;
}

