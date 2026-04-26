package com.rural.education.enums;

public enum MatchStatus {
    APPLIED(0),
    ACCEPTED(1),
    REJECTED(2),
    UNBIND_CONFIRMING(3),
    UNBOUND(4),
    UNBIND_REJECTED(5);

    private final int code;

    MatchStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
