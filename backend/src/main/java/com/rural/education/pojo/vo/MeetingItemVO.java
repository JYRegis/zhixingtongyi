package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MeetingItemVO {
    private Long id;
    private Long matchPairId;
    private String topic;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String meetingLink;
    private Long createdBy;
    private Integer status;
    private LocalDateTime updateTime;
}

