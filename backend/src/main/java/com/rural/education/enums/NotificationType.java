package com.rural.education.enums;

public enum NotificationType {
    MATCH_APPLY(0),
    MATCH_ACCEPT(1),
    MATCH_REJECT(2),
    UNBIND_APPLY(3),
    UNBIND_ACCEPT(4),
    MEETING_REMINDER(5),
    DURATION_STUDENT_CONFIRM(6),
    DURATION_ADMIN_AUDIT(7),
    DURATION_AUDIT_RESULT(8);

    private final int code;

    NotificationType(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
