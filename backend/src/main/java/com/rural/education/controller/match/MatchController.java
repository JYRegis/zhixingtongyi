package com.rural.education.controller.match;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.match.MatchApplyRequest;
import com.rural.education.dto.request.match.ProcessMatchRequest;
import com.rural.education.dto.request.match.UnbindConfirmRequest;
import com.rural.education.vo.MatchPairVO;
import com.rural.education.vo.TeacherVO;
import com.rural.education.service.MatchService;
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

import java.util.List;

@RestController
@RequestMapping("/match")
@RequiredArgsConstructor
public class MatchController {
    private final MatchService matchService;

    @PreAuthorize("hasRole('3')")
    @GetMapping("/recommendations")
    public ApiResponse<List<TeacherVO>> recommendations() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.recommendations(userId));
    }

    @PreAuthorize("hasRole('3')")
    @PostMapping("/apply")
    public ApiResponse<Void> apply(@Valid @RequestBody MatchApplyRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        matchService.apply(userId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('2')")
    @GetMapping("/pending-applications")
    public ApiResponse<List<MatchPairVO>> pendingApplications() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.pendingApplications(userId));
    }

    @PreAuthorize("hasRole('2')")
    @PutMapping("/application/{applicationId}/process")
    public ApiResponse<Void> process(@PathVariable Long applicationId, @Valid @RequestBody ProcessMatchRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        matchService.process(userId, applicationId, request);
        return ApiResponse.success();
    }

    @GetMapping("/my-pairs")
    public ApiResponse<PageResponse<MatchPairVO>> myPairs(@RequestParam(required = false) Integer status,
                                                          @RequestParam(required = false) Long page,
                                                          @RequestParam(required = false) Long size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.myPairs(userId, status, page, size));
    }

    @PostMapping("/{pairId}/unbind-request")
    public ApiResponse<Void> unbindRequest(@PathVariable Long pairId) {
        Long userId = SecurityUtils.getCurrentUserId();
        matchService.unbindRequest(userId, pairId);
        return ApiResponse.success();
    }

    @PutMapping("/{pairId}/unbind-confirm")
    public ApiResponse<Void> unbindConfirm(@PathVariable Long pairId, @Valid @RequestBody UnbindConfirmRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        matchService.unbindConfirm(userId, pairId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping("/unbind-requests/pending")
    public ApiResponse<List<MatchPairVO>> pendingUnbindRequests() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.pendingUnbindRequests(userId));
    }

    @GetMapping("/{pairId}/unbind-progress")
    public ApiResponse<MatchPairVO> unbindProgress(@PathVariable Long pairId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.unbindProgress(userId, pairId));
    }

    @GetMapping("/{pairId}")
    public ApiResponse<MatchPairVO> pairDetail(@PathVariable Long pairId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(matchService.pairDetail(userId, pairId));
    }
}

