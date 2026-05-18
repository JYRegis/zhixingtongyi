package com.rural.education.service.impl;

import com.rural.education.config.MqConfig;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.model.entity.MessageNotification;
import com.rural.education.model.mapper.MessageNotificationMapper;
import com.rural.education.service.NotificationEventListener;
import com.rural.education.websocket.UserSessionRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class NotificationEventListenerImpl implements NotificationEventListener {
    private final MessageNotificationMapper messageNotificationMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserSessionRegistry sessionRegistry;

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

        // 如果用户在线，通过 WebSocket 实时推送
        if (sessionRegistry.isOnline(event.getUserId())) {
            messagingTemplate.convertAndSendToUser(
                    event.getUserId().toString(),
                    "/queue/notifications",
                    Map.of(
                            "type", "notification",
                            "id", notification.getId(),
                            "title", notification.getTitle() != null ? notification.getTitle() : "",
                            "content", notification.getContent() != null ? notification.getContent() : "",
                            "sentTime", notification.getSentTime().toString()
                    )
            );
        }
    }
}
