/**
 * 小程序表单 <-> 后端 DTO 字段（zhixingtongyi-zyh 现有接口）
 */
const { DEMO_L2_USER_ID } = require("../config/demoBackend");
const { getSchoolName } = require("./schoolsMock");
const { parseTimeSelection } = require("./classTimeOptions");

/** 与 Json 中 Map 可序列化一致：星期 + 时段一条一条 */
function weekIdsSlotIdsToFreeTimeMaps(weekIds, slotIds) {
  const w = weekIds || [];
  const s = slotIds || [];
  const out = [];
  w.forEach((day) => {
    s.forEach((slot) => {
      out.push({ week: Number(day), slot: String(slot) });
    });
  });
  return out;
}

function freeTimeMapsToSerializedString(freeTimeList) {
  if (!Array.isArray(freeTimeList) || !freeTimeList.length) {
    return "";
  }
  const weeks = new Set();
  const slots = new Set();
  freeTimeList.forEach((m) => {
    if (!m) return;
    // 兼容 {week, slot} 单条格式
    if (m.week != null) weeks.add(Number(m.week));
    if (m.slot) slots.add(String(m.slot));
    // 兼容 {weekIds, slotIds} 数组格式
    if (Array.isArray(m.weekIds)) m.weekIds.forEach((w) => weeks.add(Number(w)));
    if (Array.isArray(m.slotIds)) m.slotIds.forEach((s) => slots.add(String(s)));
  });
  const wArr = Array.from(weeks)
    .filter((n) => n >= 1 && n <= 7)
    .sort((a, b) => a - b);
  const sArr = Array.from(slots)
    .filter((t) => ["mor", "noon", "night"].indexOf(t) >= 0)
    .sort();
  if (!wArr.length || !sArr.length) {
    return "";
  }
  return `W:${wArr.join(",")}|S:${sArr.join(",")}`;
}

/**
 * 学员入驻请求体
 * 表单暂无「科目多选」时，使用默认科目以满足 @NotEmpty subjectsNeeded
 */
function buildStudentProfileRequest(
  { realName, schoolId, grade, weekIds, slotIds, personalityDesc },
  options
) {
  const opt = options || {};
  const bind = opt.bindAdminId != null ? opt.bindAdminId : DEMO_L2_USER_ID;
  const subjects = opt.subjectsNeeded && opt.subjectsNeeded.length ? opt.subjectsNeeded : ["综合辅导（演示）"];
  return {
    realName: String(realName || "").trim(),
    schoolId: Number(schoolId),
    grade: String(grade || "").trim(),
    subjectsNeeded: subjects,
    freeTime: weekIdsSlotIdsToFreeTimeMaps(weekIds, slotIds),
    personalityDesc: (personalityDesc && String(personalityDesc).trim()) || undefined,
    bindAdminId: Number(bind) || 1
  };
}

/**
 * 教师/志愿者
 */
function buildTeacherProfileRequest({ realName, schoolId, grade, weekIds, slotIds, personalityDesc }, options) {
  const opt = options || {};
  const school = schoolId != null ? getSchoolName(schoolId) : "";
  const skilled =
    opt.skilledSubjects && opt.skilledSubjects.length ? opt.skilledSubjects : ["义教", "通识（演示）"];
  return {
    realName: String(realName || "").trim(),
    school: school || "未选择学校",
    grade: (grade && String(grade)) || "本科",
    freeTime: weekIdsSlotIdsToFreeTimeMaps(weekIds, slotIds),
    skilledSubjects: skilled,
    personalSkills: (opt.personalSkills && String(opt.personalSkills)) || undefined,
    personalityDesc: (personalityDesc && String(personalityDesc).trim()) || undefined
  };
}

/** 从 GET /student/profile 的 VO 还原星期多选 */
function studentVoToTimeFields(vo) {
  if (!vo) {
    return { weekIds: [], slotIds: [] };
  }
  const ft = vo.freeTime;
  if (Array.isArray(ft) && ft.length) {
    const str = freeTimeMapsToSerializedString(ft);
    return parseTimeSelection(str);
  }
  return { weekIds: [], slotIds: [] };
}

module.exports = {
  weekIdsSlotIdsToFreeTimeMaps,
  freeTimeMapsToSerializedString,
  buildStudentProfileRequest,
  buildTeacherProfileRequest,
  studentVoToTimeFields
};
