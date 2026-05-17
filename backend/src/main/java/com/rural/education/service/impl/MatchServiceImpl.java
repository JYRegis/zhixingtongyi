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
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.AlgorithmWeightConfigMapper;
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
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.entity.User;
import com.rural.education.vo.MatchPairVO;
import com.rural.education.vo.TeacherVO;
import com.rural.education.service.MatchService;
import com.rural.education.service.NotificationAsyncPublisher;
import com.rural.education.service.UserAccessService;
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
    private final UserAccessService userAccessService;
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
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        String cacheKey = "match:recommendations:student:" + userId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<List<TeacherVO>>() {});
            } catch (Exception ignore) {
                // ignore and fallback to compute
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
        double timeWeight = getWeight(weights, "time_match", 0.30);
        double emergencyWeight = getWeight(weights, "emergency_weight", 0.20);
        double personalityWeight = getWeight(weights, "personality_match", 0.10);

        List<String> studentSubjects = parseJsonList(student.getSubjectsNeeded());
        List<Map<String, Object>> studentFreeTime = parseFreeTime(student.getFreeTime());
        double emergencyScore = (student.getEmergencyWeight() != null ? student.getEmergencyWeight() : 50) / 100.0;

        List<TeacherVO> list = teacherProfileMapper.selectRecommendations();
        for (TeacherVO t : list) {
            // Parse raw DB JSON strings into typed List fields
            // (MyBatis cannot auto-convert VARCHAR to List, so fields are null; raw fields have the values)
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
            List<Map<String, Object>> teacherFreeTime = parseFreeTimeFromObj(t.getFreeTime());

            double subjectScore = studentSubjects.isEmpty() ? 0.5
                    : computeOverlapRatio(studentSubjects, teacherSubjects);
            double timeScore = (studentFreeTime.isEmpty() || teacherFreeTime.isEmpty()) ? 0.5
                    : computeTimeOverlap(studentFreeTime, teacherFreeTime);
            double personalityScore = (student.getPersonalityDesc() != null && !student.getPersonalityDesc().isBlank()
                    && t.getPersonalityDesc() != null && !t.getPersonalityDesc().isBlank()) ? 1.0 : 0.5;

            t.setMatchScore(subjectWeight * subjectScore + timeWeight * timeScore
                    + emergencyWeight * emergencyScore + personalityWeight * personalityScore);
        }

        list.sort((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()));

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(list),
                    RECOMMENDATION_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception ignore) {
            // ignore cache failure
        }
        return list;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void apply(Long userId, MatchApplyRequest request) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
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
        if (!Integer.valueOf(1).equals(profile.getProfileStatus()) ||
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
        matchPairMapper.insert(pair);
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
        notificationAsyncPublisher.publish(event);
        evictRecommendationCache(userId);
    }

    @Override
    public List<MatchPairVO> pendingApplications(Long userId) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        return matchPairMapper.selectPendingApplications(userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void process(Long userId, Long applicationId, ProcessMatchRequest request) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
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
            matchPairMapper.update(
                    null,
                    new LambdaUpdateWrapper<MatchPair>()
                            .eq(MatchPair::getId, applicationId)
                            .set(MatchPair::getMatchStatus, MatchStatus.ACCEPTED.getCode())
                            .set(MatchPair::getAcceptTime, LocalDateTime.now())
            );
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
            notificationAsyncPublisher.publish(event);
        } else {
            matchPairMapper.update(
                    null,
                    new LambdaUpdateWrapper<MatchPair>()
                            .eq(MatchPair::getId, applicationId)
                            .set(MatchPair::getMatchStatus, MatchStatus.REJECTED.getCode())
                            .set(MatchPair::getRejectReason, request.getReason())
            );
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
            notificationAsyncPublisher.publish(event);
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
                    fillPairNames(vo);
                    return vo;
                })
                .toList();
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
            wrapper.set(MatchPair::getStudentUnbindConfirm, 1)
                   .set(MatchPair::getStudentUnbindConfirmTime, LocalDateTime.now())
                   .set(MatchPair::getTeacherUnbindConfirm, 0)
                   .set(MatchPair::getTeacherUnbindConfirmTime, null)
                   .set(MatchPair::getAdminUnbindConfirm, 0)
                   .set(MatchPair::getAdminUnbindConfirmTime, null);
        } else if (userId.equals(teacherId)) {
            wrapper.set(MatchPair::getStudentUnbindConfirm, 0)
                   .set(MatchPair::getStudentUnbindConfirmTime, null)
                   .set(MatchPair::getTeacherUnbindConfirm, 1)
                   .set(MatchPair::getTeacherUnbindConfirmTime, LocalDateTime.now())
                   .set(MatchPair::getAdminUnbindConfirm, 0)
                   .set(MatchPair::getAdminUnbindConfirmTime, null);
        } else {
            wrapper.set(MatchPair::getStudentUnbindConfirm, 0)
                   .set(MatchPair::getStudentUnbindConfirmTime, null)
                   .set(MatchPair::getTeacherUnbindConfirm, 0)
                   .set(MatchPair::getTeacherUnbindConfirmTime, null)
                   .set(MatchPair::getAdminUnbindConfirm, 1)
                   .set(MatchPair::getAdminUnbindConfirmTime, LocalDateTime.now());
        }

        matchPairMapper.update(null, wrapper);

        NotificationEvent unbindEvent = new NotificationEvent();
        unbindEvent.setType(NotificationType.UNBIND_APPLY.getCode());
        unbindEvent.setTitle("解绑申请");
        unbindEvent.setContent("结对关系有新的解绑申请，请确认");
        Map<String, Object> unbindParams = new HashMap<>();
        unbindParams.put("pairId", pairId);
        try {
            unbindEvent.setParamsJson(objectMapper.writeValueAsString(unbindParams));
        } catch (Exception e) {
            throw new BusinessException("参数序列化失败");
        }
        if (!userId.equals(studentId)) {
            unbindEvent.setUserId(studentId);
            notificationAsyncPublisher.publish(unbindEvent);
        }
        if (!userId.equals(teacherId)) {
            unbindEvent.setUserId(teacherId);
            notificationAsyncPublisher.publish(unbindEvent);
        }
        if (adminId != null && !userId.equals(adminId)) {
            unbindEvent.setUserId(adminId);
            notificationAsyncPublisher.publish(unbindEvent);
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

            NotificationEvent rejectEvent = new NotificationEvent();
            rejectEvent.setType(NotificationType.UNBIND_APPLY.getCode());
            rejectEvent.setTitle("解绑申请被拒绝");
            rejectEvent.setContent("解绑申请已被拒绝，原因: " + request.getRejectReason());
            Map<String, Object> rejectUnbindParams = new HashMap<>();
            rejectUnbindParams.put("pairId", pairId);
            try {
                rejectEvent.setParamsJson(objectMapper.writeValueAsString(rejectUnbindParams));
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            Long unbindRequester = pair.getUnbindRequestBy();
            if (unbindRequester != null && !unbindRequester.equals(userId)) {
                rejectEvent.setUserId(unbindRequester);
                notificationAsyncPublisher.publish(rejectEvent);
            }
            for (Long uid : new Long[]{studentId, teacherId, adminId}) {
                if (uid != null && !uid.equals(userId) && !uid.equals(unbindRequester)) {
                    rejectEvent.setUserId(uid);
                    notificationAsyncPublisher.publish(rejectEvent);
                }
            }
            return;
        }
        if ("STUDENT".equalsIgnoreCase(request.getRole())) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getStudentUnbindConfirm, 1).set(MatchPair::getStudentUnbindConfirmTime, LocalDateTime.now()));
        } else if ("TEACHER".equalsIgnoreCase(request.getRole())) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getTeacherUnbindConfirm, 1).set(MatchPair::getTeacherUnbindConfirmTime, LocalDateTime.now()));
        } else {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getAdminUnbindConfirm, 1).set(MatchPair::getAdminUnbindConfirmTime, LocalDateTime.now()));
        }
        MatchPair now = matchPairMapper.selectById(pairId);
        boolean done = Integer.valueOf(1).equals(now.getStudentUnbindConfirm())
                && Integer.valueOf(1).equals(now.getTeacherUnbindConfirm())
                && Integer.valueOf(1).equals(now.getAdminUnbindConfirm());
        if (done) {
            matchPairMapper.update(null, new LambdaUpdateWrapper<MatchPair>().eq(MatchPair::getId, pairId)
                    .set(MatchPair::getMatchStatus, MatchStatus.UNBOUND.getCode()).set(MatchPair::getUnbindAcceptTime, LocalDateTime.now()));

            NotificationEvent doneEvent = new NotificationEvent();
            doneEvent.setType(NotificationType.UNBIND_ACCEPT.getCode());
            doneEvent.setTitle("解绑完成");
            doneEvent.setContent("结对关系已解除");
            Map<String, Object> doneParams = new HashMap<>();
            doneParams.put("pairId", pairId);
            try {
                doneEvent.setParamsJson(objectMapper.writeValueAsString(doneParams));
            } catch (Exception e) {
                throw new BusinessException("参数序列化失败");
            }
            for (Long uid : new Long[]{studentId, teacherId, adminId}) {
                if (uid != null) {
                    doneEvent.setUserId(uid);
                    notificationAsyncPublisher.publish(doneEvent);
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
        teacher.setIsDefaultMember(1);
        teacher.setJoinedTime(java.time.LocalDateTime.now());
        chatParticipantMapper.insert(teacher);

        com.rural.education.model.entity.ChatParticipant student = new com.rural.education.model.entity.ChatParticipant();
        student.setMatchPairId(pairId);
        student.setUserId(studentId);
        student.setParticipantRole(com.rural.education.enums.UserRole.STUDENT.getCode());
        student.setIsDefaultMember(1);
        student.setJoinedTime(java.time.LocalDateTime.now());
        chatParticipantMapper.insert(student);

        com.rural.education.model.entity.StudentProfile studentProfile = studentProfileMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.rural.education.model.entity.StudentProfile>()
                        .eq(com.rural.education.model.entity.StudentProfile::getUserId, studentId)
        );
        if (studentProfile != null && studentProfile.getBindAdminId() != null) {
            com.rural.education.model.entity.ChatParticipant admin = new com.rural.education.model.entity.ChatParticipant();
            admin.setMatchPairId(pairId);
            admin.setUserId(studentProfile.getBindAdminId());
            admin.setParticipantRole(com.rural.education.enums.UserRole.L2_ADMIN.getCode());
            admin.setIsDefaultMember(1);
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
        try {
            return objectMapper.readValue(json, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
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
        try {
            return objectMapper.readValue(json, List.class);
        } catch (Exception e) {
            return List.of();
        }
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
        return (double) intersection.size() / Math.max(studentSet.size(), 1);
    }

    private double computeTimeOverlap(List<Map<String, Object>> studentSlots, List<Map<String, Object>> teacherSlots) {
        if (studentSlots.isEmpty() || teacherSlots.isEmpty()) return 0.0;
        int overlaps = 0;
        for (Map<String, Object> ss : studentSlots) {
            Integer sDay = toInt(ss.get("dayOfWeek"));
            for (Map<String, Object> ts : teacherSlots) {
                Integer tDay = toInt(ts.get("dayOfWeek"));
                if (sDay != null && sDay.equals(tDay)) {
                    String sStart = toString(ss.get("start"));
                    String sEnd = toString(ss.get("end"));
                    String tStart = toString(ts.get("start"));
                    String tEnd = toString(ts.get("end"));
                    if (sStart != null && sEnd != null && tStart != null && tEnd != null
                            && sStart.compareTo(tEnd) < 0 && sEnd.compareTo(tStart) > 0) {
                        overlaps++;
                    }
                }
            }
        }
        return (double) overlaps / Math.max(studentSlots.size(), 1);
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
            StudentProfile sp = studentProfileMapper.selectOne(
                    new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, vo.getStudentId())
            );
            if (sp != null) {
                vo.setStudentName(sp.getRealName());
            }
        }
        if (vo.getTeacherId() != null && (vo.getTeacherName() == null || vo.getTeacherName().isBlank())) {
            TeacherProfile tp = teacherProfileMapper.selectOne(
                    new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, vo.getTeacherId())
            );
            if (tp != null) {
                vo.setTeacherName(tp.getRealName());
            }
        }
    }

    @Override
    public List<MatchPairVO> pendingUnbindRequests(Long userId) {
        userAccessService.requireAnyRole(userId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        LambdaQueryWrapper<MatchPair> wrapper = new LambdaQueryWrapper<MatchPair>()
                .eq(MatchPair::getMatchStatus, MatchStatus.UNBIND_CONFIRMING.getCode())
                .eq(MatchPair::getUnbindAdminId, userId)
                .orderByDesc(MatchPair::getUnbindRequestTime);
        return matchPairMapper.selectList(wrapper).stream().map(pair -> {
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
            fillPairNames(vo);
            return vo;
        }).toList();
    }
}

