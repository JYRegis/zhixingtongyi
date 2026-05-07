package com.rural.education.service;

import com.rural.education.dto.common.NotificationEvent;

public interface NotificationEventListener {
    void handle(NotificationEvent event);
}
