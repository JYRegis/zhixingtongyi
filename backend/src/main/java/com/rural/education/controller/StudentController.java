package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.service.StudentService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentController {
    private final CurrentUserUtil currentUserUtil;
    private final StudentService studentService;

    @PostMapping("/profile")
    public ApiResponse<Void> saveDraft(@Valid @RequestBody StudentProfileRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        studentService.saveDraft(userId, request);
        return ApiResponse.success();
    }

    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody StudentProfileRequest request) {
        return saveDraft(request);
    }

    @PostMapping("/profile/submit")
    public ApiResponse<Void> submitProfile() {
        Long userId = currentUserUtil.getCurrentUserId();
        studentService.submitProfile(userId);
        return ApiResponse.success();
    }

    @GetMapping("/profile")
    public ApiResponse<StudentProfileVO> getProfile() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(studentService.getProfile(userId));
    }
}

