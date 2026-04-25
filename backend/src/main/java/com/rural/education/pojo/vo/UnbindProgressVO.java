package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UnbindProgressVO {
    private Long pairId;
    private Integer matchStatus;
    private Integer studentUnbindConfirm;
    private Integer teacherUnbindConfirm;
    private Integer adminUnbindConfirm;
    private LocalDateTime studentUnbindConfirmTime;
    private LocalDateTime teacherUnbindConfirmTime;
    private LocalDateTime adminUnbindConfirmTime;
    private Long unbindRejectBy;
    private String unbindRejectReason;
    private LocalDateTime unbindRejectTime;
}

