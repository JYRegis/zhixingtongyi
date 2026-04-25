package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

