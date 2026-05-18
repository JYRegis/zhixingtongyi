package com.rural.education.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OssConfig {

    @Value("${aliyun.oss.endpoint}")
    private String endpoint;

    @Value("${aliyun.oss.access-key-id}")
    private String accessKeyId;

    @Value("${aliyun.oss.access-key-secret}")
    private String accessKeySecret;

    @Value("${aliyun.oss.bucket-name}")
    private String bucketName;

    @Value("${aliyun.oss.sts.region-id:cn-beijing}")
    private String stsRegionId;

    @Value("${aliyun.oss.sts.role-arn}")
    private String roleArn;

    @Value("${aliyun.oss.sts.role-session-name:ztysession}")
    private String roleSessionName;

    @Value("${aliyun.oss.sts.duration-seconds:900}")
    private Long durationSeconds;

    public String getEndpoint() {
        return endpoint;
    }

    public String getBucketName() {
        return bucketName;
    }

    public String getStsRegionId() {
        return stsRegionId;
    }

    public String getRoleArn() {
        return roleArn;
    }

    public String getRoleSessionName() {
        return roleSessionName;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public String getAccessKeySecret() {
        return accessKeySecret;
    }
}
