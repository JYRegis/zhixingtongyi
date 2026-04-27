package com.rural.education.controller.notification;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.notification.InternalNotificationRequest;
import com.rural.education.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {
    private final NotificationService notificationService;

    @PostMapping("/wechat")
    public ApiResponse<Void> sendWechat(@Valid @RequestBody InternalNotificationRequest request) {
        notificationService.sendInternalWechat(request);
        return ApiResponse.success();
    }
}

