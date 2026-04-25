package com.rural.education.pojo.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("teacher_profile")
public class TeacherProfile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String realName;
    private String school;
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
}

