package com.rural.education.controller.student;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.student.StudentProfileRequest;
import com.rural.education.vo.StudentVO;
import com.rural.education.service.StudentService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentProfileController {
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
    public ApiResponse<StudentVO> getProfile() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(studentService.getProfile(userId));
    }
}

