package com.rural.education.service.impl;

import com.rural.education.config.MqConfig;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.model.entity.MessageNotification;
import com.rural.education.model.mapper.MessageNotificationMapper;
import com.rural.education.service.NotificationEventListener;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class NotificationEventListenerImpl implements NotificationEventListener {
    private final MessageNotificationMapper messageNotificationMapper;

    @Override
    @RabbitListener(queues = MqConfig.NOTIFICATION_QUEUE)
    public void handle(NotificationEvent event) {
        MessageNotification notification = new MessageNotification();
        notification.setUserId(event.getUserId());
        notification.setType(event.getType());
        notification.setTitle(event.getTitle());
        notification.setContent(event.getContent());
        notification.setParams(event.getParamsJson());
        notification.setSentTime(LocalDateTime.now());
        notification.setWechatSent(0);
        messageNotificationMapper.insert(notification);
    }
}
