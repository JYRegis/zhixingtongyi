package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("teacher_profile")
public class TeacherProfile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long schoolId;
    private String grade;
    private String freeTime;
    private String skilledSubjects;
    private String personalSkills;
    private String personalityDesc;
    private Integer certificationStatus;
    private LocalDateTime auditTime;
    private String auditNotes;
    private Integer continuousMatch;
    private Integer totalServiceDuration;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

