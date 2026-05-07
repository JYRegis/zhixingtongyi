package com.rural.education.dto.request.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class JoinChatRequest {
    @NotNull(message = "matchPairId 不能为空")
    private Long matchPairId;
}
