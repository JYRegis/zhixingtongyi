package com.rural.education.dto.request.match;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MatchApplyRequest {
    @NotNull(message = "teacherId 不能为空")
    private Long teacherId;
}

