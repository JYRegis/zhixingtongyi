package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class VolunteerRecordVO {
    private Long id;
    private Long matchPairId;
    private Long teacherId;
    private Long studentId;
    private Long meetingId;
    private Integer duration;
    private LocalDate meetingDate;
    private String serviceDesc;
    private String evidenceImages;
    private String aiSummary;
    private Integer status;
    private String rejectReason;
    private LocalDateTime studentConfirmTime;
    private LocalDateTime adminAuditTime;
    private Long auditorId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private String teacherName;
    private String studentName;
}
