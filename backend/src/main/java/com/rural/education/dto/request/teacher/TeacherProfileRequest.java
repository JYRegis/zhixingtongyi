package com.rural.education.dto.request.teacher;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class TeacherProfileRequest {
    @NotBlank(message = "realName 不能为空")
    private String realName;
    @NotBlank(message = "school 不能为空")
    private String school;
    @NotBlank(message = "grade 不能为空")
    private String grade;
    @NotEmpty(message = "freeTime 不能为空")
    private List<Map<String, Object>> freeTime;
    @NotEmpty(message = "skilledSubjects 不能为空")
    private List<String> skilledSubjects;
    private String personalSkills;
    private String personalityDesc;
}

