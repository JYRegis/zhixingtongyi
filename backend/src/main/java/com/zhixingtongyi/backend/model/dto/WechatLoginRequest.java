package com.zhixingtongyi.backend.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WechatLoginRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 4, max = 20, message = "用户名长度必须在 4 到 20 个字符之间")
    private String username;

    @NotBlank(message = "头像不能为空")
    private String avatar;

    @NotBlank(message = "code不能为空")
    private String code;
}
