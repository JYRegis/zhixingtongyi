/**
 * 演示数据：已结对对象与初始聊天记录（正式环境由接口返回）。
 * 聊天记录按 partnerId 分桶存入本地 storage。
 */

const STORAGE_PREFIX = "zhixing_chat_";

/** @type {Record<string, { partnerId: string, name: string, tag: string, lastPreview: string, lastTime: string }[]>} */
const PAIRED_LIST = {
  student: [
    {
      partnerId: "vol_001",
      name: "王同学",
      tag: "数学 · 结对中",
      lastPreview: "今晚 8 点我们复习函数。",
      lastTime: "昨天"
    },
    {
      partnerId: "vol_002",
      name: "李同学",
      tag: "英语 · 结对中",
      lastPreview: "记得带上七年级上册单词表。",
      lastTime: "周日"
    }
  ],
  teacher: [
    {
      partnerId: "stu_001",
      name: "小芳",
      tag: "乡村学员 · 七年级",
      lastPreview: "好的老师，我会提前准备。",
      lastTime: "昨天"
    }
  ],
  admin_level_2: [
    {
      partnerId: "stu_proxy_01",
      name: "小军（您代管）",
      tag: "代管学员账号",
      lastPreview: "老师，今天的作业已完成。",
      lastTime: "周一"
    }
  ],
  admin_level_1: []
};

/** @type {Record<string, { id: number, from: string, text: string, time: string, isSelf: boolean }[]>} */
const SEED_MESSAGES = {
  vol_001: [
    { id: 101, from: "王同学", text: "你好，今晚 8 点我们复习函数。", time: "19:30", isSelf: false },
    { id: 102, from: "我", text: "好的老师，我会提前准备。", time: "19:32", isSelf: true }
  ],
  vol_002: [
    { id: 201, from: "李同学", text: "记得带上七年级上册单词表。", time: "10:12", isSelf: false }
  ],
  stu_001: [
    { id: 301, from: "小芳", text: "老师好，我想问一下作文怎么立意。", time: "09:00", isSelf: false },
    { id: 302, from: "我", text: "可以先列三个关键词再展开。", time: "09:05", isSelf: true }
  ],
  stu_proxy_01: [
    { id: 401, from: "小军", text: "老师，今天的作业已完成。", time: "18:20", isSelf: false }
  ]
};

function storageKey(partnerId) {
  return `${STORAGE_PREFIX}${partnerId}`;
}

function loadThread(partnerId) {
  const key = storageKey(partnerId);
  const saved = wx.getStorageSync(key);
  if (saved && Array.isArray(saved) && saved.length) {
    return saved;
  }
  const seed = SEED_MESSAGES[partnerId];
  return seed ? JSON.parse(JSON.stringify(seed)) : [];
}

function saveThread(partnerId, messages) {
  wx.setStorageSync(storageKey(partnerId), messages);
}

function getPairedList(role) {
  return PAIRED_LIST[role] || [];
}

module.exports = {
  getPairedList,
  loadThread,
  saveThread
};
