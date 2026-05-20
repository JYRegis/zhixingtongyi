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
    private String avatar;
    private Long schoolId;
    private String schoolName;
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

    // Raw JSON string fields for MyBatis mapping (DB VARCHAR → Java List)
    private String skilledSubjectsRaw;
    private String freeTimeRaw;

    // Recommendation fields
    private Long teacherId;
    private Double matchScore;
}
