package com.rural.education.event.listener;

import com.rural.education.event.event.RecordStatusChangedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class WechatMessageListener {

    @EventListener
    public void onRecordStatusChanged(RecordStatusChangedEvent event) {
        // Reserved for future WeChat message push integration.
        log.debug("Receive RecordStatusChangedEvent, recordId={}, status={}", event.getRecordId(), event.getStatus());
    }
}

