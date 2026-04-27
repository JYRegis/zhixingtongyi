/**
 * 后端 Match 相关 VO <-> 匹配中心/结对待办 页面展示行
 * （见 zhixingtongyi-zyh：TeacherRecommendationVO、PendingApplicationVO）
 */

/**
 * 将 GET /match/recommendations 结果转为与 match/center 中 enrichItem 输入同构
 * @param {Array<{ teacherId: number, realName?: string, school?: string, grade?: string, skilledSubjects?: string, freeTime?: string }>} vos
 * @param {string} role 当前页身份（本函数预期为 student）
 * @param {(item: object, role: string) => object} enrichItem 来自 match/center 的 enrich
 */
function mapRecommendationsToCenterRows(vos, role, enrichItem) {
  const list = Array.isArray(vos) ? vos : [];
  return list.map(function (vo, i) {
    const firstSubj = pickFirstToken(vo && vo.skilledSubjects);
    const item = {
      id: Number(vo.teacherId),
      asVolunteer: (vo && vo.realName) || "教师",
      asStudent: "—",
      timeRaw: (vo && vo.freeTime) != null ? String(vo.freeTime) : "",
      score: 72 + (i % 18),
      style: (vo && vo.grade) || firstSubj || "综合",
      subject: firstSubj || "综合"
    };
    return enrichItem(item, role);
  });
}

function pickFirstToken(s) {
  if (s == null || s === "") {
    return "";
  }
  const t = String(s)
    .split(/[,，、]/)
    .map((x) => x.trim())
    .find((x) => x);
  return t || "";
}

/**
 * 教师 GET /match/pending-applications → 与结对待办行结构兼容（与 SEED 同构，便于 mapItem）
 * @param {Array<{ id: number, studentId: number, applyTime?: string }>} vos
 */
function mapPendingApplicationsToRows(vos) {
  const list = Array.isArray(vos) ? vos : [];
  return list.map(function (vo) {
    const ts = vo && vo.applyTime != null ? parseApplyTimeMs(vo.applyTime) : Date.now();
    return {
      id: Number(vo.id),
      studentName: "学员（ID " + (vo && vo.studentId) + "）",
      volunteerName: "—",
      timeRaw: "",
      appliedAt: ts
    };
  });
}

function parseApplyTimeMs(applyTime) {
  if (applyTime == null) {
    return Date.now();
  }
  if (typeof applyTime === "number" && !isNaN(applyTime)) {
    return applyTime;
  }
  const s = String(applyTime);
  const t = Date.parse(s);
  if (!isNaN(t)) {
    return t;
  }
  return Date.now();
}

module.exports = {
  mapRecommendationsToCenterRows,
  mapPendingApplicationsToRows
};
