package com.rural.education.dto.request.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotNull(message = "matchPairId 不能为空")
    private Long matchPairId;

    @NotBlank(message = "messageType 不能为空")
    private String messageType;

    @NotBlank(message = "content 不能为空")
    private String content;
}
