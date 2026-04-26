package com.rural.education.enums;

public enum MeetingStatus {
    NOT_STARTED(0),
    IN_PROGRESS(1),
    FINISHED(2),
    CANCELLED(3);

    private final int code;

    MeetingStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
