package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.dto.request.admin.BatchCreateStudentsRequest;
import com.rural.education.vo.StudentVO;
import com.rural.education.service.AdminService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminStudentController {
    private final CurrentUserUtil currentUserUtil;
    private final AdminService adminService;

    @GetMapping("/students/pending")
    public ApiResponse<PageResponse<StudentVO>> pendingStudents(
            @RequestParam(required = false, defaultValue = "1") Long page,
            @RequestParam(required = false, defaultValue = "10") Long size,
            @RequestParam(required = false) Long schoolId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.pendingStudents(operatorId, page, size, schoolId));
    }

    @GetMapping("/students/{studentId}/profile")
    public ApiResponse<StudentVO> studentProfile(@PathVariable Long studentId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.studentProfileDetail(operatorId, studentId));
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
    public ApiResponse<List<StudentVO>> managedStudents() {
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

