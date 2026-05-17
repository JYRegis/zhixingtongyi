package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatMessageVO {
    private Long id;
    private Long matchPairId;
    private Long senderId;
    private Integer messageType;
    private String content;
    private String senderName;
    private LocalDateTime sendTime;
    private LocalDateTime readTime;
}
