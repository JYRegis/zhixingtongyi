package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("admin_profile")
public class AdminProfile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long schoolId;
    private String regionCode;
    private String permissions;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

