package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.MatchPair;

import java.util.List;

public interface MatchService extends IService<MatchPair> {
    List<TeacherRecommendationVO> recommendations(Long userId);

    void apply(Long userId, ApplyRequest request);

    List<PendingApplicationVO> pendingApplications(Long userId);

    void process(Long userId, Long applicationId, ProcessRequest request);

    List<PairDetailVO> myPairs(Long userId, Integer status);

    void unbindRequest(Long userId, Long pairId);

    void unbindConfirm(Long userId, Long pairId, UnbindConfirmRequest request);

    UnbindProgressVO unbindProgress(Long userId, Long pairId);

    PairDetailVO pairDetail(Long userId, Long pairId);
}

