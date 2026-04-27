package com.rural.education.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class MqConfig {
    public static final String NOTIFICATION_EXCHANGE = "education.notification.exchange";
    public static final String NOTIFICATION_QUEUE = "education.notification.queue";
    public static final String NOTIFICATION_ROUTING_KEY = "education.notification.create";
    public static final String NOTIFICATION_DLX = "education.notification.dlx";
    public static final String NOTIFICATION_DLQ = "education.notification.dlq";
    public static final String NOTIFICATION_DLQ_ROUTING_KEY = "education.notification.dead";

    @Bean
    public DirectExchange notificationExchange() {
        return new DirectExchange(NOTIFICATION_EXCHANGE, true, false);
    }

    @Bean
    public Queue notificationQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", NOTIFICATION_DLX);
        args.put("x-dead-letter-routing-key", NOTIFICATION_DLQ_ROUTING_KEY);
        return new Queue(NOTIFICATION_QUEUE, true, false, false, args);
    }

    @Bean
    public Binding notificationBinding(DirectExchange notificationExchange, Queue notificationQueue) {
        return BindingBuilder.bind(notificationQueue).to(notificationExchange).with(NOTIFICATION_ROUTING_KEY);
    }

    @Bean
    public DirectExchange notificationDeadLetterExchange() {
        return new DirectExchange(NOTIFICATION_DLX, true, false);
    }

    @Bean
    public Queue notificationDeadLetterQueue() {
        return new Queue(NOTIFICATION_DLQ, true);
    }

    @Bean
    public Binding notificationDeadLetterBinding(DirectExchange notificationDeadLetterExchange, Queue notificationDeadLetterQueue) {
        return BindingBuilder.bind(notificationDeadLetterQueue)
                .to(notificationDeadLetterExchange)
                .with(NOTIFICATION_DLQ_ROUTING_KEY);
    }
}
