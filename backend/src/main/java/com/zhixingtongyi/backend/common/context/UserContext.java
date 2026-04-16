package com.zhixingtongyi.backend.common.context;

public class UserContext {
    private static final ThreadLocal<Long> ID_HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE_HOLDER = new ThreadLocal<>();

    public static void setContext(Long id, String perms) {
        ID_HOLDER.set(id);
        ROLE_HOLDER.set(perms);
    }

    // 存入当前用户 ID
    public static void setUserId(Long userId) {
        ID_HOLDER.set(userId);
    }

    // 获取当前用户 ID
    public static Long getUserId() {
        return ID_HOLDER.get();
    }

    // 存入当前用户角色
    public static void setRole(String role) {
        ROLE_HOLDER.set(role);
    }

    // 获得当前用户权限
    public static String getRole() {
        return ROLE_HOLDER.get();
    }

    // 必须清理！防止内存泄漏
    public static void remove() {
        ID_HOLDER.remove();
        ROLE_HOLDER.remove();
    }
}