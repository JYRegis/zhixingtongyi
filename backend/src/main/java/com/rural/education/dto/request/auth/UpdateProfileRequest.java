package com.rural.education.dto.request.auth;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String username;
    private String avatar;
}
