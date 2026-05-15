package com.rural.education.dto.response.auth;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoginResponse {
    private String token;
    private UserInfo user;

    @Data
    @Builder
    public static class UserInfo {
        private Long id;
        private String username;
        private Integer role;
        private String avatar;
        private String phone;
        private Boolean hasProfile;
        private Boolean roleApplied;
        /** 学生 audit_status / 教师 certification_status */
        private Integer auditStatus;
        /** L2 管理员权限列表 */
        private List<String> permissions;
    }
}

