package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.record.AdminAuditRecordRequest;
import com.rural.education.service.VolunteerRecordService;
import com.rural.education.utils.CurrentUserUtil;
import com.rural.education.vo.VolunteerRecordVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/volunteer-records")
@RequiredArgsConstructor
public class AdminRecordController {
    private final CurrentUserUtil currentUserUtil;
    private final VolunteerRecordService volunteerRecordService;

    @GetMapping("/pending")
    public ApiResponse<PageResponse<VolunteerRecordVO>> pending(@RequestParam(required = false) Long schoolId,
                                                                 @RequestParam(required = false) String regionCode,
                                                                 @RequestParam(required = false, defaultValue = "1") Long page,
                                                                 @RequestParam(required = false, defaultValue = "10") Long size) {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(PageResponse.from(
                volunteerRecordService.getPendingRecords(userId, schoolId, regionCode, page, size)));
    }

    @PutMapping("/{recordId}/audit")
    public ApiResponse<Void> audit(@PathVariable Long recordId, @Valid @RequestBody AdminAuditRecordRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        volunteerRecordService.auditRecord(userId, recordId, request);
        return ApiResponse.success();
    }
}
