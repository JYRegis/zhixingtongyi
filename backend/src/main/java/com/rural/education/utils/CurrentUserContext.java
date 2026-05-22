package com.rural.education.utils;

public final class CurrentUserContext {
    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<Integer> ROLE = new ThreadLocal<>();

    private CurrentUserContext() {
    }

    public static void setUserId(Long userId) {
        USER_ID.set(userId);
    }

    public static Long getUserId() {
        return USER_ID.get();
    }

    public static void setRole(Integer role) {
        ROLE.set(role);
    }

    public static Integer getRole() {
        return ROLE.get();
    }

    public static void clear() {
        USER_ID.remove();
        ROLE.remove();
    }
}
