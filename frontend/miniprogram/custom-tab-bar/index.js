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

/** 二级管理员专用：区域管理 */
const TAB_REGION = {
  pagePath: "/pages/admin/region/index",
  text: "区域",
  iconPath: "../images/tabbar/match.png",
  selectedIconPath: "../images/tabbar/match-active.png",
  useReLaunch: true
};

/** 二级管理员专用：解绑确认 */
const TAB_UNBIND = {
  pagePath: "/pages/match/unbind/index",
  text: "解绑",
  iconPath: "../images/tabbar/meeting.png",
  selectedIconPath: "../images/tabbar/meeting-active.png",
  useReLaunch: true
};

const { getByPhone } = require("../utils/userProfileStore");
const { getRoleThemeClass, getEffectiveRoleForTheme, getPageRoleThemeClass } = require("../utils/roleTheme");
const notificationCenter = require("../utils/notificationCenter");

Component({
  data: {
    list: TAB,
    selected: 0,
    themeClass: "theme-guest",
    unreadCount: 0,
    bannerVisible: false,
    bannerTitle: "",
    bannerContent: ""
  },
  lifetimes: {
    attached() {
      this.sync();
      const self = this;
      this._unsub = notificationCenter.subscribe(function (evt) {
        if (!evt) return;
        if (evt.type === "unread-change") {
          self.setData({ unreadCount: (evt.payload && evt.payload.count) || 0 });
        } else if (evt.type === "incoming") {
          self._showBanner(evt.payload && evt.payload.latest);
        }
      });
    },
    detached() {
      if (typeof this._unsub === "function") {
        try { this._unsub(); } catch (_) {}
        this._unsub = null;
      }
      if (this._bannerTimer) {
        clearTimeout(this._bannerTimer);
        this._bannerTimer = null;
      }
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
      const role = getEffectiveRoleForTheme() || "";
      const u = (app && app.globalData && app.globalData.userInfo) || {};
      const p = getByPhone(u.phone) || u;
      const isPupilOrVolunteer = role === "student" || role === "teacher";
      let list;
      if (isPupilOrVolunteer) {
        list = [TAB[0], TAB[1], TAB[2], TAB[3], TAB[4]];
      } else if (role === "admin_level_1") {
        list = [TAB[0], TAB_PLATFORM, TAB[2], TAB[4]];
      } else if (role === "admin_level_2") {
        list = [TAB[0], TAB_REGION, TAB_UNBIND, TAB[2], TAB[4]];
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
      const themeClass = getPageRoleThemeClass();
      this.setData({
        list: list,
        selected: selected >= 0 ? selected : 0,
        themeClass: themeClass
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
    },
    /**
     * 顶部横幅：检测到新通知时弹出，3.5s 自动收起，可点击进入通知页。
     */
    _showBanner(notification) {
      const title = (notification && notification.title) || "新消息";
      const content = (notification && notification.content) || "";
      this.setData({
        bannerVisible: true,
        bannerTitle: String(title),
        bannerContent: String(content)
      });
      if (this._bannerTimer) clearTimeout(this._bannerTimer);
      const self = this;
      this._bannerTimer = setTimeout(function () {
        self.setData({ bannerVisible: false });
        self._bannerTimer = null;
      }, 3500);
    },
    onBannerTap() {
      this.setData({ bannerVisible: false });
      if (this._bannerTimer) {
        clearTimeout(this._bannerTimer);
        this._bannerTimer = null;
      }
      wx.navigateTo({ url: "/pages/common/notifications/index" });
    },
    onBannerClose(e) {
      // 阻止冒泡到 onBannerTap
      this.setData({ bannerVisible: false });
      if (this._bannerTimer) {
        clearTimeout(this._bannerTimer);
        this._bannerTimer = null;
      }
    }
  }
});
