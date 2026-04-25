package com.rural.education.pojo.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PendingApplicationVO {
    private Long id;
    private Long studentId;
    private LocalDateTime applyTime;
}

