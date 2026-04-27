package com.rural.education.event.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MeetingCreatedEvent {
    private Long meetingId;
    private Long pairId;
    private Long createdBy;
}

