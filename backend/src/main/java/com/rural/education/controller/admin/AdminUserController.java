package com.rural.education.controller.admin;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.admin.SchoolRequest;
import com.rural.education.dto.request.admin.SecondaryAdminRequest;
import com.rural.education.dto.request.admin.UpdateUserStatusRequest;
import com.rural.education.model.entity.User;
import com.rural.education.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminService adminService;

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/users")
    public ApiResponse<PageResponse<User>> users(
            @RequestParam(required = false) Integer role,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword
    ) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.users(operatorId, role, status, page, size, keyword));
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/users/{userId}")
    public ApiResponse<User> userDetail(@PathVariable Long userId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.userDetail(operatorId, userId));
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @PutMapping("/users/{userId}/status")
    public ApiResponse<Void> updateUserStatus(@PathVariable Long userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.updateUserStatus(operatorId, userId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0')")
    @PostMapping("/schools")
    public ApiResponse<Void> createSchool(@Valid @RequestBody SchoolRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.createSchool(operatorId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0')")
    @PostMapping("/secondary-admins")
    public ApiResponse<Void> assignSecondaryAdmin(@Valid @RequestBody SecondaryAdminRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.assignSecondaryAdmin(operatorId, request);
        return ApiResponse.success();
    }
}

