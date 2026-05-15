package com.rural.education.vo;

import lombok.Data;

import java.util.List;

@Data
public class AdminProfileVO {
    private Long userId;
    private String realName;
    private Long schoolId;
    private String schoolName;
    private String regionCode;
    private List<String> permissions;
}
