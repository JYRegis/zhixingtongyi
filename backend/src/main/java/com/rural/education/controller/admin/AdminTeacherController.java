package com.rural.education.controller.admin;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.vo.TeacherVO;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminTeacherController {
    private final AdminService adminService;

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/teachers/pending")
    public ApiResponse<PageResponse<TeacherVO>> pendingTeachers(
            @RequestParam(required = false, defaultValue = "1") Long page,
            @RequestParam(required = false, defaultValue = "10") Long size,
            @RequestParam(required = false) Long schoolId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.pendingTeachers(operatorId, page, size, schoolId));
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/teachers/{teacherId}/profile")
    public ApiResponse<TeacherVO> teacherProfile(@PathVariable Long teacherId) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(adminService.teacherProfileDetail(operatorId, teacherId));
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('teacher_audit')")
    @PutMapping("/teachers/{teacherId}/audit")
    public ApiResponse<Void> auditTeacher(@PathVariable Long teacherId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        adminService.auditTeacher(operatorId, teacherId, request);
        return ApiResponse.success();
    }
}

