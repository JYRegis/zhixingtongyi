package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class StudentProfileRequest {
    @NotBlank(message = "realName 不能为空")
    private String realName;
    @NotNull(message = "schoolId 不能为空")
    private Long schoolId;
    @NotBlank(message = "grade 不能为空")
    private String grade;
    @NotEmpty(message = "subjectsNeeded 不能为空")
    private List<String> subjectsNeeded;
    @NotEmpty(message = "freeTime 不能为空")
    private List<Map<String, Object>> freeTime;
    private String personalityDesc;
    private Long bindAdminId;
}

