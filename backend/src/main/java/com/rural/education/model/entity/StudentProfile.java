package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_profile")
public class StudentProfile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String realName;
    private Long schoolId;
    private String grade;
    private String subjectsNeeded;
    private String freeTime;
    private String personalityDesc;
    private Integer emergencyWeight;
    private Integer profileStatus;
    private Long bindAdminId;
    private Integer auditStatus;
    private LocalDateTime auditTime;
    private String auditNotes;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

