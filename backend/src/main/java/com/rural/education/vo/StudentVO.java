package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StudentVO {
    private Long id;
    private Long userId;
    private String realName;
    private Long schoolId;
    private String grade;

    // Compatible with both profile(list/json) and managed-student(string/json)
    private Object subjectsNeeded;
    private Object freeTime;
    private String username;
    private String phone;

    private String personalityDesc;
    private Integer profileStatus;
    private Long bindAdminId;
    private Integer auditStatus;
    private LocalDateTime auditTime;
    private String auditNotes;
    private LocalDateTime updateTime;
}
