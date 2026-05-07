package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class TeacherVO {
    private Long id;
    private Long userId;

    // Profile fields
    private String realName;
    private String school;
    private String grade;
    private List<Map<String, Object>> freeTime;
    private List<Object> skilledSubjects;
    private String personalSkills;
    private String personalityDesc;
    private Integer certificationStatus;
    private LocalDateTime auditTime;
    private String auditNotes;
    private Integer continuousMatch;
    private Integer totalServiceDuration;

    // Recommendation fields
    private Long teacherId;
    private Double matchScore;
}
