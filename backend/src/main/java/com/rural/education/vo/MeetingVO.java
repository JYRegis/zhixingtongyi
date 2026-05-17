package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MeetingVO {
    private Long id;
    private Long matchPairId;
    private String topic;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String meetingLink;
    private String meetingPassword;
    private Long createdBy;
    private Integer status;
    private LocalDateTime updateTime;
    private Long studentId;
    private Long teacherId;
}
