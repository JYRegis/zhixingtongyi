package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.po.MessageNotification;
import com.rural.education.service.NotificationService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserUtil currentUserUtil;

    @GetMapping
    public ApiResponse<List<MessageNotification>> list(
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
    public ApiResponse<Void> batchRead(@Valid @RequestBody BatchReadRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        notificationService.batchRead(userId, request);
        return ApiResponse.success();
    }
}

