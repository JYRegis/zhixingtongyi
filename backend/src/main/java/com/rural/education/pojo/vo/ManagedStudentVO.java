package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ManagedStudentVO {
    private Long id;
    private Long userId;
    private String realName;
    private Long schoolId;
    private String grade;
    private String subjectsNeeded;
    private String freeTime;
    private String personalityDesc;
    private Integer profileStatus;
    private Long bindAdminId;
    private Integer auditStatus;
    private LocalDateTime auditTime;
    private String auditNotes;
    private LocalDateTime updateTime;
    private String username;
    private String phone;
}

