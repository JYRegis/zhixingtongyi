package com.rural.education.dto.response.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDistributionResponse {
    private String subject;
    private Long teacherCount;
    private Long studentCount;
}
