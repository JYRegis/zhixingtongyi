package com.rural.education.dto.query;

import lombok.Data;

@Data
public class RecordQuery {
    private Long teacherId;
    private Long studentId;
    private Integer status;
    private Long page;
    private Long size;
}
