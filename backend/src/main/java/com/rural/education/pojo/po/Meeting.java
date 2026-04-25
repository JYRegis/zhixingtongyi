package com.rural.education.pojo.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
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
    private LocalDateTime updateTime;
}

