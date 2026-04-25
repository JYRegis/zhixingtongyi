package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class StudentProfileVO {
    private Long id;
    private Long userId;
    private String realName;
    private Long schoolId;
    private String grade;
    private List<Object> subjectsNeeded;
    private List<Map<String, Object>> freeTime;
    private String personalityDesc;
    private Integer profileStatus;
    private Long bindAdminId;
    private Integer auditStatus;
    private LocalDateTime auditTime;
    private String auditNotes;
}

