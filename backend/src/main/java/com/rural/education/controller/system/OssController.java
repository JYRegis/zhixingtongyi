package com.rural.education.controller.system;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.OssTokenRequest;
import com.rural.education.dto.response.OssTokenResponse;
import com.rural.education.service.OssService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/oss")
@RequiredArgsConstructor
public class OssController {

    private final OssService ossService;

    @PostMapping("/token")
    public ApiResponse<OssTokenResponse> token(@Valid @RequestBody OssTokenRequest request) {
        return ApiResponse.success(ossService.generateStsToken(request.getBusinessType()));
    }
}
