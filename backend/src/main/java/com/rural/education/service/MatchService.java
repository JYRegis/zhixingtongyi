package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.match.MatchApplyRequest;
import com.rural.education.dto.request.match.ProcessMatchRequest;
import com.rural.education.dto.request.match.UnbindConfirmRequest;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.vo.MatchPairVO;
import com.rural.education.vo.TeacherVO;


import java.util.List;

public interface MatchService extends IService<MatchPair> {
    List<TeacherVO> recommendations(Long userId);

    void apply(Long userId, MatchApplyRequest request);

    List<MatchPairVO> pendingApplications(Long userId);

    void process(Long userId, Long applicationId, ProcessMatchRequest request);

    PageResponse<MatchPairVO> myPairs(Long userId, Integer status, Long page, Long size);

    void unbindRequest(Long userId, Long pairId);

    void unbindConfirm(Long userId, Long pairId, UnbindConfirmRequest request);

    MatchPairVO unbindProgress(Long userId, Long pairId);

    MatchPairVO pairDetail(Long userId, Long pairId);

    List<MatchPairVO> pendingUnbindRequests(Long userId);
}

