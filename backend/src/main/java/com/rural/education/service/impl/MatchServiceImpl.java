package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.enums.MatchStatus;
import com.rural.education.enums.NotificationType;
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.exception.BizException;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.dto.request.match.MatchApplyRequest;
import com.rural.education.dto.request.match.ProcessMatchRequest;
import com.rural.education.dto.request.match.UnbindConfirmRequest;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.StudentProfile;
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
import java.util.List;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MatchServiceImpl extends ServiceImpl<MatchPairMapper, MatchPair> implements MatchService {
    private static final long RECOMMENDATION_CACHE_TTL_MINUTES = 5L;
    private final UserAccessService userAccessService;
    private final MatchPairMapper matchPairMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final StudentProfileMapper studentProfileMapper;
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
                // ignore and fallback db query
            }
        }
        List<TeacherVO> list = teacherProfileMapper.selectRecommendations();
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(list), RECOMMENDATION_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
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
            throw new BizException("目标志愿者不存在或不可用");
        }
        StudentProfile profile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (profile == null) {
            throw new BizException("请先完善并提交学生资料");
        }
        if (!Integer.valueOf(1).equals(profile.getProfileStatus()) ||
                profile.getGrade() == null ||
                profile.getSubjectsNeeded() == null ||
                profile.getFreeTime() == null) {
            throw new BizException("学生资料需处于 READY_FOR_MATCH 且必填项完整");
        }
        Long existed = matchPairMapper.selectCount(
                new LambdaQueryWrapper<MatchPair>()
                        .eq(MatchPair::getStudentId, userId)
                        .eq(MatchPair::getTeacherId, request.getTeacherId())
                        .in(MatchPair::getMatchStatus, MatchStatus.APPLIED.getCode(), MatchStatus.ACCEPTED.getCode(), MatchStatus.UNBIND_CONFIRMING.getCode())
        );
        if (existed > 0) {
            throw new BizException("已存在待处理或生效中的结对关系");
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
        event.setParamsJson("{\"studentId\":" + userId + "}");
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
            throw new BizException("申请不存在");
        }
        if (!Integer.valueOf(MatchStatus.APPLIED.getCode()).equals(pair.getMatchStatus())) {
            throw new BizException("仅待处理申请可审核");
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
            event.setParamsJson("{\"applicationId\":" + applicationId + "}");
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
            event.setParamsJson("{\"applicationId\":" + applicationId + "}");
            notificationAsyncPublisher.publish(event);
        }
        evictRecommendationCache(studentId);
    }

    @Override
    public List<MatchPairVO> myPairs(Long userId, Integer status) {
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        if (role == null || (role != UserRole.TEACHER.getCode() && role != UserRole.STUDENT.getCode())) {
            throw new BizException("无权限操作");
        }
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
        return matchPairMapper.selectList(wrapper).stream()
                .map(pair -> {
                    MatchPairVO vo = new MatchPairVO();
                    vo.setId(pair.getId());
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
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbindRequest(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BizException("结对不存在");
        }
        if (!Integer.valueOf(MatchStatus.ACCEPTED.getCode()).equals(pair.getMatchStatus())) {
            throw new BizException("仅生效中的结对可发起解绑");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        if (!userId.equals(studentId) && !userId.equals(teacherId)) {
            throw new BizException("仅结对双方可发起解绑");
        }
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, studentId)
        );
        Long adminId = studentProfile == null ? null : studentProfile.getBindAdminId();
        matchPairMapper.update(
                null,
                new LambdaUpdateWrapper<MatchPair>()
                        .eq(MatchPair::getId, pairId)
                        .set(MatchPair::getMatchStatus, MatchStatus.UNBIND_CONFIRMING.getCode())
                        .set(MatchPair::getUnbindRequestBy, userId)
                        .set(MatchPair::getUnbindRequestTime, LocalDateTime.now())
                        .set(MatchPair::getStudentUnbindConfirm, 0)
                        .set(MatchPair::getTeacherUnbindConfirm, 0)
                        .set(MatchPair::getAdminUnbindConfirm, 0)
                        .set(MatchPair::getStudentUnbindConfirmTime, null)
                        .set(MatchPair::getTeacherUnbindConfirmTime, null)
                        .set(MatchPair::getAdminUnbindConfirmTime, null)
                        .set(MatchPair::getUnbindRejectBy, null)
                        .set(MatchPair::getUnbindRejectReason, null)
                        .set(MatchPair::getUnbindRejectTime, null)
                        .set(MatchPair::getUnbindAdminId, adminId)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbindConfirm(Long userId, Long pairId, UnbindConfirmRequest request) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BizException("结对不存在");
        }
        if (!Integer.valueOf(MatchStatus.UNBIND_CONFIRMING.getCode()).equals(pair.getMatchStatus())
                && !Integer.valueOf(MatchStatus.UNBIND_REJECTED.getCode()).equals(pair.getMatchStatus())) {
            throw new BizException("当前状态不允许解绑确认");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        validateUnbindActor(request.getRole(), userId, studentId, teacherId, adminId);
        if ("reject".equalsIgnoreCase(request.getAction())) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BizException("rejectReason 必填");
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
        }
    }

    @Override
    public MatchPairVO unbindProgress(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BizException("结对不存在");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        if (!userId.equals(studentId) && !userId.equals(teacherId) && (adminId == null || !userId.equals(adminId))) {
            throw new BizException("无权查看解绑进度");
        }
        MatchPairVO vo = new MatchPairVO();
        vo.setPairId(pair.getId());
        vo.setMatchStatus(pair.getMatchStatus());
        vo.setStudentUnbindConfirm(pair.getStudentUnbindConfirm());
        vo.setTeacherUnbindConfirm(pair.getTeacherUnbindConfirm());
        vo.setAdminUnbindConfirm(pair.getAdminUnbindConfirm());
        vo.setStudentUnbindConfirmTime(pair.getStudentUnbindConfirmTime());
        vo.setTeacherUnbindConfirmTime(pair.getTeacherUnbindConfirmTime());
        vo.setAdminUnbindConfirmTime(pair.getAdminUnbindConfirmTime());
        vo.setUnbindRejectBy(pair.getUnbindRejectBy());
        vo.setUnbindRejectReason(pair.getUnbindRejectReason());
        vo.setUnbindRejectTime(pair.getUnbindRejectTime());
        return vo;
    }

    @Override
    public MatchPairVO pairDetail(Long userId, Long pairId) {
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BizException("结对不存在");
        }
        Long studentId = pair.getStudentId();
        Long teacherId = pair.getTeacherId();
        Long adminId = pair.getUnbindAdminId();
        User user = userMapper.selectById(userId);
        Integer userRole = user == null ? null : user.getRole();
        if (!userId.equals(studentId) && !userId.equals(teacherId) && !Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(userRole) && (adminId == null || !userId.equals(adminId))) {
            throw new BizException("无权查看结对详情");
        }
        MatchPairVO vo = new MatchPairVO();
        vo.setId(pair.getId());
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
        throw new BizException("解绑角色与当前登录用户不匹配");
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
}

