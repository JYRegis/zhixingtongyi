/**
 * 会议：后端 MeetingItemVO / MeetingCreateRequest <-> 小程序 meeting 列表与表单
 */

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

/** 后端 LocalDateTime JSON 常为 "2025-04-22T20:00:00" 或带毫秒 */
function parseBackendDateTime(v) {
  if (v == null) {
    return NaN;
  }
  if (typeof v === "number" && !isNaN(v)) {
    return v;
  }
  const s = String(v);
  const t = Date.parse(s.replace(" ", "T"));
  return t;
}

function formatLocalDateTime(ms) {
  const d = new Date(ms);
  if (isNaN(d.getTime())) {
    return "";
  }
  return (
    d.getFullYear() +
    "-" +
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate()) +
    " " +
    pad2(d.getHours()) +
    ":" +
    pad2(d.getMinutes()) +
    ":" +
    pad2(d.getSeconds())
  );
}

/** 与 MeetingServiceImpl#create 一致：空格可被 replace 成 T */
function toApiDateTimeString(ms) {
  const s = formatLocalDateTime(ms);
  return s || "";
}

function meetingStatusLabel(status) {
  const n = status == null ? null : Number(status);
  if (n === 0) {
    return "待开始";
  }
  if (n === 1) {
    return "进行中";
  }
  if (n === 2) {
    return "已结束";
  }
  return n != null && !isNaN(n) ? "状态" + n : "—";
}

/**
 * GET /meetings/my 单条 → meetingStore 列表项同构（供 splitNextAndHistory）
 * @param {object} vo MeetingItemVO
 */
function meetingItemVoToListRow(vo) {
  const startMs = parseBackendDateTime(vo && (vo.startTime != null ? vo.startTime : vo.start_time));
  const endMs = parseBackendDateTime(vo && (vo.endTime != null ? vo.endTime : vo.end_time));
  const id = vo && (vo.id != null ? vo.id : vo.meetingId);
  const matchPairId = vo && (vo.matchPairId != null ? vo.matchPairId : vo.match_pair_id);
  const topic = (vo && vo.topic) != null ? String(vo.topic) : "会议";
  return {
    id: id != null ? "srv_" + id : "srv_0",
    _serverId: id != null ? Number(id) : null,
    title: topic,
    startTimeMs: isNaN(startMs) ? Date.now() : startMs,
    _endTimeMs: isNaN(endMs) ? null : endMs,
    roomLink: (vo && vo.meetingLink) != null ? String(vo.meetingLink) : (vo && vo.meeting_link) || "",
    pairId: matchPairId != null ? String(matchPairId) : "",
    pairLine: "结对 #" + (matchPairId != null ? matchPairId : "—"),
    createdByPhone: "",
    creatorRole: "",
    status: meetingStatusLabel(vo && vo.status != null ? vo.status : vo.meeting_status)
  };
}

/**
 * @param {object} p
 * @param {number} p.matchPairId
 * @param {string} p.topic
 * @param {number} p.startTimeMs
 * @param {number} p.endTimeMs
 * @param {string} p.meetingLink
 */
function buildMeetingCreateRequest(p) {
  return {
    matchPairId: Number(p.matchPairId),
    topic: String(p.topic || "").trim() || "会议",
    startTime: toApiDateTimeString(p.startTimeMs),
    endTime: toApiDateTimeString(p.endTimeMs),
    meetingLink: String(p.meetingLink || "").trim()
  };
}

/**
 * 将 PairDetailVO[] 转为建会下拉的 { id, name }[]
 * @param {Array<{ id: number, studentId?: number, teacherId?: number, matchStatus?: number }>} pairs
 */
function pairDetailsToFormOptions(pairs) {
  const list = Array.isArray(pairs) ? pairs : [];
  return list.map(function (p) {
    const id = p && p.id != null ? p.id : 0;
    const sid = p && p.studentId != null ? p.studentId : "—";
    const tid = p && p.teacherId != null ? p.teacherId : "—";
    return {
      id: String(id),
      name: "结对 #" + id + "（学员 " + sid + " · 教师 " + tid + "）"
    };
  });
}

module.exports = {
  meetingItemVoToListRow,
  buildMeetingCreateRequest,
  pairDetailsToFormOptions,
  formatLocalDateTime,
  toApiDateTimeString,
  meetingStatusLabel,
  parseBackendDateTime
};
