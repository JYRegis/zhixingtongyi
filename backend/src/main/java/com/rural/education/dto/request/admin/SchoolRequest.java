package com.rural.education.dto.request.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SchoolRequest {
    @NotBlank(message = "name 不能为空")
    private String name;
    @NotBlank(message = "regionCode 不能为空")
    private String regionCode;
    @NotBlank(message = "address 不能为空")
    private String address;
    private String contactPerson;
    private String contactPhone;
    @NotNull(message = "type 不能为空")
    private Integer type;
}

