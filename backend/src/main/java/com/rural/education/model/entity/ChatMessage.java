package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("chat_message")
public class ChatMessage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long matchPairId;
    private Long senderId;
    private Integer messageType;
    private String content;
    private LocalDateTime sendTime;
    private LocalDateTime readTime;

    @TableLogic
    private Integer deleted;
}
