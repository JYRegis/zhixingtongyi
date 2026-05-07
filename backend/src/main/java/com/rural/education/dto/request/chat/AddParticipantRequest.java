package com.rural.education.dto.request.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddParticipantRequest {
    @NotNull(message = "userId 不能为空")
    private Long userId;
}
