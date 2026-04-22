/**
 * 为「学校老师」账号写入二级管辖（支教方 / 受援方 + 学校）
 * 与学校老师待审「通过」弹窗共用；后台改派学校请对接你们自有端。
 */
const { saveProfile } = require("./userProfileStore");

const SCOPE_OPTIONS = [
  { value: "volunteer_side", label: "支教方二级", desc: "审本支教点学校的志愿者注册" },
  { value: "recipient_side", label: "受援方二级", desc: "审本受援校学生注册、认定义务时长" }
];

/**
 * @param {string} phone
 * @param {object} opt
 * @param {"volunteer_side"|"recipient_side"} opt.l2Scope
 * @param {{ id: string, name?: string } | null} [opt.supportSchool] 支教方时必传
 * @param {{ id: string, name?: string } | null} [opt.recipientSchool] 受援方时必传
 * @returns {{ ok: boolean, message?: string }}
 */
function applyL2ScopeToTeacher(phone, opt) {
  if (!phone) {
    return { ok: false, message: "未指定手机号" };
  }
  if (!opt || !opt.l2Scope) {
    return { ok: false, message: "未选择范围" };
  }
  if (opt.l2Scope === "volunteer_side") {
    const s = opt.supportSchool;
    if (!s || !s.id) {
      return { ok: false, message: "请选择支教点学校" };
    }
    saveProfile(String(phone), {
      l2Scope: "volunteer_side",
      supportSchoolIds: [s.id],
      recipientTargetIds: []
    });
    return { ok: true };
  }
  if (opt.l2Scope === "recipient_side") {
    const s = opt.recipientSchool;
    if (!s || !s.id) {
      return { ok: false, message: "请选择受援校" };
    }
    saveProfile(String(phone), {
      l2Scope: "recipient_side",
      supportSchoolIds: [],
      recipientTargetIds: [s.id]
    });
    return { ok: true };
  }
  return { ok: false, message: "范围参数无效" };
}

module.exports = {
  SCOPE_OPTIONS,
  applyL2ScopeToTeacher
};
