package com.rural.education.controller.student;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.student.StudentProfileRequest;
import com.rural.education.vo.StudentVO;
import com.rural.education.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
@PreAuthorize("hasRole('3')")
public class StudentProfileController {
    private final StudentService studentService;

    @PostMapping("/profile")
    public ApiResponse<Void> saveDraft(@Valid @RequestBody StudentProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        studentService.saveDraft(userId, request);
        return ApiResponse.success();
    }

    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody StudentProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        studentService.updateProfile(userId, request);
        return ApiResponse.success();
    }

    @PostMapping("/profile/submit")
    public ApiResponse<Void> submitProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        studentService.submitProfile(userId);
        return ApiResponse.success();
    }

    @GetMapping("/profile")
    public ApiResponse<StudentVO> getProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(studentService.getProfile(userId));
    }
}

