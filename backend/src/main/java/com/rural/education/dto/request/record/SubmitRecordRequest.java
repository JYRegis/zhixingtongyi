package com.rural.education.dto.request.record;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class SubmitRecordRequest {
    @NotNull(message = "matchPairId 不能为空")
    private Long matchPairId;

    private Long meetingId;

    @NotNull(message = "duration 不能为空")
    private Integer duration;

    @NotNull(message = "meetingDate 不能为空")
    private LocalDate meetingDate;

    @NotBlank(message = "serviceDesc 不能为空")
    private String serviceDesc;

    private List<String> evidenceImages;

    private String aiSummary;
}
