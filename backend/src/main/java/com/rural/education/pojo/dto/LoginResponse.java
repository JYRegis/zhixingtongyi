package com.rural.education.pojo.dto;

import lombok.Builder;
import lombok.Data;

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
    }
}

