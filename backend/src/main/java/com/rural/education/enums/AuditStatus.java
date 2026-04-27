package com.rural.education.enums;

public enum AuditStatus {
    PENDING(0),
    APPROVED(1),
    REJECTED(2);

    private final int code;

    AuditStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
