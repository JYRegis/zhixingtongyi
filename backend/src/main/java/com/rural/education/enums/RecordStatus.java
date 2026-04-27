package com.rural.education.enums;

public enum RecordStatus {
    PENDING_STUDENT_CONFIRM(0),
    PENDING_ADMIN_AUDIT(1),
    APPROVED(2),
    REJECTED(3),
    STUDENT_REJECTED(4);

    private final int code;

    RecordStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
