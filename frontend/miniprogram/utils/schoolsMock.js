/**
 * 校与地区主数据（Mock，后续可换接口）
 * kind: support=支教方学校, recipient=受援学校
 */

const SCHOOLS = [
  { id: "sup_xmu", name: "海城大学（支教点）", kind: "support" },
  { id: "sup_ynu", name: "云州大学（支教点）", kind: "support" },
  { id: "sup_ynnu", name: "云南师范大学（实习支教）", kind: "support" },
  { id: "sup_kmu", name: "昆明学院（志愿团）", kind: "support" },
  { id: "rec_yunlong", name: "龙兴村小学", kind: "recipient" },
  { id: "rec_mengku", name: "勐库镇中学", kind: "recipient" },
  { id: "rec_hekou", name: "河口县民族小学", kind: "recipient" },
  { id: "rec_shidian", name: "施甸县第一初级中学", kind: "recipient" },
  { id: "rec_nujiang", name: "怒江州实验小学", kind: "recipient" },
  { id: "rec_lushi", name: "鲁甸县新街中学", kind: "recipient" }
];

const REGIONS = [
  { id: "reg_yunlong", name: "云州县试点片区" },
  { id: "reg_yn", name: "滇西协作区" },
  { id: "reg_nj", name: "怒江线" }
];

const SCHOOL_INDEX = {};
SCHOOLS.forEach((s) => {
  SCHOOL_INDEX[s.id] = s;
});

function getSchoolName(id) {
  const s = SCHOOL_INDEX[id];
  return s ? s.name : id || "";
}

function getSchoolsByKind(kind) {
  if (!kind) {
    return SCHOOLS.slice();
  }
  return SCHOOLS.filter((s) => s.kind === kind);
}

function getSchoolById(id) {
  return SCHOOL_INDEX[id] || null;
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
