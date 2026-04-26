package com.rural.education.dto.request.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchCreateStudentsRequest {
    @Valid
    @NotEmpty(message = "students 不能为空")
    private List<ManagedStudentRequest> students;
}

