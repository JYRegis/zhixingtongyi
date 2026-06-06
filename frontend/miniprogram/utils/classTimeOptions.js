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
    return { weekIds: [], slotIds: [], cells: [] };
  }

  // 1. GRID format: GRID:1-mor,2-noon
  if (s.indexOf("GRID:") === 0) {
    const partsStr = s.slice(5);
    const parts = partsStr.split(",").filter(Boolean);
    const cells = [];
    const weekIdsSet = new Set();
    const slotIdsSet = new Set();
    parts.forEach(p => {
      const sub = p.split("-");
      if (sub.length === 2) {
        const w = parseInt(sub[0], 10);
        const sl = sub[1];
        if (w >= 1 && w <= 7 && ["mor", "noon", "night"].indexOf(sl) >= 0) {
          cells.push({ week: w, slot: sl });
          weekIdsSet.add(w);
          slotIdsSet.add(sl);
        }
      }
    });
    return {
      weekIds: Array.from(weekIdsSet).sort((a, b) => a - b),
      slotIds: Array.from(slotIdsSet),
      cells: cells
    };
  }

  // 2. Legacy W:1,2|S:mor,noon format
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
    
    // Cross-product for legacy
    const cells = [];
    weekIds.forEach(w => {
      slotIds.forEach(sl => {
        cells.push({ week: w, slot: sl });
      });
    });
    return { weekIds, slotIds, cells };
  }

  // 3. JSON Array format: [{"week":1,"slot":"mor"}, ...] or [{"dayOfWeek":1,...}]
  if (s.charAt(0) === "[") {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length) {
        const weekIds = [];
        const slotIds = [];
        const cells = [];
        arr.forEach(function (m) {
          if (!m) return;
          let w = null;
          let sl = null;
          if (m.week != null) { w = Number(m.week); }
          else if (m.dayOfWeek != null) { w = Number(m.dayOfWeek); }
          
          if (m.slot) { sl = String(m.slot); }
          
          if (w >= 1 && w <= 7 && sl && ["mor", "noon", "night"].indexOf(sl) >= 0) {
            cells.push({ week: w, slot: sl });
            if (weekIds.indexOf(w) < 0) weekIds.push(w);
            if (slotIds.indexOf(sl) < 0) slotIds.push(sl);
          }
        });
        weekIds.sort(function (a, b) { return a - b; });
        return { weekIds, slotIds, cells };
      }
    } catch (e) { /* ignore */ }
  }

  // 4. Fallback legacy parser
  const legacy = parseLegacyTime(s);
  const cells = [];
  legacy.weekIds.forEach(w => {
    legacy.slotIds.forEach(sl => {
      cells.push({ week: w, slot: sl });
    });
  });
  return { weekIds: legacy.weekIds, slotIds: legacy.slotIds, cells };
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
 * @param {Array<{week: number, slot: string}>} cells
 * @returns {string}
 */
function serializeTimeGrid(cells) {
  if (!Array.isArray(cells) || cells.length === 0) {
    return "";
  }
  const sorted = cells.slice().sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    const order = { "mor": 1, "noon": 2, "night": 3 };
    return (order[a.slot] || 0) - (order[b.slot] || 0);
  });
  const parts = sorted.map(c => `${c.week}-${c.slot}`);
  return `GRID:${parts.join(",")}`;
}

/**
 * 有合法星期+时段
 */
function isValidTimeSelection(weekIds, slotIds) {
  return (weekIds || []).length > 0 && (slotIds || []).length > 0;
}

/** 人读摘要（如列表展示用） */
function displayTimeSelection(weekIds, slotIds, cells) {
  if (Array.isArray(cells) && cells.length > 0) {
    const sorted = cells.slice().sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      const order = { "mor": 1, "noon": 2, "night": 3 };
      return (order[a.slot] || 0) - (order[b.slot] || 0);
    });
    const formatted = sorted.map(c => {
      const wName = (WEEKS.find(w => w.id === c.week) || {}).name || "";
      const sName = (SLOTS.find(s => s.id === c.slot) || {}).name || "";
      return wName + sName;
    });
    if (formatted.length <= 3) {
      return formatted.join("、");
    } else {
      return formatted.slice(0, 3).join("、") + "等" + formatted.length + "个时段";
    }
  }
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
 * 将已保存串格式化为与入驻表一致的星期+时段
 * @param {string} [saved]
 * @returns {string}
 */
function formatSavedTimeForDisplay(saved) {
  const { weekIds, slotIds, cells } = parseTimeSelection(saved);
  const line = displayTimeSelection(weekIds, slotIds, cells);
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
  const { weekIds, slotIds, cells } = parseTimeSelection(saved);
  const composed = serializeTimeGrid(cells) || serializeTimeSelection(weekIds, slotIds);
  const weekList = WEEKS.slice();
  const slotList = SLOTS.slice();
  return {
    composed,
    weekIds,
    slotIds,
    cells,
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
    })),
    // Grid representing selection state for 3x7 grid
    grid: slotList.map((sl) => {
      return {
        slotId: sl.id,
        slotName: sl.name,
        cells: weekList.map((w) => {
          const isSelected = cells.some(c => c.week === w.id && c.slot === sl.id);
          return {
            weekId: w.id,
            on: isSelected
          };
        })
      };
    })
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
  serializeTimeGrid,
  isValidTimeSelection,
  displayTimeSelection,
  formatSavedTimeForDisplay,
  matchClassTimeToForm,
  composeClassTimeByIndex
};
