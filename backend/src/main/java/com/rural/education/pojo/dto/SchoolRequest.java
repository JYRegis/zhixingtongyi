package com.rural.education.pojo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SchoolRequest {
    @NotBlank(message = "name 不能为空")
    private String name;
    @NotBlank(message = "regionCode 不能为空")
    private String regionCode;
    @NotBlank(message = "address 不能为空")
    private String address;
    @NotBlank(message = "contactPerson 不能为空")
    private String contactPerson;
    @NotBlank(message = "contactPhone 不能为空")
    private String contactPhone;
}

