package com.rural.education.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OssTokenResponse {
    private String accessKeyId;
    private String accessKeySecret;
    private String securityToken;
    private String expiration;
    private String bucket;
    private String endpoint;
    private String dir;
}
