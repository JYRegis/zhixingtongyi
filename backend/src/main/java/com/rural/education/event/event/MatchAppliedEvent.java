package com.rural.education.event.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchAppliedEvent {
    private Long studentId;
    private Long teacherId;
    private Long pairId;
}

