package com.rural.education.pojo.vo;

import lombok.Data;

@Data
public class TeacherRecommendationVO {
    private Long teacherId;
    private String realName;
    private String school;
    private String grade;
    private String skilledSubjects;
    private String freeTime;
}

