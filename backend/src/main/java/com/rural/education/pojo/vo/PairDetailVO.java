package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PairDetailVO {
    private Long id;
    private Long studentId;
    private Long teacherId;
    private Integer matchStatus;
    private LocalDateTime applyTime;
    private LocalDateTime acceptTime;
    private String rejectReason;
    private LocalDateTime unbindRequestTime;
    private LocalDateTime unbindAcceptTime;
    private String unbindRejectReason;
}

