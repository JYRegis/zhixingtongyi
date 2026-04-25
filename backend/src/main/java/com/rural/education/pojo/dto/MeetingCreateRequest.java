package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MeetingCreateRequest {
    @NotNull(message = "matchPairId 不能为空")
    private Long matchPairId;

    @NotBlank(message = "topic 不能为空")
    private String topic;

    @NotBlank(message = "startTime 不能为空")
    private String startTime;

    @NotBlank(message = "endTime 不能为空")
    private String endTime;

    @NotBlank(message = "meetingLink 不能为空")
    private String meetingLink;
}

