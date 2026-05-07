package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("school")
public class School {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String regionCode;
    private String address;
    private String contactPerson;
    private String contactPhone;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

