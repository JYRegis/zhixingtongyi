package com.rural.education.service;

import com.rural.education.dto.common.NotificationEvent;

public interface NotificationAsyncPublisher {
    void publish(NotificationEvent event);

    void publishAfterCommit(NotificationEvent event);
}
