package com.rural.education.controller.admin;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.admin.UpdateAdminProfileRequest;
import com.rural.education.service.AdminService;
import com.rural.education.vo.AdminProfileVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/profile")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('0','1')")
public class AdminProfileController {
    private final AdminService adminService;

    @GetMapping("/me")
    public ApiResponse<AdminProfileVO> myProfile() {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.myProfile(operatorId));
    }

    @PutMapping("/me")
    public ApiResponse<Void> updateMyProfile(@Valid @RequestBody UpdateAdminProfileRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.updateMyProfile(operatorId, request);
        return ApiResponse.success();
    }
}
