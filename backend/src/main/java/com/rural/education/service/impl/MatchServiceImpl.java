package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.enums.MatchStatus;
import com.rural.education.enums.NotificationType;
import com.rural.education.enums.ProfileStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.AlgorithmWeightConfigMapper;
import org.springframework.dao.DuplicateKeyException;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.dto.request.match.MatchApplyRequest;
import com.rural.education.dto.request.match.ProcessMatchRequest;
import com.rural.education.dto.request.match.UnbindConfirmRequest;
import com.rural.education.model.entity.AlgorithmWeightConfig;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.User;
import com.rural.education.vo.MatchPairVO;
import com.rural.education.vo.TeacherVO;
import com.rural.education.service.MatchService;
import com.rural.education.service.NotificationAsyncPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MatchServiceImpl extends ServiceImpl<MatchPairMapper, MatchPair> implements MatchService {
    private static final long RECOMMENDATION_CACHE_TTL_MINUTES = 5L;
    private final MatchPairMapper matchPairMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final AlgorithmWeightConfigMapper algorithmWeightConfigMapper;
    private final UserMapper userMapper;
    private final com.rural.education.model.mapper.ChatParticipantMapper chatParticipantMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final NotificationAsyncPublisher notificationAsyncPublisher;

    @Override
    public List<TeacherVO> recommendations(Long userId) {
        String cacheKey = "match:recommendations:student:" + userId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<List<TeacherVO>>() {});
            } catch (Exception ignore) {
            }
        }

        StudentProfile student = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (student == null) {
            throw new BusinessException("请先完善学生资料");
        }

        List<AlgorithmWeightConfig> weights = algorithmWeightConfigMapper.selectList(
                new LambdaQueryWrapper<AlgorithmWeightConfig>().eq(AlgorithmWeightConfig::getEnabled, 1)
        );
        double subjectWeight = getWeight(weights, "subject_match", 0.40);
        double timeWeight = getWeight(weights, "time_match", 0.60);

        List<String> studentSubjects = parseJsonList(student.getSubjectsNeeded());
        Set<String> studentTimeSlots = extractTimeSlots(parseFreeTime(student.getFreeTime()));

        List<TeacherVO> list = teacherProfileMapper.selectRecommendations();
        for (TeacherVO t : list) {
            if (t.getSkilledSubjects() == null && t.getSkilledSubjectsRaw() != null) {
                try {
                    t.setSkilledSubjects(objectMapper.readValue(t.getSkilledSubjectsRaw(),
                            new TypeReference<List<Object>>() {}));
                } catch (Exception e) {
                    t.setSkilledSubjects(List.of());
                }
            }
            if (t.getFreeTime() == null && t.getFreeTimeRaw() != null) {
                t.setFreeTime(parseFreeTime(t.getFreeTimeRaw()));
            }

            List<String> teacherSubjects = parseJsonListFromObj(t.getSkilledSubjects());
            Set<String> teacherTimeSlots = extractTimeSlots(parseFreeTimeFromObj(t.getFreeTime()));

            double subjectScore = studentSubjects.isEmpty() ? 0.0
                    : computeOverlapRatio(studentSubjects, teacherSubjects);
            double timeScore = studentTimeSlots.isEmpty() ? 0.0
                    : computeSetOverlap(studentTimeSlots, teacherTimeSlots);

            t.setMatchScore((subjectWeight * subjectScore + timeWeight * timeScore) * 100);
        }

        list.sort((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()));

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(list),
                    RECOMMENDATION_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception ignore) {
        }
        return list;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void apply(Long userId, MatchApplyRequest request) {
        User teacher = userMapper.selectById(request.getTeacherId());
        if (teacher == null || !Integer.valueOf(UserRole.TEACHER.getCode()).equals(teacher.getRole()) || !Integer.valueOf(UserStatus.ENABLED.getCode()).equals(teacher.getStatus())) {
            throw new BusinessException("目标志愿者不存在或不可用");
        }
        StudentProfile profile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (profile == null) {
            throw new BusinessException("请先完善并提交学生资料");
        }
        if (!Integer.valueOf(ProfileStatus.READY.getCode()).equals(profile.getProfileStatus()) ||
                profile.getGrade() == null ||
                profile.getSubjectsNeeded() == null ||
                profile.getFreeTime() == null) {
            throw new BusinessException("学生资料需处于 READY_FOR_MATCH 且必填项完整");
        }
        Long existed = matchPairMapper.selectCount(
                new LambdaQueryWrapper<MatchPair>()
                        .eq(MatchPair::getStudentId, userId)
                        .eq(MatchPair::getTeacherId, request.getTeacherId())
                        .in(MatchPair::getMatchStatus, MatchStatus.APPLIED.getCode(), MatchStatus.ACCEPTED.getCode(), MatchStatus.UNBIND_CONFIRMING.getCode())
        );
        if (existed > 0) {
            throw new BusinessException("已存在待处理或生效中的结对关系");
        }
        MatchPair pair = new MatchPair();
        pair.setStudentId(userId);
        pair.setTeacherId(request.getTeacherId());
        pair.setMatchStatus(MatchStatus.APPLIED.getCode());
        pair.setApplyTime(LocalDateTime.now());
        try {
            matchPairMapper.insert(pair);
        } catch (DuplicateKeyException e) {
            MatchPair existing = matchPairMapper.selectOne(
                    new LambdaQueryWrapper<MatchPair>()
                            .eq(MatchPair::getStudentId, userId)
                            .eq(MatchPair::getTeacherId, request.getTeacherId())
                            .orderByDesc(MatchPair::getId)
                            .last("LIMIT 1")
            );
            if (existing != null && existing.getMatchStatus() != null
                    && existing.getMatchStatus().intValue() == MatchStatus.APPLIED.getCode()) {
                throw new BusinessException("已存在待处理的申请，请勿重复操作");
            } else if (existing != null && existing.getMatchStatus() != null
                    && existing.getMatchStatus().intValue() == MatchStatus.ACCEPTED.getCode()) {
                throw new BusinessException("已存在生效中的结对关系");
            }
            throw new BusinessException("已存在相关的结对记录");
        }
        NotificationEvent event = new NotificationEvent();
        event.setUserId(request.getTeacherId());
        event.setType(NotificationType.MATCH_APPLY.getCode());
        event.setTitle("新的结对申请");
        event.setContent("你收到了新的学生结对申请");
        Map<String, Object> applyParams = new HashMap<>();
        applyParams.put("studentId", userId);
        try {
            event.setParamsJson(objectMapper.writeValueAsString(applyParams));
        } catch (Exception e) {
            throw new BusinessException("参数序列化失败");
        }
        notificationAsyncPublisher.publishAfterCommit(event);
        evictRecommendationCache(userId);
    }

    @Override
    public List<MatchPairVO> pendingApplications(Long userId) {
        return matchPairMapper.selectPendingApplications(userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void process(Long userId, Long applicationId, ProcessMatchRequest request) {
        MatchPair pair = matchPairMapper.selectOne(
                new LambdaQueryWrapper<MatchPair>()
                        .eq(MatchPair::getId, applicationId)
                        .eq(MatchPair::getTeacherId, userId)
        );
        if (pair == null) {
            throw new BusinessException("申请不存在");
        }
        if (!Integer.valueOf(MatchStatus.APPLIED.getCode()).equals(pair.getMatchStatus())) {
            throw new BusinessException("仅待处理申请可审核");
        }
        Long studentId = pair.getStudentId();
        if ("accept".equalsIgnoreCase(request.getAction())) {
            int updated = matchPairMapper.update(
                    null,
                    new LambdaUpdateWrapper<MatchPair>()
                            .eq(MatchPair::getId, applicationId)
                            .eq(MatchPair::getMatchStatus, MatchStatus.APPLIED.getCode())
                            .set(MatchPair::getMatchStatus, MatchStatus.ACCEPTED.getCode())
                            .set(MatchPair::getAcceptTime, LocalDateTime.now())
            );
            if (updated == 0) {
                throw new BusinessException("该申请已被处理");
            }
            initChatParticipants(applicationId, pair.getStudentId(), pair.getTeacherId());

            NotificationEvent event = new NotificationEvent();
            event.setUserId(studentId);
            event.setType(NotificationType.MATCH_ACCEPT.getCode());
            event.setTitle("结对申请已通过");
            event.setContent("志愿者已通过你的结对申请");
            Map<String, Object> acceptParams = new HashMap<>();
            acceptParams.put("applicationId", applicationId);
            try {
                event.setParamsJson(objectMapper.writeValueAsString(acceptParams));
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            notificationAsyncPublisher.publishAfterCommit(event);
        } else {
            int updated = matchPairMapper.update(
                    null,
                    new LambdaUpdateWrapper<MatchPair>()
                            .eq(MatchPair::getId, applicationId)
                            .eq(MatchPair::getMatchStatus, MatchStatus.APPLIED.getCode())
                            .set(MatchPair::getMatchStatus, MatchStatus.REJECTED.getCode())
                            .set(MatchPair::getRejectReason, request.getReason())
            );
            if (updated == 0) {
                throw new BusinessException("该申请已被处理");
            }
            NotificationEvent event = new NotificationEvent();
            event.setUserId(studentId);
            event.setType(NotificationType.MATCH_REJECT.getCode());
            event.setTitle("结对申请被拒绝");
            event.setContent(request.getReason() == null ? "志愿者拒绝了你的申请" : request.getReason());
            Map<String, Object> rejectParams = new HashMap<>();
            rejectParams.put("applicationId", applicationId);
            try {
                event.setParamsJson(objectMapper.writeValueAsString(rejectParams));
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            notificationAsyncPublisher.publishAfterCommit(event);
        }
        evictRecommendationCache(studentId);
    }

    @Override
    public PageResponse<MatchPairVO> myPairs(Long userId, Integer status, Long page, Long size) {
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        if (role == null || (role != UserRole.TEACHER.getCode() && role != UserRole.STUDENT.getCode())) {
            throw new BusinessException("无权限操作");
        }
        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);
        LambdaQueryWrapper<MatchPair> wrapper = new LambdaQueryWrapper<>();
        if (role == UserRole.TEACHER.getCode()) {
            wrapper.eq(MatchPair::getTeacherId, userId);
        } else {
            wrapper.eq(MatchPair::getStudentId, userId);
        }
        if (status != null) {
            wrapper.eq(MatchPair::getMatchStatus, status);
        }
        wrapper.orderByDesc(MatchPair::getId);
        Page<MatchPair> mpPage = new Page<>(current, pageSize);
        Page<MatchPair> result = matchPairMapper.selectPage(mpPage, wrapper);
        List<MatchPairVO> vos = result.getRecords().stream()
                .map(pair -> {
                    MatchPairVO vo = new MatchPairVO();
                    vo.setId(pair.getId());
                    vo.setPairId(pair.getId());
                    vo.setStudentId(pair.getStudentId());
                    vo.setTeacherId(pair.getTeacherId());
                    vo.setMatchStatus(pair.getMatchStatus());
                    vo.setApplyTime(pair.getApplyTime());
                    vo.setAcceptTime(pair.getAcceptTime());
                    vo.setRejectReason(pair.getRejectReason());
                    vo.setUnbindRequestTime(pair.getUnbindRequestTime());
                    vo.setUnbindAcceptTime(pair.getUnbindAcceptTime());
                    vo.setUnbindRejectReason(pair.getUnbindRejectReason());
                    return vo;
                })
                .toList();
        fillPairNamesBatch(vos);
        PageResponse<MatchPairVO> response = new PageResponse<>();
        response.setRecords(vos);
        response.setCurrent(current);
        response.setSize(pageSize);
        response.setTotal(result.getTotal());
        response.setPages(result.getPages());
        return response;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbindRequest(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        Integer status = pair.getMatchStatus();
        if (!Integer.valueOf(MatchStatus.ACCEPTED.getCode()).equals(status)
                && !Integer.valueOf(MatchStatus.UNBIND_REJECTED.getCode()).equals(status)) {
            throw new BusinessException("仅生效中或解绑已拒绝的结对可发起解绑");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, studentId)
        );
        Long adminId = studentProfile == null ? null : studentProfile.getBindAdminId();
        if (!userId.equals(studentId) && !userId.equals(teacherId)
                && (adminId == null || !userId.equals(adminId))) {
            throw new BusinessException("仅结对双方或对应二级管理员可发起解绑");
        }
        LambdaUpdateWrapper<MatchPair> wrapper = new LambdaUpdateWrapper<MatchPair>()
                .eq(MatchPair::getId, pairId)
                .set(MatchPair::getMatchStatus, MatchStatus.UNBIND_CONFIRMING.getCode())
                .set(MatchPair::getUnbindRequestBy, userId)
                .set(MatchPair::getUnbindRequestTime, LocalDateTime.now())
                .set(MatchPair::getUnbindRejectBy, null)
                .set(MatchPair::getUnbindRejectReason, null)
                .set(MatchPair::getUnbindRejectTime, null)
                .set(MatchPair::getUnbindAdminId, adminId);

        // Auto-confirm the initiator
        if (userId.equals(studentId)) {
            wrapper.set(MatchPair::getStudentUnbindConfirm, MatchPair.CONFIRMED)
                   .set(MatchPair::getStudentUnbindConfirmTime, LocalDateTime.now())
                   .set(MatchPair::getTeacherUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getTeacherUnbindConfirmTime, null)
                   .set(MatchPair::getAdminUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getAdminUnbindConfirmTime, null);
        } else if (userId.equals(teacherId)) {
            wrapper.set(MatchPair::getStudentUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getStudentUnbindConfirmTime, null)
                   .set(MatchPair::getTeacherUnbindConfirm, MatchPair.CONFIRMED)
                   .set(MatchPair::getTeacherUnbindConfirmTime, LocalDateTime.now())
                   .set(MatchPair::getAdminUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getAdminUnbindConfirmTime, null);
        } else {
            wrapper.set(MatchPair::getStudentUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getStudentUnbindConfirmTime, null)
                   .set(MatchPair::getTeacherUnbindConfirm, MatchPair.UNCONFIRMED)
                   .set(MatchPair::getTeacherUnbindConfirmTime, null)
                   .set(MatchPair::getAdminUnbindConfirm, MatchPair.CONFIRMED)
                   .set(MatchPair::getAdminUnbindConfirmTime, LocalDateTime.now());
        }

        matchPairMapper.update(null, wrapper);

        Map<String, Object> unbindParams = new HashMap<>();
        unbindParams.put("pairId", pairId);
        String paramsJson;
        try {
            paramsJson = objectMapper.writeValueAsString(unbindParams);
        } catch (Exception e) {
            throw new BusinessException("参数序列化失败");
        }
        Integer type = NotificationType.UNBIND_APPLY.getCode();
        String title = "解绑申请";
        String content = "结对关系有新的解绑申请，请确认";
        if (!userId.equals(studentId)) {
            publishNotification(studentId, type, title, content, paramsJson);
        }
        if (!userId.equals(teacherId)) {
            publishNotification(teacherId, type, title, content, paramsJson);
        }
        if (adminId != null && !userId.equals(adminId)) {
            publishNotification(adminId, type, title, content, paramsJson);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbindConfirm(Long userId, Long pairId, UnbindConfirmRequest request) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        if (!Integer.valueOf(MatchStatus.UNBIND_CONFIRMING.getCode()).equals(pair.getMatchStatus())
                && !Integer.valueOf(MatchStatus.UNBIND_REJECTED.getCode()).equals(pair.getMatchStatus())) {
            throw new BusinessException("当前状态不允许解绑确认");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        validateUnbindActor(request.getRole(), userId, studentId, teacherId, adminId);
        if ("reject".equalsIgnoreCase(request.getAction())) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("rejectReason 必填");
            }
            matchPairMapper.update(
                    null,
                    new LambdaUpdateWrapper<MatchPair>()
                            .eq(MatchPair::getId, pairId)
                            .set(MatchPair::getMatchStatus, MatchStatus.UNBIND_REJECTED.getCode())
                            .set(MatchPair::getUnbindRejectBy, userId)
                            .set(MatchPair::getUnbindRejectReason, request.getRejectReason())
                            .set(MatchPair::getUnbindRejectTime, LocalDateTime.now())
            );

            Map<String, Object> rejectUnbindParams = new HashMap<>();
            rejectUnbindParams.put("pairId", pairId);
            String paramsJson;
            try {
                paramsJson = objectMapper.writeValueAsString(rejectUnbindParams);
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            Integer type = NotificationType.UNBIND_APPLY.getCode();
            String title = "解绑申请被拒绝";
            String content = "解绑申请已被拒绝，原因: " + request.getRejectReason();
            Long unbindRequester = pair.getUnbindRequestBy();
            if (unbindRequester != null && !unbindRequester.equals(userId)) {
                publishNotification(unbindRequester, type, title, content, paramsJson);
            }
            for (Long uid : new Long[]{studentId, teacherId, adminId}) {
                if (uid != null && !uid.equals(userId) && !uid.equals(unbindRequester)) {
                    publishNotification(uid, type, title, content, paramsJson);
                }
            }
            return;
        }
        if ("STUDENT".equalsIgnoreCase(request.getRole())) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getStudentUnbindConfirm, MatchPair.CONFIRMED).set(MatchPair::getStudentUnbindConfirmTime, LocalDateTime.now()));
        } else if ("TEACHER".equalsIgnoreCase(request.getRole())) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getTeacherUnbindConfirm, MatchPair.CONFIRMED).set(MatchPair::getTeacherUnbindConfirmTime, LocalDateTime.now()));
        } else {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getAdminUnbindConfirm, MatchPair.CONFIRMED).set(MatchPair::getAdminUnbindConfirmTime, LocalDateTime.now()));
        }
        MatchPair now = matchPairMapper.selectById(pairId);
        boolean done = MatchPair.CONFIRMED.equals(now.getStudentUnbindConfirm())
                && MatchPair.CONFIRMED.equals(now.getTeacherUnbindConfirm())
                && MatchPair.CONFIRMED.equals(now.getAdminUnbindConfirm());
        if (done) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getMatchStatus, MatchStatus.UNBOUND.getCode()).set(MatchPair::getUnbindAcceptTime, LocalDateTime.now()));

            Map<String, Object> doneParams = new HashMap<>();
            doneParams.put("pairId", pairId);
            String paramsJson;
            try {
                paramsJson = objectMapper.writeValueAsString(doneParams);
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            Integer type = NotificationType.UNBIND_ACCEPT.getCode();
            String title = "解绑完成";
            String content = "结对关系已解除";
            for (Long uid : new Long[]{studentId, teacherId, adminId}) {
                if (uid != null) {
                    publishNotification(uid, type, title, content, paramsJson);
                }
            }
        }
    }

    @Override
    public MatchPairVO unbindProgress(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        if (!userId.equals(studentId) && !userId.equals(teacherId) && (adminId == null || !userId.equals(adminId))) {
            throw new BusinessException("无权查看解绑进度");
        }
        MatchPairVO vo = new MatchPairVO();
        vo.setPairId(pair.getId());
        vo.setStudentId(pair.getStudentId());
        vo.setTeacherId(pair.getTeacherId());
        vo.setMatchStatus(pair.getMatchStatus());
        vo.setUnbindRequestBy(pair.getUnbindRequestBy());
        vo.setUnbindRequestTime(pair.getUnbindRequestTime());
        vo.setStudentUnbindConfirm(pair.getStudentUnbindConfirm());
        vo.setTeacherUnbindConfirm(pair.getTeacherUnbindConfirm());
        vo.setAdminUnbindConfirm(pair.getAdminUnbindConfirm());
        vo.setStudentUnbindConfirmTime(pair.getStudentUnbindConfirmTime());
        vo.setTeacherUnbindConfirmTime(pair.getTeacherUnbindConfirmTime());
        vo.setAdminUnbindConfirmTime(pair.getAdminUnbindConfirmTime());
        vo.setUnbindRejectBy(pair.getUnbindRejectBy());
        vo.setUnbindRejectReason(pair.getUnbindRejectReason());
        vo.setUnbindRejectTime(pair.getUnbindRejectTime());
        fillPairNames(vo);
        return vo;
    }

    @Override
    public MatchPairVO pairDetail(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        User user = userMapper.selectById(userId);
        Integer userRole = user == null ? null : user.getRole();
        if (!userId.equals(studentId) && !userId.equals(teacherId) && !Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(userRole) && (adminId == null || !userId.equals(adminId))) {
            throw new BusinessException("无权查看结对详情");
        }
        MatchPairVO vo = new MatchPairVO();
        vo.setId(pair.getId());
        vo.setPairId(pair.getId());
        vo.setStudentId(pair.getStudentId());
        vo.setTeacherId(pair.getTeacherId());
        vo.setMatchStatus(pair.getMatchStatus());
        vo.setApplyTime(pair.getApplyTime());
        vo.setAcceptTime(pair.getAcceptTime());
        vo.setRejectReason(pair.getRejectReason());
        vo.setUnbindRequestBy(pair.getUnbindRequestBy());
        vo.setUnbindRequestTime(pair.getUnbindRequestTime());
        vo.setUnbindAcceptTime(pair.getUnbindAcceptTime());
        vo.setUnbindRejectReason(pair.getUnbindRejectReason());
        vo.setStudentUnbindConfirm(pair.getStudentUnbindConfirm());
        vo.setTeacherUnbindConfirm(pair.getTeacherUnbindConfirm());
        vo.setAdminUnbindConfirm(pair.getAdminUnbindConfirm());
        vo.setStudentUnbindConfirmTime(pair.getStudentUnbindConfirmTime());
        vo.setTeacherUnbindConfirmTime(pair.getTeacherUnbindConfirmTime());
        vo.setAdminUnbindConfirmTime(pair.getAdminUnbindConfirmTime());
        vo.setUnbindRejectBy(pair.getUnbindRejectBy());
        vo.setUnbindRejectTime(pair.getUnbindRejectTime());
        fillPairNames(vo);
        return vo;
    }

    private void validateUnbindActor(String role, Long userId, Long studentId, Long teacherId, Long adminId) {
        if ("STUDENT".equalsIgnoreCase(role) && userId.equals(studentId)) {
            return;
        }
        if ("TEACHER".equalsIgnoreCase(role) && userId.equals(teacherId)) {
            return;
        }
        if ("SECONDARY_ADMIN".equalsIgnoreCase(role) && adminId != null && userId.equals(adminId)) {
            return;
        }
        throw new BusinessException("解绑角色与当前登录用户不匹配");
    }

    private void initChatParticipants(Long pairId, Long studentId, Long teacherId) {
        com.rural.education.model.entity.ChatParticipant teacher = new com.rural.education.model.entity.ChatParticipant();
        teacher.setMatchPairId(pairId);
        teacher.setUserId(teacherId);
        teacher.setParticipantRole(com.rural.education.enums.UserRole.TEACHER.getCode());
        teacher.setIsDefaultMember(com.rural.education.model.entity.ChatParticipant.DEFAULT_MEMBER);
        teacher.setJoinedTime(java.time.LocalDateTime.now());
        chatParticipantMapper.insert(teacher);

        com.rural.education.model.entity.ChatParticipant student = new com.rural.education.model.entity.ChatParticipant();
        student.setMatchPairId(pairId);
        student.setUserId(studentId);
        student.setParticipantRole(com.rural.education.enums.UserRole.STUDENT.getCode());
        student.setIsDefaultMember(com.rural.education.model.entity.ChatParticipant.DEFAULT_MEMBER);
        student.setJoinedTime(java.time.LocalDateTime.now());
        chatParticipantMapper.insert(student);

        com.rural.education.model.entity.StudentProfile studentProfile = studentProfileMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.rural.education.model.entity.StudentProfile>()
                        .eq(com.rural.education.model.entity.StudentProfile::getUserId, studentId)
        );
        if (studentProfile != null && studentProfile.getBindAdminId() != null
                && !studentProfile.getBindAdminId().equals(studentId)
                && !studentProfile.getBindAdminId().equals(teacherId)) {
            com.rural.education.model.entity.ChatParticipant admin = new com.rural.education.model.entity.ChatParticipant();
            admin.setMatchPairId(pairId);
            admin.setUserId(studentProfile.getBindAdminId());
            admin.setParticipantRole(com.rural.education.enums.UserRole.L2_ADMIN.getCode());
            admin.setIsDefaultMember(com.rural.education.model.entity.ChatParticipant.DEFAULT_MEMBER);
            admin.setJoinedTime(java.time.LocalDateTime.now());
            chatParticipantMapper.insert(admin);
        }
    }

    private void evictRecommendationCache(Long studentId) {
        redisTemplate.delete("match:recommendations:student:" + studentId);
    }

    private double getWeight(List<AlgorithmWeightConfig> weights, String factorName, double defaultVal) {
        return weights.stream()
                .filter(w -> factorName.equals(w.getFactorName()))
                .findFirst()
                .map(w -> w.getWeight().doubleValue())
                .orElse(defaultVal);
    }

    @SuppressWarnings("unchecked")
    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        String s = json.trim();
        if (s.startsWith("[")) {
            try {
                return objectMapper.readValue(s, List.class);
            } catch (Exception e) {
                // fall through
            }
        }
        return java.util.Arrays.stream(s.split("[,，、#|\\s]+"))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toList();
    }

    private List<String> parseJsonListFromObj(Object obj) {
        if (obj == null) return List.of();
        if (obj instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                result.add(item != null ? item.toString() : "");
            }
            return result;
        }
        if (obj instanceof String s) return parseJsonList(s);
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseFreeTime(String json) {
        if (json == null || json.isBlank()) return List.of();
        String s = json.trim();
        if (s.startsWith("[")) {
            try {
                return objectMapper.readValue(s, List.class);
            } catch (Exception e) {
                // fall through
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        // 1. GRID format: GRID:1-mor,2-noon
        if (s.startsWith("GRID:")) {
            String partsStr = s.substring(5);
            String[] parts = partsStr.split(",");
            for (String p : parts) {
                if (p.isBlank()) continue;
                String[] sub = p.split("-");
                if (sub.length == 2) {
                    try {
                        int w = Integer.parseInt(sub[0].trim());
                        String sl = sub[1].trim();
                        Map<String, Object> map = new HashMap<>();
                        map.put("week", w);
                        map.put("slot", sl);
                        result.add(map);
                    } catch (NumberFormatException ignored) {}
                }
            }
            return result;
        }

        // 2. Legacy W:1,2|S:mor,noon format
        int wIdx = s.indexOf("W:");
        int sIdx = s.indexOf("|S:");
        if (wIdx == 0 && sIdx > 0) {
            String wStr = s.substring(2, sIdx);
            String sStr = s.substring(sIdx + 3);
            String[] weeks = wStr.split(",");
            String[] slots = sStr.split(",");
            for (String w : weeks) {
                if (w.isBlank()) continue;
                try {
                    int weekNum = Integer.parseInt(w.trim());
                    for (String slot : slots) {
                        if (slot.isBlank()) continue;
                        Map<String, Object> map = new HashMap<>();
                        map.put("week", weekNum);
                        map.put("slot", slot.trim());
                        result.add(map);
                    }
                } catch (NumberFormatException ignored) {}
            }
            return result;
        }

        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseFreeTimeFromObj(Object obj) {
        if (obj == null) return List.of();
        if (obj instanceof List<?> list) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map) {
                    result.add((Map<String, Object>) item);
                }
            }
            return result;
        }
        if (obj instanceof String s) return parseFreeTime(s);
        return List.of();
    }

    private double computeOverlapRatio(List<String> studentSubjects, List<String> teacherSubjects) {
        if (teacherSubjects.isEmpty()) return 0.0;
        Set<String> studentSet = new HashSet<>(studentSubjects);
        Set<String> teacherSet = new HashSet<>(teacherSubjects);
        Set<String> intersection = new HashSet<>(studentSet);
        intersection.retainAll(teacherSet);
        if (intersection.isEmpty()) return 0.0;
        return 0.8 + 0.2 * ((double) intersection.size() / Math.max(1, Math.min(studentSet.size(), teacherSet.size())));
    }

    private Set<String> extractTimeSlots(List<Map<String, Object>> slots) {
        Set<String> result = new HashSet<>();
        for (Map<String, Object> rawSlot : slots) {
            Map<String, Object> slot = normalizeSlot(rawSlot);
            if (slot == null) continue;
            Integer day = toInt(slot.get("dayOfWeek"));
            String start = toString(slot.get("start"));
            if (day != null && start != null) {
                String period;
                if (start.compareTo("12:00") < 0) period = "上午";
                else if (start.compareTo("18:00") < 0) period = "下午";
                else period = "晚上";
                result.add(day + "_" + period);
            }
        }
        return result;
    }

    private double computeTimeOverlap(List<Map<String, Object>> studentSlots, List<Map<String, Object>> teacherSlots) {
        Set<String> sSet = extractTimeSlots(studentSlots);
        Set<String> tSet = extractTimeSlots(teacherSlots);
        return computeSetOverlap(sSet, tSet);
    }

    private double computeSetOverlap(Set<String> studentSet, Set<String> teacherSet) {
        if (teacherSet.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(studentSet);
        intersection.retainAll(teacherSet);
        if (intersection.isEmpty()) return 0.0;
        return 0.8 + 0.2 * ((double) intersection.size() / Math.max(1, Math.min(studentSet.size(), teacherSet.size())));
    }

    private Map<String, Object> normalizeSlot(Map<String, Object> slot) {
        if (slot == null) return null;
        Map<String, Object> normalized = new HashMap<>(slot);
        if (!normalized.containsKey("dayOfWeek") && normalized.containsKey("week")) {
            normalized.put("dayOfWeek", normalized.get("week"));
        }
        if (!normalized.containsKey("start") && normalized.containsKey("slot")) {
            String slotStr = toString(normalized.get("slot"));
            if ("mor".equals(slotStr)) {
                normalized.put("start", "08:00");
                normalized.put("end", "12:00");
            } else if ("noon".equals(slotStr)) {
                normalized.put("start", "14:00");
                normalized.put("end", "18:00");
            } else if ("night".equals(slotStr)) {
                normalized.put("start", "19:00");
                normalized.put("end", "22:00");
            }
        }
        return normalized;
    }

    private Integer toInt(Object obj) {
        if (obj instanceof Number n) return n.intValue();
        if (obj instanceof String s) {
            try { return Integer.parseInt(s); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    private String toString(Object obj) {
        return obj != null ? obj.toString() : null;
    }

    private void fillPairNames(MatchPairVO vo) {
        if (vo == null) {
            return;
        }
        if (vo.getStudentId() != null && (vo.getStudentName() == null || vo.getStudentName().isBlank())) {
            User studentUser = userMapper.selectById(vo.getStudentId());
            if (studentUser != null) {
                vo.setStudentName(studentUser.getRealName());
                if (vo.getStudentAvatar() == null) {
                    vo.setStudentAvatar(studentUser.getAvatar());
                }
            }
        }
        if (vo.getTeacherId() != null && (vo.getTeacherName() == null || vo.getTeacherName().isBlank())) {
            User teacherUser = userMapper.selectById(vo.getTeacherId());
            if (teacherUser != null) {
                vo.setTeacherName(teacherUser.getRealName());
                if (vo.getTeacherAvatar() == null) {
                    vo.setTeacherAvatar(teacherUser.getAvatar());
                }
            }
        }
    }

    private void fillPairNamesBatch(List<MatchPairVO> vos) {
        if (vos == null || vos.isEmpty()) {
            return;
        }
        Set<Long> userIds = new HashSet<>();
        for (MatchPairVO vo : vos) {
            if (vo.getStudentId() != null && (vo.getStudentName() == null || vo.getStudentName().isBlank())) {
                userIds.add(vo.getStudentId());
            }
            if (vo.getTeacherId() != null && (vo.getTeacherName() == null || vo.getTeacherName().isBlank())) {
                userIds.add(vo.getTeacherId());
            }
        }
        if (userIds.isEmpty()) {
            return;
        }
        Map<Long, User> userMap = new HashMap<>();
        userMapper.selectBatchIds(userIds).forEach(u -> userMap.put(u.getId(), u));
        for (MatchPairVO vo : vos) {
            if (vo.getStudentId() != null && (vo.getStudentName() == null || vo.getStudentName().isBlank())) {
                User su = userMap.get(vo.getStudentId());
                if (su != null) {
                    vo.setStudentName(su.getRealName());
                    if (vo.getStudentAvatar() == null) {
                        vo.setStudentAvatar(su.getAvatar());
                    }
                }
            }
            if (vo.getTeacherId() != null && (vo.getTeacherName() == null || vo.getTeacherName().isBlank())) {
                User tu = userMap.get(vo.getTeacherId());
                if (tu != null) {
                    vo.setTeacherName(tu.getRealName());
                    if (vo.getTeacherAvatar() == null) {
                        vo.setTeacherAvatar(tu.getAvatar());
                    }
                }
            }
        }
    }

    private void publishNotification(Long userId, Integer type, String title, String content, String paramsJson) {
        NotificationEvent event = new NotificationEvent();
        event.setUserId(userId);
        event.setType(type);
        event.setTitle(title);
        event.setContent(content);
        event.setParamsJson(paramsJson);
        notificationAsyncPublisher.publishAfterCommit(event);
    }

    @Override
    public List<MatchPairVO> pendingUnbindRequests(Long userId) {
        LambdaQueryWrapper<MatchPair> wrapper = new LambdaQueryWrapper<MatchPair>()
                .eq(MatchPair::getMatchStatus, MatchStatus.UNBIND_CONFIRMING.getCode())
                .eq(MatchPair::getUnbindAdminId, userId)
                .orderByDesc(MatchPair::getUnbindRequestTime);
        List<MatchPairVO> vos = matchPairMapper.selectList(wrapper).stream().map(pair -> {
            MatchPairVO vo = new MatchPairVO();
            vo.setId(pair.getId());
            vo.setPairId(pair.getId());
            vo.setStudentId(pair.getStudentId());
            vo.setTeacherId(pair.getTeacherId());
            vo.setMatchStatus(pair.getMatchStatus());
            vo.setUnbindRequestTime(pair.getUnbindRequestTime());
            vo.setStudentUnbindConfirm(pair.getStudentUnbindConfirm());
            vo.setTeacherUnbindConfirm(pair.getTeacherUnbindConfirm());
            vo.setAdminUnbindConfirm(pair.getAdminUnbindConfirm());
            vo.setUnbindRejectReason(pair.getUnbindRejectReason());
            return vo;
        }).toList();
        fillPairNamesBatch(vos);
        return vos;
    }
}

