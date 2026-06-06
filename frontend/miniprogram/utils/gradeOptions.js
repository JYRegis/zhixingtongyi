/**
 * 年级主数据（展示名存档案；id 供选择器用）
 * 可对接后端后替换为接口数据。
 */
const GRADE_LIST = [
  { id: "p1", name: "一年级" },
  { id: "p2", name: "二年级" },
  { id: "p3", name: "三年级" },
  { id: "p4", name: "四年级" },
  { id: "p5", name: "五年级" },
  { id: "p6", name: "六年级" },
  { id: "j1", name: "初一" },
  { id: "j2", name: "初二" },
  { id: "j3", name: "初三" },
  { id: "h1", name: "高一" },
  { id: "h2", name: "高二" },
  { id: "h3", name: "高三" }
];

const TEACHER_GRADE_LIST = [
  { id: "u1", name: "大一" },
  { id: "u2", name: "大二" },
  { id: "u3", name: "大三" },
  { id: "u4", name: "大四" },
  { id: "g1", name: "研一" },
  { id: "g2", name: "研二" },
  { id: "g3", name: "研三" }
];

function getGradesPlain() {
  return GRADE_LIST;
}

function getTeacherGradesPlain() {
  return TEACHER_GRADE_LIST;
}

/**
 * 含「请选择」行已废弃，保留函数名以兼容，返回与 {@link getGradesPlain} 相同
 */
function getGradesForPicker() {
  return getGradesPlain();
}

function buildGradeChips(list, selectedId) {
  const id = (selectedId && String(selectedId)) || "";
  return (list || []).map((g) => ({
    id: g.id,
    name: g.name,
    on: !!id && g.id === id
  }));
}

/**
 * 年级为单选；无占位项，与芯片 UI 配合
 * @param {string} [saved] 已存为展示名，如「初二」
 * @param {boolean} [isTeacher] 是否为教师/志愿者年级列表
 * @returns {{ list: {id: string, name: string}[], index: number, label: string, selectedId: string, gradeChips: {id: string, name: string, on: boolean}[] }}
 */
function matchGradeToPicker(saved, isTeacher) {
  const baseList = isTeacher ? TEACHER_GRADE_LIST : GRADE_LIST;
  const s = saved == null || saved === "" ? "" : String(saved).trim();
  if (!s || s === "请选择年级" || s === "请选择" || s === "年级") {
    return { list: baseList, index: -1, label: "", selectedId: "", gradeChips: buildGradeChips(baseList, "") };
  }
  const hit = baseList.find((g) => g.name === s);
  if (hit) {
    return {
      list: baseList,
      index: baseList.findIndex((g) => g.id === hit.id),
      label: s,
      selectedId: hit.id,
      gradeChips: buildGradeChips(baseList, hit.id)
    };
  }
  const withUnknown = baseList.slice();
  withUnknown.push({ id: "other", name: s });
  return {
    list: withUnknown,
    index: withUnknown.length - 1,
    label: s,
    selectedId: "other",
    gradeChips: buildGradeChips(withUnknown, "other")
  };
}

/**
 * 年级 id + 名（用于与 apply 中 extra 等一致时）
 * @param {string} [gradeId]
 */
function getGradeNameById(gradeId) {
  if (!gradeId) {
    return "";
  }
  const f = GRADE_LIST.find((g) => g.id === gradeId);
  return f ? f.name : "";
}

module.exports = {
  getGradesForPicker,
  getGradesPlain,
  getTeacherGradesPlain,
  matchGradeToPicker,
  getGradeNameById
};
