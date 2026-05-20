package com.rural.education.service.impl;

import com.rural.education.config.OssConfig;
import com.rural.education.dto.response.OssTokenResponse;
import com.rural.education.enums.OssBusinessType;
import com.rural.education.exception.BusinessException;
import com.rural.education.service.OssService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * OSS 服务端签名直传实现。
 * 使用 AccessKey 生成 PostObject 所需的 policy + signature，
 * 前端拿到后直接上传到 OSS，不需要 STS/RAM 角色。
 */
@Service
@RequiredArgsConstructor
public class OssServiceImpl implements OssService {

    private final OssConfig ossConfig;

    /** 签名有效期（秒） */
    private static final long EXPIRE_SECONDS = 300; // 5 分钟

    @Override
    public OssTokenResponse generateStsToken(String businessType) {
        OssBusinessType type;
        try {
            type = OssBusinessType.valueOf(businessType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("无效的业务类型: " + businessType);
        }

        String dir = type.getDir() + "/" + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE) + "/";
        String host = "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint();

        // 计算过期时间（ISO 8601 UTC）
        Instant expireAt = Instant.now().plusSeconds(EXPIRE_SECONDS);
        String expiration = expireAt.atOffset(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

        // 构建 policy JSON
        String policyJson = "{\"expiration\":\"" + expiration + "\","
                + "\"conditions\":["
                + "[\"content-length-range\",0,104857600],"  // 最大 100MB
                + "[\"starts-with\",\"$key\",\"" + dir + "\"]"
                + "]}";

        // Base64 编码 policy
        String policyBase64 = Base64.getEncoder().encodeToString(
                policyJson.getBytes(StandardCharsets.UTF_8));

        // HMAC-SHA1 签名
        String signature = hmacSha1(ossConfig.getAccessKeySecret(), policyBase64);

        return OssTokenResponse.builder()
                .accessKeyId(ossConfig.getAccessKeyId())
                .policy(policyBase64)
                .signature(signature)
                .bucket(ossConfig.getBucketName())
                .endpoint(ossConfig.getEndpoint())
                .dir(dir)
                .host(host)
                .build();
    }

    private String hmacSha1(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new BusinessException("签名计算失败: " + e.getMessage());
        }
    }
}
