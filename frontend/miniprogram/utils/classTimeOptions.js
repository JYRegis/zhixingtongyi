/**
 * 希望上课 / 可授课时间：星期与时段可**多选**
 * 新格式存库：W:1,2,3|S:mor,noon,night
 * 兼容旧文：如「周二 晚上」
 */

const WEEKS = [
  { id: 1, name: "周一" },
  { id: 2, name: "周二" },
  { id: 3, name: "周三" },
  { id: 4, name: "周四" },
  { id: 5, name: "周五" },
  { id: 6, name: "周六" },
  { id: 7, name: "周日" }
];

const SLOTS = [
  { id: "mor", name: "早上" },
  { id: "noon", name: "下午" },
  { id: "night", name: "晚上" }
];

function getWeeksPlain() {
  return WEEKS.slice();
}

function getSlotsPlain() {
  return SLOTS.slice();
}

/**
 * 解析为 weekIds(1-7) 与 slotId(mor|noon|night)
 * @param {string} [saved]
 */
function parseTimeSelection(saved) {
  const s = saved == null || saved === "" ? "" : String(saved).trim();
  if (!s) {
    return { weekIds: [], slotIds: [] };
  }
  const wIdx = s.indexOf("W:");
  const sIdx = s.indexOf("|S:");
  if (wIdx === 0 && sIdx > 0) {
    const wStr = s.slice(2, sIdx);
    const sStr = s.slice(sIdx + 3);
    const weekIds = wStr
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => n >= 1 && n <= 7);
    const slotIds = sStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && ["mor", "noon", "night"].indexOf(t) >= 0);
    return { weekIds, slotIds };
  }
  return parseLegacyTime(s);
}

/**
 * 旧单条「周二 晚上」等
 */
function parseLegacyTime(s) {
  let wid = 0;
  for (let i = 0; i < WEEKS.length; i += 1) {
    if (s.indexOf(WEEKS[i].name) >= 0) {
      wid = WEEKS[i].id;
      break;
    }
  }
  let slotId = "";
  if (s.indexOf("早上") >= 0 || s.indexOf("上午") >= 0) {
    slotId = "mor";
  } else if (s.indexOf("下午") >= 0) {
    slotId = "noon";
  } else if (s.indexOf("晚上") >= 0 || s.indexOf("夜晚") >= 0) {
    slotId = "night";
  }
  const weekIds = wid > 0 ? [wid] : [];
  const slotIds = slotId ? [slotId] : [];
  return { weekIds, slotIds };
}

/**
 * @param {number[]} weekIds
 * @param {string[]} slotIds
 * @returns {string}
 */
function serializeTimeSelection(weekIds, slotIds) {
  const wk = (weekIds || [])
    .filter((n) => n >= 1 && n <= 7)
    .map((n) => parseInt(n, 10))
    .filter((a, i, ar) => ar.indexOf(a) === i)
    .sort((a, b) => a - b);
  const sk = (slotIds || [])
    .filter((t) => t && ["mor", "noon", "night"].indexOf(t) >= 0)
    .filter((a, i, ar) => ar.indexOf(a) === i);
  if (wk.length === 0 || sk.length === 0) {
    return "";
  }
  return `W:${wk.join(",")}|S:${sk.join(",")}`;
}

/**
 * 有合法星期+时段
 */
function isValidTimeSelection(weekIds, slotIds) {
  return (weekIds || []).length > 0 && (slotIds || []).length > 0;
}

/** 人读摘要（如列表展示用） */
function displayTimeSelection(weekIds, slotIds) {
  if (!isValidTimeSelection(weekIds, slotIds)) {
    return "";
  }
  const wk = (weekIds || [])
    .map((n) => WEEKS.find((w) => w.id === n))
    .filter(Boolean)
    .map((o) => o.name);
  const sk = (slotIds || [])
    .map((id) => SLOTS.find((s) => s.id === id))
    .filter(Boolean)
    .map((o) => o.name);
  return (wk.length ? wk.join("、") : "") + " · " + (sk.length ? sk.join("、") : "");
}

/**
 * 将已保存串（`W:...|S:...` 或旧文「周二 晚上」）格式化为与入驻表一致的**星期+早上/下午/晚上**（非具体钟点）
 * @param {string} [saved]
 * @returns {string}
 */
function formatSavedTimeForDisplay(saved) {
  const { weekIds, slotIds } = parseTimeSelection(saved);
  const line = displayTimeSelection(weekIds, slotIds);
  if (line) {
    return line;
  }
  const t = saved == null || saved === "" ? "" : String(saved).trim();
  return t || "—";
}

/** 与旧 getWeekPickerList 兼容，仅导出纯列表给芯片 */
function getWeekPickerList() {
  return WEEKS.slice();
}
function getSlotPickerList() {
  return SLOTS.slice();
}

/**
 * 兼容已引用旧名：由多选串生成展示、芯片状态
 * @param {string} [saved]
 */
function matchClassTimeToForm(saved) {
  const { weekIds, slotIds } = parseTimeSelection(saved);
  const composed = serializeTimeSelection(weekIds, slotIds);
  const weekList = WEEKS.slice();
  const slotList = SLOTS.slice();
  return {
    composed,
    weekIds,
    slotIds,
    weekList,
    slotList,
    weekChips: weekList.map((w) => ({
      id: w.id,
      name: w.name,
      on: weekIds.indexOf(w.id) >= 0
    })),
    slotChips: slotList.map((sl) => ({
      id: sl.id,
      name: sl.name,
      on: slotIds.indexOf(sl.id) >= 0
    }))
  };
}

/** 旧单选下标合成已弃用，保留空实现避免老引用崩溃 */
function composeClassTimeByIndex() {
  return "";
}

module.exports = {
  getWeeksPlain,
  getSlotsPlain,
  getWeekPickerList,
  getSlotPickerList,
  parseTimeSelection,
  serializeTimeSelection,
  isValidTimeSelection,
  displayTimeSelection,
  formatSavedTimeForDisplay,
  matchClassTimeToForm,
  composeClassTimeByIndex
};
