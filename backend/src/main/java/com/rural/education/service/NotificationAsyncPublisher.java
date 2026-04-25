package com.rural.education.service;

import com.rural.education.pojo.dto.*;

public interface NotificationAsyncPublisher {
    void publish(NotificationEvent event);
}
