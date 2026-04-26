package com.rural.education.event.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecordStatusChangedEvent {
    private Long recordId;
    private Integer status;
    private Long operatorId;
}

