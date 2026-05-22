package com.rural.education.enums;

import lombok.Getter;

@Getter
public enum ProfileStatus {
    DRAFT(0, "草稿"),
    READY(1, "就绪");

    private final int code;
    private final String desc;

    ProfileStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
