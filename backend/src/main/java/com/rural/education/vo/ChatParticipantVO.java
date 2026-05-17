package com.rural.education.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatParticipantVO {
    private Long id;
    private Long matchPairId;
    private Long userId;
    private String realName;
    private Integer participantRole;
    private Integer isDefaultMember;
    private LocalDateTime joinedTime;
    private LocalDateTime leftTime;
}
