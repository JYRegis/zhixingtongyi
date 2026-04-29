package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.response.admin.DashboardOverviewResponse;
import com.rural.education.dto.response.admin.MatchSuccessRateResponse;
import com.rural.education.dto.response.admin.RegionDistributionResponse;
import com.rural.education.dto.response.admin.SubjectDistributionResponse;
import com.rural.education.service.UserAccessService;
import com.rural.education.utils.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class DashboardController {
    private final CurrentUserUtil currentUserUtil;
    private final UserAccessService userAccessService;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/dashboard/overview")
    public ApiResponse<DashboardOverviewResponse> overview() {
        Long userId = currentUserUtil.getCurrentUserId();
        userAccessService.requireAnyRole(userId, 0, 1);

        Long totalUsers = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user WHERE status = 1", Long.class);
        if (totalUsers == null) totalUsers = 0L;

        Long matchedPairs = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM match_pair WHERE match_status = 1", Long.class);
        if (matchedPairs == null) matchedPairs = 0L;

        Long activeMeetings = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM meeting WHERE status = 1", Long.class);
        if (activeMeetings == null) activeMeetings = 0L;

        Long totalServiceHours = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(duration), 0) FROM volunteer_record WHERE status = 2", Long.class);
        if (totalServiceHours == null) totalServiceHours = 0L;

        return ApiResponse.success(new DashboardOverviewResponse(totalUsers, matchedPairs, activeMeetings, totalServiceHours));
    }

    @GetMapping("/statistics/match-success-rate")
    public ApiResponse<MatchSuccessRateResponse> matchSuccessRate(@RequestParam(required = false) String startDate,
                                                                   @RequestParam(required = false) String endDate) {
        Long userId = currentUserUtil.getCurrentUserId();
        userAccessService.requireAnyRole(userId, 0, 1);

        java.util.List<Object> params = new java.util.ArrayList<>();
        StringBuilder whereClause = new StringBuilder();
        if (startDate != null && !startDate.isBlank()) {
            whereClause.append(" AND apply_time >= ?");
            params.add(startDate);
        }
        if (endDate != null && !endDate.isBlank()) {
            whereClause.append(" AND apply_time <= ?");
            params.add(endDate + " 23:59:59");
        }
        Object[] paramArray = params.toArray();

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM match_pair WHERE match_status IN (0,1,2)" + whereClause, Long.class, paramArray);
        Long accepted = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM match_pair WHERE match_status = 1" + whereClause, Long.class, paramArray);

        BigDecimal rate = BigDecimal.ZERO;
        if (total != null && total > 0 && accepted != null) {
            rate = BigDecimal.valueOf(accepted).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        MatchSuccessRateResponse resp = new MatchSuccessRateResponse();
        resp.setStartDate(startDate);
        resp.setEndDate(endDate);
        resp.setTotalApplications(total != null ? total : 0L);
        resp.setAcceptedCount(accepted != null ? accepted : 0L);
        resp.setSuccessRate(rate);
        return ApiResponse.success(resp);
    }

    @GetMapping("/statistics/region-distribution")
    public ApiResponse<List<RegionDistributionResponse>> regionDistribution() {
        Long userId = currentUserUtil.getCurrentUserId();
        userAccessService.requireAnyRole(userId, 0, 1);

        String sql = "SELECT s.region_code AS regionCode, s.name AS regionName, " +
                "COUNT(DISTINCT s.id) AS schoolCount, " +
                "COUNT(DISTINCT sp.user_id) AS studentCount " +
                "FROM school s LEFT JOIN student_profile sp ON s.id = sp.school_id " +
                "GROUP BY s.region_code, s.name ORDER BY studentCount DESC";
        List<RegionDistributionResponse> list = jdbcTemplate.query(sql,
                (rs, rowNum) -> new RegionDistributionResponse(
                        rs.getString("regionCode"),
                        rs.getString("regionName"),
                        rs.getLong("schoolCount"),
                        rs.getLong("studentCount")
                ));
        return ApiResponse.success(list);
    }

    @GetMapping("/statistics/subject-distribution")
    public ApiResponse<List<SubjectDistributionResponse>> subjectDistribution() {
        Long userId = currentUserUtil.getCurrentUserId();
        userAccessService.requireAnyRole(userId, 0, 1);

        List<Map<String, Object>> teacherSubjects = jdbcTemplate.queryForList(
                "SELECT skilled_subjects FROM teacher_profile WHERE certification_status = 1");
        List<Map<String, Object>> studentSubjects = jdbcTemplate.queryForList(
                "SELECT subjects_needed FROM student_profile WHERE audit_status = 1");

        java.util.Map<String, Long> teacherCount = new java.util.HashMap<>();
        java.util.Map<String, Long> studentCount = new java.util.HashMap<>();
        java.util.Set<String> allSubjects = new java.util.HashSet<>();

        for (Map<String, Object> row : teacherSubjects) {
            String json = (String) row.get("skilled_subjects");
            if (json != null) {
                parseSubjects(json, teacherCount, allSubjects);
            }
        }
        for (Map<String, Object> row : studentSubjects) {
            String json = (String) row.get("subjects_needed");
            if (json != null) {
                parseSubjects(json, studentCount, allSubjects);
            }
        }

        List<SubjectDistributionResponse> result = allSubjects.stream()
                .map(s -> new SubjectDistributionResponse(s, teacherCount.getOrDefault(s, 0L), studentCount.getOrDefault(s, 0L)))
                .sorted((a, b) -> Long.compare(b.getTeacherCount() + b.getStudentCount(), a.getTeacherCount() + a.getStudentCount()))
                .toList();
        return ApiResponse.success(result);
    }

    private void parseSubjects(String json, java.util.Map<String, Long> counter, java.util.Set<String> all) {
        json = json.replace("[", "").replace("]", "").replace("\"", "");
        for (String subject : json.split(",")) {
            String s = subject.trim();
            if (!s.isEmpty()) {
                counter.put(s, counter.getOrDefault(s, 0L) + 1L);
                all.add(s);
            }
        }
    }
}
