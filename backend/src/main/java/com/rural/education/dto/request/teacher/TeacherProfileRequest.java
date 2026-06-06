package com.rural.education.dto.request.teacher;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class TeacherProfileRequest {
    @NotBlank(message = "realName 不能为空")
    private String realName;
    @NotNull(message = "schoolId 不能为空")
    private Long schoolId;
    private String grade;
    @NotEmpty(message = "freeTime 不能为空")
    private List<Map<String, Object>> freeTime;
    @NotEmpty(message = "skilledSubjects 不能为空")
    private List<String> skilledSubjects;
    private String personalSkills;
    private String personalityDesc;
}

