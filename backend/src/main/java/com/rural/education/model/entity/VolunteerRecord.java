package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("volunteer_record")
public class VolunteerRecord {
    @TableId(type = IdType.AUTO)
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
}
