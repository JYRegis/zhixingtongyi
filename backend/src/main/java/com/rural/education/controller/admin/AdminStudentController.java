package com.rural.education.controller.admin;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.dto.request.admin.BatchCreateStudentsRequest;
import com.rural.education.vo.StudentVO;
import com.rural.education.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminStudentController {
    private final AdminService adminService;

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/students/pending")
    public ApiResponse<PageResponse<StudentVO>> pendingStudents(
            @RequestParam(required = false, defaultValue = "1") Long page,
            @RequestParam(required = false, defaultValue = "10") Long size,
            @RequestParam(required = false) Long schoolId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.pendingStudents(operatorId, page, size, schoolId));
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/students/{studentId}/profile")
    public ApiResponse<StudentVO> studentProfile(@PathVariable Long studentId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.studentProfileDetail(operatorId, studentId));
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @PutMapping("/students/{studentId}/audit")
    public ApiResponse<Void> auditStudent(@PathVariable Long studentId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.auditStudent(operatorId, studentId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @PostMapping("/students/batch-create")
    public ApiResponse<Void> batchCreateManagedStudents(@Valid @RequestBody BatchCreateStudentsRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.batchCreateManagedStudents(operatorId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @GetMapping("/students/managed")
    public ApiResponse<List<StudentVO>> managedStudents() {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.managedStudents(operatorId));
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @PostMapping("/students/{studentId}/switch")
    public ApiResponse<Void> switchManagedStudent(@PathVariable Long studentId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.switchManagedStudent(operatorId, studentId);
        return ApiResponse.success();
    }
}

