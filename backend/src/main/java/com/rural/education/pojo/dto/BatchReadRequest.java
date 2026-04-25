package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchReadRequest {
    @NotEmpty(message = "notificationIds 不能为空")
    private List<Long> notificationIds;
}

