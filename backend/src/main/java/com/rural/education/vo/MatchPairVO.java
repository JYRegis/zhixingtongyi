package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MatchPairVO {
    private Long id;
    private Long pairId;
    private Long studentId;
    private String studentName;
    private Long teacherId;
    private String teacherName;
    private Integer matchStatus;
    private LocalDateTime applyTime;
    private LocalDateTime acceptTime;
    private String rejectReason;
    private LocalDateTime unbindRequestTime;
    private LocalDateTime unbindAcceptTime;
    private String unbindRejectReason;

    private Integer studentUnbindConfirm;
    private Integer teacherUnbindConfirm;
    private Integer adminUnbindConfirm;
    private LocalDateTime studentUnbindConfirmTime;
    private LocalDateTime teacherUnbindConfirmTime;
    private LocalDateTime adminUnbindConfirmTime;
    private Long unbindRequestBy;
    private Long unbindRejectBy;
    private LocalDateTime unbindRejectTime;
    private String studentFreeTime;
    private String studentGrade;
}
