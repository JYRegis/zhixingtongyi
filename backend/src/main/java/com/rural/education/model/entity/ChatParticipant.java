package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
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
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
