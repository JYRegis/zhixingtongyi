package com.rural.education.service;

import com.rural.education.dto.response.OssTokenResponse;

public interface OssService {
    OssTokenResponse generateStsToken(String businessType);
}
