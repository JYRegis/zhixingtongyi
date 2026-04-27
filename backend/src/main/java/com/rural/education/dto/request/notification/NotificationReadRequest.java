package com.rural.education.dto.request.notification;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class NotificationReadRequest {
    @NotEmpty(message = "notificationIds 不能为空")
    private List<Long> notificationIds;
}

