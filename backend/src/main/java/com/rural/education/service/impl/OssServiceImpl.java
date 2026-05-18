package com.rural.education.service.impl;

import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.auth.sts.AssumeRoleRequest;
import com.aliyuncs.auth.sts.AssumeRoleResponse;
import com.aliyuncs.exceptions.ClientException;
import com.aliyuncs.http.MethodType;
import com.aliyuncs.profile.DefaultProfile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.config.OssConfig;
import com.rural.education.dto.response.OssTokenResponse;
import com.rural.education.enums.OssBusinessType;
import com.rural.education.exception.BusinessException;
import com.rural.education.service.OssService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OssServiceImpl implements OssService {

    private final OssConfig ossConfig;
    private final ObjectMapper objectMapper;

    @Override
    public OssTokenResponse generateStsToken(String businessType) {
        OssBusinessType type;
        try {
            type = OssBusinessType.valueOf(businessType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("无效的业务类型: " + businessType);
        }

        String dir = type.getDir() + "/" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE) + "/";

        String policy = buildPolicy(ossConfig.getBucketName(), dir);

        DefaultProfile profile = DefaultProfile.getProfile(
                ossConfig.getStsRegionId(),
                ossConfig.getAccessKeyId(),
                ossConfig.getAccessKeySecret()
        );
        DefaultAcsClient client = new DefaultAcsClient(profile);

        AssumeRoleRequest request = new AssumeRoleRequest();
        request.setSysMethod(MethodType.POST);
        request.setRoleArn(ossConfig.getRoleArn());
        request.setRoleSessionName(ossConfig.getRoleSessionName());
        request.setPolicy(policy);
        request.setDurationSeconds(ossConfig.getDurationSeconds());

        try {
            AssumeRoleResponse response = client.getAcsResponse(request);
            AssumeRoleResponse.Credentials credentials = response.getCredentials();

            return OssTokenResponse.builder()
                    .accessKeyId(credentials.getAccessKeyId())
                    .accessKeySecret(credentials.getAccessKeySecret())
                    .securityToken(credentials.getSecurityToken())
                    .expiration(credentials.getExpiration())
                    .bucket(ossConfig.getBucketName())
                    .endpoint(ossConfig.getEndpoint())
                    .dir(dir)
                    .build();
        } catch (ClientException e) {
            throw new BusinessException("获取 STS 凭证失败: " + e.getMessage());
        }
    }

    private String buildPolicy(String bucket, String dir) {
        try {
            Map<String, Object> statement = new LinkedHashMap<>();
            statement.put("Effect", "Allow");
            statement.put("Action", List.of("oss:PutObject", "oss:GetObject"));
            statement.put("Resource", List.of("acs:oss:*:*:" + bucket + "/" + dir + "*"));

            Map<String, Object> policy = new LinkedHashMap<>();
            policy.put("Version", "1");
            policy.put("Statement", List.of(statement));

            return objectMapper.writeValueAsString(policy);
        } catch (Exception e) {
            throw new BusinessException("构建 OSS 策略失败");
        }
    }
}
