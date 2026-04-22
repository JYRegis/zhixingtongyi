const TAB = [
  {
    pagePath: "/pages/common/workbench/index",
    text: "工作台",
    iconPath: "../images/tabbar/workbench.png",
    selectedIconPath: "../images/tabbar/workbench-active.png"
  },
  {
    pagePath: "/pages/match/center/index",
    text: "匹配",
    iconPath: "../images/tabbar/match.png",
    selectedIconPath: "../images/tabbar/match-active.png"
  },
  {
    pagePath: "/pages/chat/list/index",
    text: "聊天",
    iconPath: "../images/tabbar/chat.png",
    selectedIconPath: "../images/tabbar/chat-active.png"
  },
  {
    pagePath: "/pages/meeting/index",
    text: "会议",
    iconPath: "../images/tabbar/meeting.png",
    selectedIconPath: "../images/tabbar/meeting-active.png"
  },
  {
    pagePath: "/pages/common/settings/index",
    text: "设置",
    iconPath: "../images/tabbar/settings.png",
    selectedIconPath: "../images/tabbar/settings-active.png"
  }
];

/** 非 app.json 的 switchTab 页，用于一级平台：用 reLaunch 进入，底栏高亮与「平台管理」主列表一致 */
const TAB_PLATFORM = {
  pagePath: "/pages/admin/platform/index",
  text: "平台",
  iconPath: "../images/tabbar/match.png",
  selectedIconPath: "../images/tabbar/match-active.png",
  useReLaunch: true
};

const { getByPhone } = require("../utils/userProfileStore");

Component({
  data: {
    list: TAB,
    selected: 0
  },
  lifetimes: {
    attached() {
      this.sync();
    }
  },
  pageLifetimes: {
    show() {
      this.sync();
    }
  },
  methods: {
    sync() {
      const app = getApp();
      const role = (app && app.globalData && app.globalData.role) || "";
      const u = (app && app.globalData && app.globalData.userInfo) || {};
      const p = getByPhone(u.phone) || u;
      const l2NoMatchTab =
        role === "admin_level_2" && (p.l2Scope === "recipient_side" || p.l2Scope === "volunteer_side");
      const isPupilOrVolunteer = role === "student" || role === "teacher";
      let list;
      if (isPupilOrVolunteer) {
        list = [TAB[0], TAB[1], TAB[2], TAB[3], TAB[4]];
      } else if (role === "admin_level_1") {
        list = [TAB[0], TAB_PLATFORM, TAB[2], TAB[4]];
      } else if (l2NoMatchTab) {
        list = [TAB[0], TAB[2], TAB[4]];
      } else {
        list = [TAB[0], TAB[1], TAB[2], TAB[4]];
      }
      const pages = getCurrentPages();
      const last = pages && pages.length ? pages[pages.length - 1] : null;
      const route = last && last.route ? String(last.route) : "";
      const full = route.indexOf("/") === 0 ? route : `/${route}`;
      let selected = -1;
      for (let i = 0; i < list.length; i += 1) {
        if (list[i].pagePath === full) {
          selected = i;
          break;
        }
      }
      this.setData({
        list: list,
        selected: selected >= 0 ? selected : 0
      });
    },
    onSwitchTab(e) {
      const d = (e.currentTarget && e.currentTarget.dataset) || {};
      const path = d.path || "";
      if (!path) {
        return;
      }
      const rel = d.relaunch;
      if (rel === 1 || rel === "1" || rel === true) {
        wx.reLaunch({ url: path });
        return;
      }
      wx.switchTab({ url: path });
    }
  }
});
