package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.User;
import com.rural.education.service.AdminService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {
    private final CurrentUserUtil currentUserUtil;
    private final AdminService adminService;

    @GetMapping("/users")
    public ApiResponse<List<User>> users(
            @RequestParam(required = false) Integer role,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword
    ) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.users(operatorId, role, status, page, size, keyword));
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<User> userDetail(@PathVariable Long userId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.userDetail(operatorId, userId));
    }

    @PutMapping("/users/{userId}/status")
    public ApiResponse<Void> updateUserStatus(@PathVariable Long userId, @Valid @RequestBody UpdateUserStatusRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.updateUserStatus(operatorId, userId, request);
        return ApiResponse.success();
    }

    @PostMapping("/schools")
    public ApiResponse<Void> createSchool(@Valid @RequestBody SchoolRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.createSchool(operatorId, request);
        return ApiResponse.success();
    }

    @PostMapping("/secondary-admins")
    public ApiResponse<Void> assignSecondaryAdmin(@Valid @RequestBody SecondaryAdminRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.assignSecondaryAdmin(operatorId, request);
        return ApiResponse.success();
    }

    @PutMapping("/teachers/{teacherId}/audit")
    public ApiResponse<Void> auditTeacher(@PathVariable Long teacherId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.auditTeacher(operatorId, teacherId, request);
        return ApiResponse.success();
    }

    @PutMapping("/students/{studentId}/audit")
    public ApiResponse<Void> auditStudent(@PathVariable Long studentId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.auditStudent(operatorId, studentId, request);
        return ApiResponse.success();
    }

    @PostMapping("/students/batch-create")
    public ApiResponse<Void> batchCreateManagedStudents(@Valid @RequestBody BatchCreateStudentsRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.batchCreateManagedStudents(operatorId, request);
        return ApiResponse.success();
    }

    @GetMapping("/students/managed")
    public ApiResponse<List<ManagedStudentVO>> managedStudents() {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.managedStudents(operatorId));
    }

    @PostMapping("/students/{studentId}/switch")
    public ApiResponse<Void> switchManagedStudent(@PathVariable Long studentId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.switchManagedStudent(operatorId, studentId);
        return ApiResponse.success();
    }
}

