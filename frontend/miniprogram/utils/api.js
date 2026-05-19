const { request } = require("./env");

/**
 * env.request 已对 { code, data } 解包为内层 data；若中间层仍返回整段 ApiResponse 再取 .data
 */
function getData(promise) {
  return promise.then((res) => {
    if (res == null) {
      return null;
    }
    if (
      typeof res === "object" &&
      Object.prototype.hasOwnProperty.call(res, "code") &&
      Object.prototype.hasOwnProperty.call(res, "data")
    ) {
      return res.data;
    }
    return res;
  });
}

const authApi = {
  wxLogin(data) { return getData(request({ url: "/auth/wx-login", method: "POST", data })); },
  mockLogin(data) { return getData(request({ url: "/auth/mock-login", method: "POST", data })); },
  phoneLogin(data) { return getData(request({ url: "/auth/phone-login", method: "POST", data })); },
  roleApply(targetRole) { return request({ url: "/auth/role-apply", method: "POST", data: { targetRole } }); },
  logout() { return request({ url: "/auth/logout", method: "POST" }); },
  refresh() { return getData(request({ url: "/auth/refresh", method: "POST" })); },
  /** 更新当前登录用户昵称/头像（不允许改手机号） */
  updateProfile(data) { return request({ url: "/auth/me", method: "PUT", data }); }
};

const studentApi = {
  createProfile(data) { return request({ url: "/student/profile", method: "POST", data }); },
  updateProfile(data) { return request({ url: "/student/profile", method: "PUT", data }); },
  submitProfile() { return request({ url: "/student/profile/submit", method: "POST" }); },
  getProfile() { return getData(request({ url: "/student/profile" })); }
};

const teacherApi = {
  createProfile(data) { return request({ url: "/teacher/profile", method: "POST", data }); },
  updateProfile(data) { return request({ url: "/teacher/profile", method: "PUT", data }); },
  getProfile() { return getData(request({ url: "/teacher/profile" })); },
  updateContinuousMatch(enabled) { return request({ url: "/teacher/continuous-match", method: "PUT", data: { enabled } }); }
};

const matchApi = {
  recommendations() { return getData(request({ url: "/match/recommendations" })); },
  apply(data) { return request({ url: "/match/apply", method: "POST", data }); },
  pendingApplications() { return getData(request({ url: "/match/pending-applications" })); },
  process(applicationId, data) { return request({ url: `/match/application/${applicationId}/process`, method: "PUT", data }); },
  myPairs(status) {
    const qs = status == null ? "" : `?status=${encodeURIComponent(status)}`;
    return getData(request({ url: `/match/my-pairs${qs}` })).then((res) => {
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.records)) return res.records;
      if (res && Array.isArray(res.list)) return res.list;
      return [];
    });
  },
  unbindRequest(pairId) { return request({ url: `/match/${pairId}/unbind-request`, method: "POST" }); },
  unbindConfirm(pairId, data) { return request({ url: `/match/${pairId}/unbind-confirm`, method: "PUT", data }); },
  unbindProgress(pairId) { return getData(request({ url: `/match/${pairId}/unbind-progress` })); },
  pairDetail(pairId) { return getData(request({ url: `/match/${pairId}` })); },
  /** L2 管理员待确认的解绑申请列表 */
  pendingUnbindRequests() { return getData(request({ url: "/match/unbind-requests/pending" })); }
};

const meetingApi = {
  create(data) { return request({ url: "/meetings", method: "POST", data }); },
  list(params) { const query = buildQuery(params); return getData(request({ url: `/meetings${query}` })); },
  detail(meetingId) { return getData(request({ url: `/meetings/${meetingId}` })); },
  updateStatus(meetingId, data) { return request({ url: `/meetings/${meetingId}/status`, method: "PUT", data }); },
  myMeetings() { return getData(request({ url: "/meetings/my" })); }
};

const notificationApi = {
  list(params) { const query = buildQuery(params); return getData(request({ url: `/notifications${query}` })); },
  read(notificationId) { return request({ url: `/notifications/${notificationId}/read`, method: "PUT" }); },
  batchRead(ids) { return request({ url: "/notifications/batch-read", method: "PUT", data: { notificationIds: ids } }); }
};

const chatApi = {
  sendMessage(data) { return getData(request({ url: "/chat/messages", method: "POST", data })); },
  messages(params) { const query = buildQuery(params); return getData(request({ url: `/chat/messages${query}` })); },
  read(messageId) { return request({ url: `/chat/messages/${messageId}/read`, method: "PUT" }); },
  participants(pairId) { return getData(request({ url: `/chat/pairs/${pairId}/participants` })); },
  addParticipant(pairId, userId) { return request({ url: `/chat/pairs/${pairId}/participants`, method: "POST", data: { userId } }); },
  removeParticipant(pairId, userId) { return request({ url: `/chat/pairs/${pairId}/participants/${userId}`, method: "DELETE" }); }
};

const schoolApi = {
  /** 学校列表（支持按 kind/regionCode 筛选） */
  list(params) { const query = buildQuery(params); return getData(request({ url: `/schools${query}` })); },
  /** 学校详情 */
  detail(schoolId) { return getData(request({ url: `/schools/${schoolId}` })); }
};

const volunteerRecordApi = {
  submit(data) { return request({ url: "/volunteer-records", method: "POST", data }); },
  studentConfirm(recordId, data) { return request({ url: `/volunteer-records/${recordId}/student-confirm`, method: "PUT", data }); },
  list(params) { const query = buildQuery(params); return getData(request({ url: `/volunteer-records${query}` })); },
  /** 单条服务记录详情 */
  detail(recordId) { return getData(request({ url: `/volunteer-records/${recordId}` })); }
};

const dashboardApi = {
  overview() { return getData(request({ url: "/admin/dashboard/overview" })); },
  matchSuccessRate(params) { const query = buildQuery(params); return getData(request({ url: `/admin/statistics/match-success-rate${query}` })); },
  regionDistribution() { return getData(request({ url: "/admin/statistics/region-distribution" })); },
  subjectDistribution() { return getData(request({ url: "/admin/statistics/subject-distribution" })); }
};

const adminApi = {
  users(params) { const query = buildQuery(params); return getData(request({ url: `/admin/users${query}` })); },
  userDetail(userId) { return getData(request({ url: `/admin/users/${userId}` })); },
  updateUserStatus(userId, data) { return request({ url: `/admin/users/${userId}/status`, method: "PUT", data }); },
  createSchool(data) { return request({ url: "/admin/schools", method: "POST", data }); },
  assignSecondaryAdmin(data) { return request({ url: "/admin/secondary-admins", method: "POST", data }); },
  auditTeacher(teacherId, data) { return request({ url: `/admin/teachers/${teacherId}/audit`, method: "PUT", data }); },
  pendingTeachers(params) { const query = buildQuery(params); return getData(request({ url: `/admin/teachers/pending${query}` })); },
  teacherDetail(teacherId) { return getData(request({ url: `/admin/teachers/${teacherId}/profile` })); },
  auditStudent(studentId, data) { return request({ url: `/admin/students/${studentId}/audit`, method: "PUT", data }); },
  pendingStudents(params) { const query = buildQuery(params); return getData(request({ url: `/admin/students/pending${query}` })); },
  studentDetail(studentId) { return getData(request({ url: `/admin/students/${studentId}/profile` })); },
  batchCreateManagedStudents(data) { return request({ url: "/admin/students/batch-create", method: "POST", data }); },
  managedStudents() { return getData(request({ url: "/admin/students/managed" })); },
  switchManagedStudent(studentId) { return request({ url: `/admin/students/${studentId}/switch`, method: "POST" }); },
  pendingVolunteerRecords(params) { const query = buildQuery(params); return getData(request({ url: `/admin/volunteer-records/pending${query}` })); },
  auditVolunteerRecord(recordId, data) { return request({ url: `/admin/volunteer-records/${recordId}/audit`, method: "PUT", data }); },
  /** 当前管理员资料与权限 */
  myProfile() { return getData(request({ url: "/admin/profile/me" })); },
  /** 更新管理员自身资料 */
  updateMyProfile(data) { return request({ url: "/admin/profile/me", method: "PUT", data }); },
  /** 管理端聊天会话列表 */
  chatConversations(params) { const query = buildQuery(params); return getData(request({ url: `/admin/chat/conversations${query}` })); }
};

const systemApi = {
  configs() { return getData(request({ url: "/system/configs" })); },
  updateConfig(key, data) { return request({ url: `/system/configs/${encodeURIComponent(key)}`, method: "PUT", data }); }
};

const algorithmApi = {
  weights() { return getData(request({ url: "/algorithm/weights" })); },
  updateWeight(configId, data) { return request({ url: `/algorithm/weights/${configId}`, method: "PUT", data }); },
  recalculateWeights() { return request({ url: "/algorithm/recalculate-weights", method: "POST" }); }
};

const ossApi = {
  /** 获取 OSS STS 临时凭证。businessType: AVATAR | CHAT_IMAGE | CHAT_VOICE | EVIDENCE | MEETING_RECORD */
  getToken(businessType) { return getData(request({ url: "/oss/token", method: "POST", data: { businessType } })); }
};

function buildQuery(params) {
  const source = params || {};
  const parts = Object.keys(source).filter((key) => source[key] !== undefined && source[key] !== null && source[key] !== "").map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(source[key])}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

module.exports = { authApi, studentApi, teacherApi, matchApi, meetingApi, notificationApi, chatApi, schoolApi, adminApi, dashboardApi, volunteerRecordApi, systemApi, algorithmApi, ossApi };
