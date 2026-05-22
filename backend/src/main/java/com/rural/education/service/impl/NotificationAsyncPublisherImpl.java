package com.rural.education.service.impl;

import com.rural.education.config.MqConfig;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.service.NotificationAsyncPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class NotificationAsyncPublisherImpl implements NotificationAsyncPublisher {
    private final RabbitTemplate rabbitTemplate;

    @Override
    public void publish(NotificationEvent event) {
        rabbitTemplate.convertAndSend(
                MqConfig.NOTIFICATION_EXCHANGE,
                MqConfig.NOTIFICATION_ROUTING_KEY,
                event
        );
    }

    @Override
    public void publishAfterCommit(NotificationEvent event) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    rabbitTemplate.convertAndSend(
                            MqConfig.NOTIFICATION_EXCHANGE,
                            MqConfig.NOTIFICATION_ROUTING_KEY,
                            event
                    );
                }
            });
        } else {
            rabbitTemplate.convertAndSend(
                    MqConfig.NOTIFICATION_EXCHANGE,
                    MqConfig.NOTIFICATION_ROUTING_KEY,
                    event
            );
        }
    }
}
