package com.rural.education.controller.notification;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.notification.NotificationReadRequest;
import com.rural.education.model.entity.MessageNotification;
import com.rural.education.service.NotificationService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserUtil currentUserUtil;

    @GetMapping
    public ApiResponse<PageResponse<MessageNotification>> list(
            @RequestParam(required = false) Integer type,
            @RequestParam(required = false, defaultValue = "false") Boolean unreadOnly,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size
    ) {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(notificationService.list(userId, type, unreadOnly, page, size));
    }

    @PutMapping("/{notificationId}/read")
    public ApiResponse<Void> read(@PathVariable Long notificationId) {
        Long userId = currentUserUtil.getCurrentUserId();
        notificationService.read(userId, notificationId);
        return ApiResponse.success();
    }

    @PutMapping("/batch-read")
    public ApiResponse<Void> batchRead(@Valid @RequestBody NotificationReadRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        notificationService.batchRead(userId, request);
        return ApiResponse.success();
    }
}

