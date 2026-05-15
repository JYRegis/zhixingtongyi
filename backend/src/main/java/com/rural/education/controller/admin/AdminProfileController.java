package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.service.AdminService;
import com.rural.education.utils.CurrentUserUtil;
import com.rural.education.vo.AdminProfileVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/profile")
@RequiredArgsConstructor
public class AdminProfileController {
    private final CurrentUserUtil currentUserUtil;
    private final AdminService adminService;

    @GetMapping("/me")
    public ApiResponse<AdminProfileVO> myProfile() {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.myProfile(operatorId));
    }
}
