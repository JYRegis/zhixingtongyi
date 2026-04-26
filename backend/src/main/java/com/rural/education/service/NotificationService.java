package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.notification.NotificationReadRequest;
import com.rural.education.dto.request.notification.InternalNotificationRequest;
import com.rural.education.model.entity.MessageNotification;



public interface NotificationService extends IService<MessageNotification> {
    PageResponse<MessageNotification> list(Long userId, Integer type, Boolean unreadOnly, Integer page, Integer size);

    void read(Long userId, Long notificationId);

    void batchRead(Long userId, NotificationReadRequest request);

    void sendInternalWechat(InternalNotificationRequest request);
}

