package com.rural.education.dto.request.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

@Data
public class SecondaryAdminRequest {
    /** userId 与 phone 二选一即可。优先 userId；只传 phone 时后端会按手机号查找或创建用户 */
    private Long userId;
    @Pattern(regexp = "^$|^1\\d{10}$", message = "手机号格式错误")
    private String phone;
    private String realName;
    @NotNull(message = "schoolId 不能为空")
    private Long schoolId;
    private String regionCode;
    @NotEmpty(message = "permissions 不能为空")
    private List<String> permissions;
}

