package com.rural.education.enums;

public enum OssBusinessType {
    AVATAR("avatar"),
    CHAT_IMAGE("chat/image"),
    CHAT_FILE("chat/file"),
    CHAT_VOICE("chat/voice"),
    EVIDENCE("evidence"),
    MEETING_RECORD("meeting");

    private final String dir;

    OssBusinessType(String dir) {
        this.dir = dir;
    }

    public String getDir() {
        return dir;
    }
}
