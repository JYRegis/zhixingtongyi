/**
 * 校与地区主数据（Mock，可改 id 以与本地库 school 表主键一致）
 * 后端 school.type: 0=乡村学校（受援方/学员），1=高校（支教方/志愿者）
 * 前端 kind: "support"=支教方学校(type=1), "recipient"=受援学校(type=0)
 * id: 与后端 `school_id` 对齐，请为 Long 主键
 *
 * 当后端 GET /schools 可用时，建议使用 fetchSchools() 获取远程数据。
 * 本文件保留作为后端不可用时的兜底。
 */

const { schoolApi } = require("./api");

/** 后端 school.type 枚举值 */
const SCHOOL_TYPE_RURAL = 0;      // 乡村学校（受援方）
const SCHOOL_TYPE_VOLUNTEER = 1;  // 高校（支教方/志愿者）

/** 同济大学 schoolId（兜底/向后兼容用，新代码应使用 isVolunteerSchool 判断） */
const TONGJI_SCHOOL_ID = 9004;
const TONGJI_SCHOOL_NAME = "同济大学";

const SCHOOLS = [
  { id: 1, name: "海城大学（支教点）", kind: "support", type: 1 },
  { id: 2, name: "云州大学（支教点）", kind: "support", type: 1 },
  { id: 3, name: "云南师范大学（实习支教）", kind: "support", type: 1 },
  { id: 4, name: "昆明学院（志愿团）", kind: "support", type: 1 },
  { id: 5, name: "龙兴村小学", kind: "recipient", type: 0 },
  { id: 6, name: "勐库镇中学", kind: "recipient", type: 0 },
  { id: 7, name: "河口县民族小学", kind: "recipient", type: 0 },
  { id: 8, name: "施甸县第一初级中学", kind: "recipient", type: 0 },
  { id: 9, name: "怒江州实验小学", kind: "recipient", type: 0 },
  { id: 10, name: "鲁甸县新街中学", kind: "recipient", type: 0 }
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

/**
 * 从后端获取学校列表，失败时回退本地 Mock
 * @param {object} [params] 可选筛选参数。传入 { kind: "recipient" } 或 { type: 0 }
 * @returns {Promise<Array>} 学校列表
 */
function fetchSchools(params) {
  const token = wx.getStorageSync("token") || "";
  const kind = params && params.kind;
  // 将前端 kind 映射为后端 type 参数
  var apiParams = Object.assign({}, params || {});
  if (kind && apiParams.type == null) {
    apiParams.type = kind === "recipient" ? SCHOOL_TYPE_RURAL : SCHOOL_TYPE_VOLUNTEER;
  }
  delete apiParams.kind;
  if (!token) {
    const local = SCHOOLS.slice();
    return Promise.resolve(kind === "recipient" ? local.filter((s) => s.kind === "recipient") : kind === "support" ? local.filter((s) => s.kind === "support") : local);
  }
  return schoolApi.list(apiParams).then(function (res) {
    const list = Array.isArray(res) ? res : (res && (res.records || res.list)) || [];
    if (list.length === 0) {
      const local = SCHOOLS.slice();
      return kind === "recipient" ? local.filter((s) => s.kind === "recipient") : kind === "support" ? local.filter((s) => s.kind === "support") : local;
    }
    // 更新本地缓存，同时补充 kind 字段
    list.forEach(function (s) {
      if (s && s.id) {
        if (s.type != null && !s.kind) {
          s.kind = Number(s.type) === SCHOOL_TYPE_VOLUNTEER ? "support" : "recipient";
        }
        SCHOOL_INDEX[s.id] = s;
        SCHOOL_INDEX[String(s.id)] = s;
      }
    });
    return list;
  }).catch(function () {
    const local = SCHOOLS.slice();
    return kind === "recipient" ? local.filter((s) => s.kind === "recipient") : kind === "support" ? local.filter((s) => s.kind === "support") : local;
  });
}

/** @deprecated 支教方不再只有同济一所，保留向后兼容 */
function getTongjiSchool() {
  return { id: TONGJI_SCHOOL_ID, name: TONGJI_SCHOOL_NAME, kind: "support", type: 1 };
}

/**
 * 从后端获取单个学校详情，失败时回退本地 Mock
 * @param {number|string} schoolId
 * @returns {Promise<object|null>}
 */
function fetchSchoolDetail(schoolId) {
  if (schoolId == null || schoolId === "") {
    return Promise.resolve(null);
  }
  const token = wx.getStorageSync("token") || "";
  if (!token) {
    return Promise.resolve(getSchoolById(schoolId));
  }
  return schoolApi.detail(schoolId).then(function (res) {
    if (res && res.id) {
      if (res.type != null && !res.kind) {
        res.kind = Number(res.type) === SCHOOL_TYPE_VOLUNTEER ? "support" : "recipient";
      }
      SCHOOL_INDEX[res.id] = res;
      SCHOOL_INDEX[String(res.id)] = res;
    }
    return res || getSchoolById(schoolId);
  }).catch(function () {
    return getSchoolById(schoolId);
  });
}

/**
 * 判断某学校是否为支教方（志愿者）学校。
 * 优先从缓存读取，缓存未命中时返回 null（调用方应先 fetchSchoolDetail 再判断）。
 * @param {number|string} schoolId
 * @returns {boolean|null} true=支教方, false=受援方, null=未知
 */
function isVolunteerSchool(schoolId) {
  if (schoolId == null || schoolId === "") return null;
  var s = SCHOOL_INDEX[schoolId] || SCHOOL_INDEX[String(schoolId)];
  if (!s) return null;
  if (s.type != null) return Number(s.type) === SCHOOL_TYPE_VOLUNTEER;
  if (s.kind) return s.kind === "support";
  return null;
}

module.exports = {
  SCHOOLS,
  REGIONS,
  SCHOOL_TYPE_RURAL,
  SCHOOL_TYPE_VOLUNTEER,
  TONGJI_SCHOOL_ID,
  TONGJI_SCHOOL_NAME,
  getTongjiSchool,
  getSchoolName,
  getSchoolsByKind,
  getSchoolById,
  withSchoolPickerList,
  fetchSchools,
  fetchSchoolDetail,
  isVolunteerSchool
};
