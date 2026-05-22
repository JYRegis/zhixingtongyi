package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("chat_participant")
public class ChatParticipant {

    public static final Integer DEFAULT_MEMBER = 1;
    public static final Integer NON_DEFAULT_MEMBER = 0;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long matchPairId;
    private Long userId;
    private Integer participantRole;
    private Integer isDefaultMember;
    private LocalDateTime joinedTime;
    private LocalDateTime leftTime;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
