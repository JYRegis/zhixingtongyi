package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("meeting")
public class Meeting {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long matchPairId;
    private String topic;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String meetingLink;
    private Long createdBy;
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

