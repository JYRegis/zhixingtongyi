/**
 * 解绑：PairDetailVO / UnbindProgressVO <-> 解绑页展示（与本地 activeRequest 形态兼容）
 */

function matchStatusLine(ms) {
  const n = ms == null ? -1 : Number(ms);
  if (n === 0) {
    return { status: "待审核", tag: "待结对处理" };
  }
  if (n === 1) {
    return { status: "结对中", tag: "" };
  }
  if (n === 2) {
    return { status: "已拒绝", tag: "申请" };
  }
  if (n === 3) {
    return { status: "解绑流程中", tag: "解绑" };
  }
  if (n === 4) {
    return { status: "已解绑", tag: "已结束" };
  }
  if (n === 5) {
    return { status: "解绑有异议", tag: "待处理" };
  }
  return { status: "状态" + n, tag: "" };
}

/**
 * @param {Array<{ id: number, studentId: number, teacherId: number, matchStatus: number }>} pairs
 */
function pairVosToUnbindList(pairs) {
  const list = Array.isArray(pairs) ? pairs : [];
  return list.map(function (vo) {
    const id = vo && vo.id != null ? vo.id : 0;
    const sid = vo && vo.studentId != null ? vo.studentId : "—";
    const tid = vo && vo.teacherId != null ? vo.teacherId : "—";
    const m = matchStatusLine(vo && vo.matchStatus);
    return {
      pairId: String(id),
      lineName: "结对 #" + id + "（学员 " + sid + " · 志愿者 " + tid + "）",
      tag: m.tag,
      status: m.status,
      matchStatus: vo && vo.matchStatus,
      _studentId: vo && vo.studentId,
      _teacherId: vo && vo.teacherId
    };
  });
}

/**
 * @param {object} prog UnbindProgressVO
 * @param {{ studentId: number, teacherId: number }} pairHint
 */
function unbindProgressToActiveRequest(prog, pairHint) {
  if (!prog) {
    return null;
  }
  const ms = prog.matchStatus;
  const pending = ms === 3 || ms === 5;
  const sid = pairHint && pairHint.studentId;
  const tid = pairHint && pairHint.teacherId;
  return {
    id: "api_" + (prog.pairId != null ? prog.pairId : ""),
    status: pending ? "pending_approval" : "other",
    fromRole: "teacher",
    studentName: sid != null ? "学员（ID " + sid + "）" : "—",
    partnerName: tid != null ? "志愿者（ID " + tid + "）" : "—",
    reason: "（远程解绑流程；详细原因以服务端为准）",
    initiatorLabel: "某一方",
    agree: {
      student: (prog.studentUnbindConfirm || 0) === 1,
      teacher: (prog.teacherUnbindConfirm || 0) === 1,
      l2: (prog.adminUnbindConfirm || 0) === 1
    }
  };
}

module.exports = {
  pairVosToUnbindList,
  unbindProgressToActiveRequest,
  matchStatusLine
};
