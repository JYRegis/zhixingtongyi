package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("chat_participant")
public class ChatParticipant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long matchPairId;
    private Long userId;
    private Integer participantRole;
    private Integer isDefaultMember;
    private LocalDateTime joinedTime;
    private LocalDateTime leftTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
