const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { getByPhone, saveProfile } = require("../../../utils/userProfileStore");
const { authApi, studentApi, teacherApi } = require("../../../utils/api");
const { intToAppRole, appRoleToRoleApplyTarget } = require("../../../utils/backendRole");
const { USE_BACKEND_ONBOARDING } = require("../../../config/demoBackend");
const { removeApplicationsForApplicant } = require("../../../utils/onboardingStore");
const { ingestDebugLog } = require("../../../utils/debugSessionIngest");

const STORAGE_PHONES = "zhixing_saved_phones";

function numOrNull(v) {
  if (v == null || v === "") {
    return null;
  }
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
/** 登录响应中的学员审核态（与 GET /student/profile 一致，避免二次请求失败时无法写本机 approved） */
function pickStudentAuditFromLoginUser(loginUser) {
  if (!loginUser) {
    return null;
  }
  return numOrNull(
    loginUser.studentAuditStatus != null ? loginUser.studentAuditStatus : loginUser.student_audit_status
  );
}
function pickTeacherCertFromLoginUser(loginUser) {
  if (!loginUser) {
    return null;
  }
  return numOrNull(
    loginUser.teacherCertificationStatus != null
      ? loginUser.teacherCertificationStatus
      : loginUser.teacher_certification_status
  );
}
function applyStudentAuditToLocalOnboarding(phone, audit) {
  if (audit == null) {
    return;
  }
  if (audit === 1) {
    saveProfile(phone, { onboardingStatus: "approved" });
  } else if (audit === 0) {
    saveProfile(phone, { onboardingStatus: "pending" });
  } else if (audit === 2) {
    saveProfile(phone, { onboardingStatus: "rejected" });
  }
  removeApplicationsForApplicant(phone);
}
function applyTeacherCertToLocalOnboarding(phone, cert) {
  if (cert == null) {
    return;
  }
  if (cert === 1) {
    saveProfile(phone, { onboardingStatus: "approved" });
  } else if (cert === 0) {
    saveProfile(phone, { onboardingStatus: "pending" });
  } else if (cert === 2) {
    saveProfile(phone, { onboardingStatus: "rejected" });
  }
  removeApplicationsForApplicant(phone);
}
function pickAuditFromStudentVo(raw) {
  if (!raw) {
    return null;
  }
  /** 若误把整段 ApiResponse 当 vo 传入，从 data 解包 */
  const vo =
    raw.data && typeof raw.data === "object" && raw.auditStatus == null && raw.audit_status == null
      ? raw.data
      : raw;
  return numOrNull(vo.auditStatus != null ? vo.auditStatus : vo.audit_status);
}
function pickCertFromTeacherVo(raw) {
  if (!raw) {
    return null;
  }
  const vo =
    raw.data && typeof raw.data === "object" && raw.certificationStatus == null && raw.certification_status == null
      ? raw.data
      : raw;
  return numOrNull(
    vo.certificationStatus != null ? vo.certificationStatus : vo.certification_status
  );
}

Page({
  data: {
    role: "",
    roleName: "",
    isLogin: false,
    fromProfile: false,
    savedPhoneItems: [],
    selectedPhone: "",
    manualPhone: "",
    showManualPhone: false,
    nickname: "",
    avatarUrl: "",
    toptipMsg: "",
    toptipType: "error",
    toptipShow: false,
    _roleThemeClass: ""
  },
  onToptipHide() {
    this.setData({ toptipShow: false, toptipMsg: "" });
  },
  showToptip(msg, type) {
    this.setData({
      toptipMsg: String(msg || ""),
      toptipType: type || "error",
      toptipShow: !!msg
    });
  },
  onLoad(query) {
    this._returnTo = ((query && query.returnTo) || "").trim();
    const fromProfile = this._returnTo === "profile";
    const role = (query.role || "").trim();
    if (!role) {
      wx.showModal({
        title: "提示",
        content: "请先在首页选择您的身份。",
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    let isLogin = String((query && query.flow) || "") === "login";
    if (query && query.prefill === "1") {
      isLogin = false;
    }
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "用户",
      isLogin: isLogin,
      fromProfile: fromProfile
    });
    try {
      wx.setNavigationBarTitle({ title: isLogin ? "登录" : "注册" });
    } catch (e) {
      // ignore
    }
    this.loadSavedPhones();
    if (query.prefill === "1") {
      const u = getApp().globalData.userInfo || {};
      const phone = (u.phone || "").replace(/\D/g, "").slice(0, 11);
      this.setData({
        nickname: (u.nickname || "").trim(),
        avatarUrl: (u.avatarUrl || "").trim(),
        manualPhone: phone,
        selectedPhone: phone.length === 11 ? phone : "",
        showManualPhone: phone.length === 11
      });
    }
  },
  onShow() {
    const t = this.data.isLogin ? "登录" : "注册";
    try {
      wx.setNavigationBarTitle({ title: t });
    } catch (e) {
      // ignore
    }
    // 确保登录页面根据当前登录状态应用正确的主题颜色
    const themeClass = require("../../../utils/roleTheme").getPageRoleThemeClass();
    if (this.data._roleThemeClass !== themeClass) {
      this.setData({ _roleThemeClass: themeClass });
    }
  },
  onSwitchFlow(e) {
    const raw = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tologin;
    const toLogin = raw === true || raw === "true";
    const r = this.data.role || "";
    if (!r) {
      return;
    }
    wx.redirectTo({
      url:
        "/pages/common/auth/index?role=" +
        encodeURIComponent(r) +
        (toLogin ? "&flow=login" : "&flow=register")
    });
  },
  loadSavedPhones() {
    const raw = wx.getStorageSync(STORAGE_PHONES) || [];
    const list = Array.isArray(raw) ? raw : [];
    const savedPhoneItems = list.map((phone) => ({
      phone,
      display: String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
    }));
    this.setData({ savedPhoneItems });
  },
  persistPhones(phones) {
    wx.setStorageSync(STORAGE_PHONES, phones.slice(0, 5));
    this.loadSavedPhones();
  },
  onSelectSavedPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    this.setData({
      selectedPhone: phone,
      manualPhone: phone,
      showManualPhone: false
    });
  },
  onShowManualInput() {
    this.setData({
      showManualPhone: true,
      selectedPhone: "",
      manualPhone: ""
    });
  },
  onManualPhoneInput(e) {
    const v = (e.detail.value || "").replace(/\D/g, "").slice(0, 11);
    this.setData({
      manualPhone: v,
      selectedPhone: v.length === 11 ? v : ""
    });
  },
  /**
   * 微信手机号快速验证：真实环境需用 e.detail.code 调后端换明文。
   */
  onGetPhoneNumber(e) {
    const d = e.detail || {};
    if (d.errMsg && d.errMsg.indexOf("fail") !== -1) {
      this.showToptip("已取消授权，可手动输入", "info");
      return;
    }
    if (d.code) {
      const demoPhone = "13900000000";
      wx.showToast({ title: "已自动填入手机号", icon: "none" });
      this.applyPhoneAndSave(demoPhone);
      return;
    }
    wx.showToast({ title: "请手动输入或使用已保存号码", icon: "none" });
  },
  applyPhoneAndSave(phone) {
    const p = String(phone).replace(/\D/g, "").slice(0, 11);
    if (p.length !== 11) {
      return;
    }
    let list = wx.getStorageSync(STORAGE_PHONES) || [];
    if (!Array.isArray(list)) {
      list = [];
    }
    const next = [p, ...list.filter((x) => x !== p)].slice(0, 5);
    this.persistPhones(next);
    this.setData({
      manualPhone: p,
      selectedPhone: p,
      showManualPhone: false
    });
  },
  onChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl;
    if (url) {
      this.setData({ avatarUrl: url });
    }
  },
  onNicknameInput(e) {
    this.setData({ nickname: (e.detail.value || "").trim() });
  },
  onNicknameBlur(e) {
    this.setData({ nickname: (e.detail.value || "").trim() });
  },
  /**
   * 仅本地档案登录（无后端或用户选择「仅本地演示」时）
   */
  _applyLocalLogin(phone) {
    const app = getApp();
    if (this.data.isLogin) {
      this.applyPhoneAndSave(phone);
      const prof = getByPhone(phone) || {};
      const last4 = phone.slice(-4);
      const nick =
        (prof.nickname && String(prof.nickname).trim()) ||
        (prof.name && String(prof.name).trim()) ||
        (prof.nickName && String(prof.nickName).trim()) ||
        "用户" + last4;
      const avatarUrl = String(prof.avatarUrl || "").trim();
      app.setLogin(this.data.role, {
        nickname: nick,
        avatarUrl: avatarUrl || this.data.avatarUrl || "",
        phone,
        role: this.data.role
      });
    } else {
      const nickname = (this.data.nickname || "").trim();
      if (!nickname) {
        this.showToptip("请填写昵称", "error");
        return;
      }
      this.applyPhoneAndSave(phone);
      app.setLogin(this.data.role, {
        nickname,
        avatarUrl: this.data.avatarUrl || "",
        phone,
        role: this.data.role
      });
    }
    this._finishAfterLogin();
  },

  /**
   * 手机号登录成功后：用后端档案覆盖本机 onboardingStatus，避免仍被 onboardingGuard 赶去填表。
   * 依赖 config USE_BACKEND_ONBOARDING；失败不阻断登录。
   */
  _syncOnboardingFromBackend(phone, appRole, loginUser) {
    // #region agent log
    try {
      ingestDebugLog({
        hypothesisId: "H1",
        location: "auth/index.js:_syncOnboardingFromBackend:entry",
        message: "sync entry",
        data: {
          useBackend: USE_BACKEND_ONBOARDING,
          appRole: appRole || "",
          loginKeys: loginUser ? Object.keys(loginUser).join(",") : "",
          pickStudent: pickStudentAuditFromLoginUser(loginUser),
          hasProfileFlag: loginUser && loginUser.hasProfile
        },
        runId: "pre-fix"
      });
    } catch (e) {
      // ignore
    }
    // #endregion
    if (!USE_BACKEND_ONBOARDING || !phone) {
      return Promise.resolve();
    }
    if (appRole === "admin_level_1" || appRole === "admin_level_2") {
      saveProfile(phone, { onboardingStatus: "approved" });
      removeApplicationsForApplicant(phone);
      return Promise.resolve();
    }
    // 即使 hasProfile 为 true，也避免强制跳转到申请页面，信任后端返回的登录状态
    if (appRole === "student") {
      const fromLogin = pickStudentAuditFromLoginUser(loginUser);
      if (fromLogin != null) {
        applyStudentAuditToLocalOnboarding(phone, fromLogin);
        return Promise.resolve();
      }
      if (loginUser && loginUser.hasProfile) {
        // 如果后端返回 hasProfile 为 true，则认为已完成入驻，避免重复申请
        saveProfile(phone, { onboardingStatus: "approved" });
        removeApplicationsForApplicant(phone);
        return Promise.resolve();
      }
      return studentApi.getProfile().then(
        function (vo) {
          const a = pickAuditFromStudentVo(vo);
          // #region agent log
          try {
            ingestDebugLog({
              hypothesisId: "H2",
              location: "auth/index.js:nthProfile:ok",
              message: "student getProfile",
              data: { audit: a, voKeys: vo ? Object.keys(vo).join(",") : "" },
              runId: "pre-fix"
            });
          } catch (e) {
            // ignore
          }
          // #endregion
          if (a == null) {
            return;
          }
          applyStudentAuditToLocalOnboarding(phone, a);
        },
        function (err) {
          // #region agent log
          try {
            ingestDebugLog({
              hypothesisId: "H2",
              location: "auth/index.js:nthProfile:fail",
              message: "student getProfile failed",
              data: { errMsg: (err && err.message) || "", network: !!(err && err.network) },
              runId: "pre-fix"
            });
          } catch (e) {
            // ignore
          }
          // #endregion
          /* 网络或鉴权失败：保持本机原态；登录响应未带 studentAuditStatus 时仍可能为 none */
        }
      );
    }
    if (appRole === "teacher") {
      const fromLoginT = pickTeacherCertFromLoginUser(loginUser);
      if (fromLoginT != null) {
        applyTeacherCertToLocalOnboarding(phone, fromLoginT);
        return Promise.resolve();
      }
      if (loginUser && loginUser.hasProfile) {
        // 如果后端返回 hasProfile 为 true，则认为已完成入驻，避免重复申请
        saveProfile(phone, { onboardingStatus: "approved" });
        removeApplicationsForApplicant(phone);
        return Promise.resolve();
      }
      return teacherApi.getProfile().then(
        function (vo) {
          const c = pickCertFromTeacherVo(vo);
          if (c == null) {
            return;
          }
          applyTeacherCertToLocalOnboarding(phone, c);
        },
        function () {
          /* ignore */
        }
      );
    }
    return Promise.resolve();
  },

  _finishAfterLogin() {
    const backToProfile = this._returnTo === "profile";
    let okTitle = "完成";
    if (backToProfile) {
      okTitle = "已更新";
    } else if (this.data.isLogin) {
      okTitle = "登录成功";
    } else {
      okTitle = "注册成功";
    }
    wx.hideLoading();
    wx.showToast({ title: okTitle, icon: "success" });
    setTimeout(() => {
      if (backToProfile) {
        wx.navigateBack({
          fail: function () {
            wx.redirectTo({ url: "/pages/common/profile/index" });
          }
        });
        return;
      }
      wx.switchTab({ url: "/pages/common/workbench/index" });
    }, 400);
  },

  /**
   * 使用 zhixingtongyi-zyh 后端：POST /auth/phone-login，注册时支教身份再调 /auth/role-apply 并二次 phone-login 刷新 Token
   */
  onSubmit() {
    const phone = (this.data.manualPhone || this.data.selectedPhone || "").replace(/\D/g, "").slice(0, 11);
    if (!/^1\d{10}$/.test(phone)) {
      this.showToptip("请填写 11 位大陆手机号", "error");
      return;
    }
    if (!this.data.isLogin) {
      const nickname = (this.data.nickname || "").trim();
      if (!nickname) {
        this.showToptip("请填写昵称", "error");
        return;
      }
    }

    wx.showLoading({ title: "登录中…", mask: true });

    const selectedRole = this.data.role;
    const isAdminPick = selectedRole === "admin_level_1" || selectedRole === "admin_level_2";
    const nickPayload = (this.data.nickname || "").trim();
    const avatarPayload = (this.data.avatarUrl || "").trim();

    const phonePayload = {
      phone,
      nickName: this.data.isLogin ? (getByPhone(phone) && getByPhone(phone).nickname) || nickPayload || undefined : nickPayload,
      avatarUrl: this.data.isLogin ? (getByPhone(phone) && getByPhone(phone).avatarUrl) || avatarPayload || undefined : avatarPayload
    };
    if (!phonePayload.nickName && !this.data.isLogin) {
      phonePayload.nickName = nickPayload;
    }
    if (!phonePayload.avatarUrl) {
      phonePayload.avatarUrl = avatarPayload || "";
    }

    const self = this;
    authApi
      .phoneLogin(phonePayload)
      .then(function (login) {
        if (!login || !login.token) {
          throw new Error("登录响应缺少 token");
        }
        const app = getApp();
        app.globalData.token = login.token;
        wx.setStorageSync("token", login.token);

        const runRoleApplyAndRelogin = function () {
          if (self.data.isLogin) {
            return Promise.resolve(login);
          }
          if (selectedRole !== "teacher") {
            return Promise.resolve(login);
          }
          const target = appRoleToRoleApplyTarget("teacher");
          return authApi.roleApply(target).then(function () {
            return authApi.phoneLogin({
              phone,
              nickName: phonePayload.nickName,
              avatarUrl: phonePayload.avatarUrl || ""
            });
          });
        };

        const checkAdminMismatch = function (finalLogin) {
          if (!isAdminPick) {
            return finalLogin;
          }
          const sr = intToAppRole(finalLogin.user && finalLogin.user.role);
          if (sr === "admin_level_1" || sr === "admin_level_2") {
            return finalLogin;
          }
          return Promise.reject({ adminMismatch: true, finalLogin: finalLogin, serverRole: sr });
        };

        return runRoleApplyAndRelogin()
          .then(function (final) {
            return checkAdminMismatch(final);
          })
          .then(function (finalLogin) {
            app.globalData.token = finalLogin.token;
            wx.setStorageSync("token", finalLogin.token);
            const u = finalLogin.user || {};
            const appRole = intToAppRole(u.role);
            self.applyPhoneAndSave(phone);
            return self._syncOnboardingFromBackend(phone, appRole, u).then(function () {
              // #region agent log
              try {
                var st =
                  (getByPhone(phone) || {}).onboardingStatus || "";
                ingestDebugLog({
                  hypothesisId: "H3",
                  location: "auth/index.js:afterSync",
                  message: "profile after sync before setLogin",
                  data: { onboardingStatus: st },
                  runId: "pre-fix"
                });
              } catch (e) {
                // ignore
              }
              // #endregion
              app.setLogin(appRole, {
                nickname: u.username || nickPayload,
                avatarUrl: u.avatar || phonePayload.avatarUrl || "",
                phone: u.phone || phone,
                role: appRole,
                token: finalLogin.token,
                backendUserId: u.id,
                userId: u.phone || phone
              });
              self._finishAfterLogin();
            });
          });
      })
      .catch(function (err) {
        wx.hideLoading();
        if (err && err.adminMismatch) {
          const sr = err.serverRole || "student";
          wx.showModal({
            title: "身份提示",
            content:
              "你在首页选择了「" +
              (ROLE_DISPLAY_NAME[selectedRole] || "") +
              "」，但该手机号在后台对应身份为「" +
              (ROLE_DISPLAY_NAME[sr] || sr) +
              "」。\n管理端账号需由平台在数据库中开通（role=0/1）。\n\n可选择：使用服务器返回的身份、仅使用本机原有演示数据，或取消。",
            confirmText: "用服务器身份",
            cancelText: "仅本机演示",
            success: function (m) {
              if (m.confirm) {
                const L = err.finalLogin;
                const u = L.user;
                const app = getApp();
                app.globalData.token = L.token;
                wx.setStorageSync("token", L.token);
                const ar = intToAppRole(u.role);
                self.applyPhoneAndSave(phone);
                self._syncOnboardingFromBackend(phone, ar, u).then(function () {
                  app.setLogin(ar, {
                    nickname: u.username,
                    avatarUrl: u.avatar || "",
                    phone: u.phone || phone,
                    role: ar,
                    token: L.token,
                    backendUserId: u.id
                  });
                  self._finishAfterLogin();
                });
              } else if (m.cancel) {
                wx.showLoading({ title: "本机登录…", mask: true });
                self._applyLocalLogin(phone);
              }
            }
          });
          return;
        }
        const msg = (err && err.message) || "网络或服务器错误";
        wx.showModal({
          title: "无法连接后端",
          content: msg + "\n\n是否仍使用本机演示登录（不请求服务器）？",
          confirmText: "本机演示",
          cancelText: "取消",
          success: function (m) {
            if (m.confirm) {
              wx.showLoading({ title: "本机登录…", mask: true });
              self._applyLocalLogin(phone);
            }
          }
        });
      });
  }
});
