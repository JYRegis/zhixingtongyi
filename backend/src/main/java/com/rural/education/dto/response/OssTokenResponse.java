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
    private String policy;
    private String signature;
    private String bucket;
    private String endpoint;
    private String dir;
    /** OSS 上传地址（前端直接用） */
    private String host;
}
