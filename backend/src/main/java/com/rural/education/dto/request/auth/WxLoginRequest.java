package com.rural.education.dto.request.auth;

import lombok.Data;

@Data
public class WxLoginRequest {
    private String code;
    private UserInfoDTO userInfo;

    @Data
    public static class UserInfoDTO {
        private String nickName;
        private String avatarUrl;
    }
}
