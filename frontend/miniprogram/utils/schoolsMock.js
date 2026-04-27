/**
 * 校与地区主数据（Mock，可改 id 以与本地库 school 表主键一致）
 * kind: support=支教方学校, recipient=受援学校
 * id: 与后端 `school_id` 对齐，请为 Long 主键
 */

const SCHOOLS = [
  { id: 1, name: "海城大学（支教点）", kind: "support" },
  { id: 2, name: "云州大学（支教点）", kind: "support" },
  { id: 3, name: "云南师范大学（实习支教）", kind: "support" },
  { id: 4, name: "昆明学院（志愿团）", kind: "support" },
  { id: 5, name: "龙兴村小学", kind: "recipient" },
  { id: 6, name: "勐库镇中学", kind: "recipient" },
  { id: 7, name: "河口县民族小学", kind: "recipient" },
  { id: 8, name: "施甸县第一初级中学", kind: "recipient" },
  { id: 9, name: "怒江州实验小学", kind: "recipient" },
  { id: 10, name: "鲁甸县新街中学", kind: "recipient" }
];

const REGIONS = [
  { id: "reg_yunlong", name: "云州县试点片区" },
  { id: "reg_yn", name: "滇西协作区" },
  { id: "reg_nj", name: "怒江线" }
];

const SCHOOL_INDEX = {};
SCHOOLS.forEach((s) => {
  SCHOOL_INDEX[s.id] = s;
  SCHOOL_INDEX[String(s.id)] = s;
});

function getSchoolName(id) {
  if (id == null || id === "") {
    return "";
  }
  const s = SCHOOL_INDEX[id] || SCHOOL_INDEX[String(id)];
  return s ? s.name : String(id);
}

function getSchoolsByKind(kind) {
  if (!kind) {
    return SCHOOLS.slice();
  }
  return SCHOOLS.filter((k) => k.kind === kind);
}

function getSchoolById(id) {
  return SCHOOL_INDEX[id] || SCHOOL_INDEX[String(id)] || null;
}

/**
 * 带「请选择学校」空选项，不默认选真实学校
 * @param {"support"|"recipient"} kind
 * @param {string} [placeholder] 空项显示文案
 */
function withSchoolPickerList(kind, placeholder) {
  const p = (placeholder && String(placeholder)) || "请选择学校";
  return [{ id: "", name: p }].concat(getSchoolsByKind(kind));
}

module.exports = {
  SCHOOLS,
  REGIONS,
  getSchoolName,
  getSchoolsByKind,
  getSchoolById,
  withSchoolPickerList
};
