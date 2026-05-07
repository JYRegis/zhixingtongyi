package com.rural.education.dto.request.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MarkReadRequest {
    @NotNull(message = "messageId 不能为空")
    private Long messageId;
}
