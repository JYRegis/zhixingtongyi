package com.rural.education.listener;

import com.rural.education.pojo.po.MessageNotification;
import com.rural.education.config.MqConfig;
import com.rural.education.pojo.dto.*;
import com.rural.education.mapper.MessageNotificationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationEventListener {
    private final MessageNotificationMapper messageNotificationMapper;

    @RabbitListener(queues = MqConfig.NOTIFICATION_QUEUE)
    public void consume(NotificationEvent event) {
        MessageNotification notification = new MessageNotification();
        notification.setUserId(event.getUserId());
        notification.setType(event.getType());
        notification.setTitle(event.getTitle());
        notification.setContent(event.getContent());
        notification.setParams(event.getParamsJson());
        notification.setWechatSent(0);
        messageNotificationMapper.insert(notification);
    }
}
