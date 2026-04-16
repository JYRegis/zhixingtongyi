package com.zhixingtongyi.backend.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String password;
    // 角色：0-一级管理员，1-二级管理员，2-教师（志愿者），3-学员
    private int role;
    private String phone;
    private String wechatOpenid;
    private String avatar;
    // 状态：0-禁用，1-启用
    private int status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
