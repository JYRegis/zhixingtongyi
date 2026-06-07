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
const { isVolunteerSchool, fetchSchoolDetail } = require("../utils/schoolsMock");
const { adminApi } = require("../utils/api");

Component({
  data: {
    list: TAB,
    selected: 0,
    themeClass: "theme-guest",
    unreadCount: 0,
    chatUnreadCount: 0,
    bannerVisible: false,
    bannerTitle: "",
    bannerContent: ""
  },
  lifetimes: {
    attached() {
      this._schoolDetailRetried = false;
      this.sync();
      const self = this;
      this._unsub = notificationCenter.subscribe(function (evt) {
        if (!evt) return;
        if (evt.type === "unread-change") {
          const count = (evt.payload && evt.payload.count) || 0;
          self.setData({ unreadCount: count });
          // 未读数降到 0 时自动关闭横幅（用户在通知页点了已读后应即时反映）
          if (count === 0 && self.data.bannerVisible) {
            self.setData({ bannerVisible: false });
          }
        } else if (evt.type === "chat-unread-change") {
          self.setData({ chatUnreadCount: (evt.payload && evt.payload.count) || 0 });
        } else if (evt.type === "incoming") {
          self._showBanner(evt.payload && evt.payload.latest);
        }
      });
      // 组件挂载后主动拉一次未读，如果有则弹横幅（覆盖登录后首次进入的场景）
      try { notificationCenter.peekAndNotify(); } catch (_) {}
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
        const schoolId = u.schoolId || u.school_id || p.schoolId || p.school_id || "";
        const permissions = u.permissions || p.permissions || [];
        let isSupportSide = null;
        if (permissions.indexOf("teacher_audit") >= 0) {
          isSupportSide = true;
        } else if (permissions.indexOf("student_manage") >= 0 || permissions.indexOf("volunteer_record_audit") >= 0) {
          isSupportSide = false;
        } else {
          isSupportSide = isVolunteerSchool(schoolId);
        }
        if (isSupportSide === true) {
          // 支教方 L2：只有工作台、区域管理、设置，无解绑无聊天
          list = [TAB[0], TAB_REGION, TAB[4]];
        } else if (isSupportSide === false) {
          // 受援方 L2：工作台、区域管理、解绑、聊天、设置
          list = [TAB[0], TAB_REGION, TAB_UNBIND, TAB[2], TAB[4]];
        } else {
          // schoolId 未知或缓存未命中：默认受援方布局，异步确认后刷新（防止无限循环）
          list = [TAB[0], TAB_REGION, TAB_UNBIND, TAB[2], TAB[4]];
          if (this._schoolDetailRetried) {
            // 已经尝试过一次仍未命中，停止重试
          } else if (schoolId) {
            this._schoolDetailRetried = true;
            var self = this;
            fetchSchoolDetail(schoolId).then(function () {
              self.sync();
            }).catch(function () {});
          } else {
            this._schoolDetailRetried = true;
            var self2 = this;
            adminApi.myProfile().then(function (profile) {
              if (profile && profile.schoolId) {
                var app2 = getApp();
                if (app2 && app2.globalData && app2.globalData.userInfo) {
                  app2.globalData.userInfo.schoolId = profile.schoolId;
                }
                return fetchSchoolDetail(profile.schoolId);
              }
            }).then(function () {
              self2.sync();
            }).catch(function () {});
          }
        }
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
     * 顶部横幅：检测到新通知时弹出，持续显示直到用户点击或关闭。
     */
    _showBanner(notification) {
      const title = (notification && notification.title) || "新消息";
      const content = (notification && notification.content) || "";
      this.setData({
        bannerVisible: true,
        bannerTitle: String(title),
        bannerContent: String(content)
      });
    },
    onBannerTap() {
      this.setData({ bannerVisible: false });
      wx.navigateTo({ url: "/pages/common/notifications/index" });
    },
    onBannerClose(e) {
      // 阻止冒泡到 onBannerTap
      this.setData({ bannerVisible: false });
    }
  }
});
