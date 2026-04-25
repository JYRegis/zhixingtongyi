package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.po.MessageNotification;

import java.util.List;

public interface NotificationService extends IService<MessageNotification> {
    List<MessageNotification> list(Long userId, Integer type, Boolean unreadOnly, Integer page, Integer size);

    void read(Long userId, Long notificationId);

    void batchRead(Long userId, BatchReadRequest request);

    void sendInternalWechat(InternalNotificationRequest request);
}

