package com.rural.education.dto.common;

import lombok.Data;

import java.io.Serializable;

@Data
public class NotificationEvent implements Serializable {
    private Long userId;
    private Integer type;
    private String title;
    private String content;
    private String paramsJson;
}

