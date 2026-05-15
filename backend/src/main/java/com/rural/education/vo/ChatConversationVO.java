package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatConversationVO {
    private Long matchPairId;
    private Long studentId;
    private String studentName;
    private Long teacherId;
    private String teacherName;
    private Long schoolId;
    private String schoolName;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private Integer unreadCount;
}
