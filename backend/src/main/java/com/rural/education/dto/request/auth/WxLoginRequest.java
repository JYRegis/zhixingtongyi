package com.rural.education.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WxLoginRequest {
    @NotBlank(message = "code 不能为空")
    private String code;
    private String phoneCode;
    private String encryptedData;
    private String iv;
    private UserInfoDTO userInfo;

    @Data
    public static class UserInfoDTO {
        private String nickName;
        private String avatarUrl;
    }
}

