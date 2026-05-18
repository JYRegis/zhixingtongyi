package com.rural.education.enums;

import java.util.Arrays;

public enum SchoolType {
    RURAL_SCHOOL(0),
    VOLUNTEER_SCHOOL(1);

    private final int code;

    SchoolType(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static SchoolType fromCode(Integer code) {
        if (code == null) return null;
        return Arrays.stream(values())
                .filter(v -> v.code == code)
                .findFirst()
                .orElse(null);
    }
}
