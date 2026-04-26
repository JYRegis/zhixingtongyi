package com.rural.education.enums;

public enum MessageType {
    TEXT(0),
    IMAGE(1),
    VOICE(2);

    private final int code;

    MessageType(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
