package com.rural.education.pojo.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

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
}

