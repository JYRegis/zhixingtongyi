package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("match_pair")
public class MatchPair {

    public static final Integer CONFIRMED = 1;
    public static final Integer UNCONFIRMED = 0;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long studentId;
    private Long teacherId;
    private Integer matchStatus;
    private LocalDateTime applyTime;
    private LocalDateTime acceptTime;
    private String rejectReason;
    private Long unbindRequestBy;
    private LocalDateTime unbindRequestTime;
    private Integer studentUnbindConfirm;
    private LocalDateTime studentUnbindConfirmTime;
    private Integer teacherUnbindConfirm;
    private LocalDateTime teacherUnbindConfirmTime;
    private Integer adminUnbindConfirm;
    private LocalDateTime adminUnbindConfirmTime;
    private Long unbindAdminId;
    private Long unbindRejectBy;
    private String unbindRejectReason;
    private LocalDateTime unbindRejectTime;
    private LocalDateTime unbindAcceptTime;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

