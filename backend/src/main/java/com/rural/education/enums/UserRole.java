package com.rural.education.enums;

import java.util.Arrays;

public enum UserRole {
    L1_ADMIN(0),
    L2_ADMIN(1),
    TEACHER(2),
    STUDENT(3);

    private final int code;

    UserRole(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static UserRole fromCode(Integer code) {
        if (code == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(v -> v.code == code)
                .findFirst()
                .orElse(null);
    }
}
