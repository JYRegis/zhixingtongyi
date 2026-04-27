package com.rural.education.controller.volunteer;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.record.StudentConfirmRequest;
import com.rural.education.dto.request.record.SubmitRecordRequest;
import com.rural.education.service.VolunteerRecordService;
import com.rural.education.utils.CurrentUserUtil;
import com.rural.education.vo.VolunteerRecordVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/volunteer-records")
@RequiredArgsConstructor
public class VolunteerRecordController {
    private final CurrentUserUtil currentUserUtil;
    private final VolunteerRecordService volunteerRecordService;

    @PostMapping
    public ApiResponse<Void> submitRecord(@Valid @RequestBody SubmitRecordRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        volunteerRecordService.submitRecord(userId, request);
        return ApiResponse.success();
    }

    @PutMapping("/{recordId}/student-confirm")
    public ApiResponse<Void> studentConfirm(@PathVariable Long recordId, @Valid @RequestBody StudentConfirmRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        volunteerRecordService.studentConfirm(userId, recordId, request);
        return ApiResponse.success();
    }

    @GetMapping
    public ApiResponse<PageResponse<VolunteerRecordVO>> queryRecords(@RequestParam(required = false) Long teacherId,
                                                                      @RequestParam(required = false) Long studentId,
                                                                      @RequestParam(required = false) Integer status,
                                                                      @RequestParam(required = false, defaultValue = "1") Long page,
                                                                      @RequestParam(required = false, defaultValue = "10") Long size) {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(PageResponse.from(
                volunteerRecordService.queryRecords(userId, teacherId, studentId, status, page, size)));
    }
}
