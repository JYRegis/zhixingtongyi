package com.rural.education.controller.system;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.system.UpdateConfigRequest;
import com.rural.education.enums.UserRole;
import com.rural.education.model.entity.SystemConfig;
import com.rural.education.model.mapper.SystemConfigMapper;
import com.rural.education.service.UserAccessService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/system")
@RequiredArgsConstructor
public class SystemConfigController {
    private final CurrentUserUtil currentUserUtil;
    private final UserAccessService userAccessService;
    private final SystemConfigMapper systemConfigMapper;

    @GetMapping("/configs")
    public ApiResponse<List<SystemConfig>> getConfigs() {
        return ApiResponse.success(systemConfigMapper.selectList(null));
    }

    @PutMapping("/configs/{key}")
    public ApiResponse<Void> updateConfig(@PathVariable String key, @Valid @RequestBody UpdateConfigRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        userAccessService.requireAnyRole(userId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());

        SystemConfig existing = systemConfigMapper.selectByKey(key);
        if (existing != null) {
            systemConfigMapper.update(null,
                    new LambdaUpdateWrapper<SystemConfig>()
                            .eq(SystemConfig::getConfigKey, key)
                            .set(SystemConfig::getConfigValue, request.getConfigValue())
                            .set(SystemConfig::getDescription, request.getDescription())
                            .set(SystemConfig::getUpdateTime, LocalDateTime.now())
            );
        } else {
            SystemConfig config = new SystemConfig();
            config.setConfigKey(key);
            config.setConfigValue(request.getConfigValue());
            config.setDescription(request.getDescription());
            config.setCreateTime(LocalDateTime.now());
            config.setUpdateTime(LocalDateTime.now());
            systemConfigMapper.insert(config);
        }
        return ApiResponse.success();
    }
}
