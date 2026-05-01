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
  wxLogin(data) {
    return getData(request({ url: "/auth/wx-login", method: "POST", data }));
  },
  mockLogin(data) {
    return getData(request({ url: "/auth/mock-login", method: "POST", data }));
  },
  phoneLogin(data) {
    return getData(request({ url: "/auth/phone-login", method: "POST", data }));
  },
  roleApply(targetRole) {
    return request({ url: "/auth/role-apply", method: "POST", data: { targetRole } });
  },
  logout() {
    return request({ url: "/auth/logout", method: "POST" });
  },
  refresh() {
    return getData(request({ url: "/auth/refresh", method: "POST" }));
  }
};

const studentApi = {
  createProfile(data) {
    return request({ url: "/student/profile", method: "POST", data });
  },
  updateProfile(data) {
    return request({ url: "/student/profile", method: "PUT", data });
  },
  submitProfile() {
    return request({ url: "/student/profile/submit", method: "POST" });
  },
  getProfile() {
    return getData(request({ url: "/student/profile" }));
  }
};

const teacherApi = {
  createProfile(data) {
    return request({ url: "/teacher/profile", method: "POST", data });
  },
  updateProfile(data) {
    return request({ url: "/teacher/profile", method: "PUT", data });
  },
  getProfile() {
    return getData(request({ url: "/teacher/profile" }));
  },
  updateContinuousMatch(enabled) {
    return request({ url: "/teacher/continuous-match", method: "PUT", data: { enabled } });
  }
};

const matchApi = {
  recommendations() {
    return getData(request({ url: "/match/recommendations" }));
  },
  apply(data) {
    return request({ url: "/match/apply", method: "POST", data });
  },
  pendingApplications() {
    return getData(request({ url: "/match/pending-applications" }));
  },
  process(applicationId, data) {
    return request({ url: `/match/application/${applicationId}/process`, method: "PUT", data });
  },
  myPairs(status) {
    const qs = status == null ? "" : `?status=${encodeURIComponent(status)}`;
    return getData(request({ url: `/match/my-pairs${qs}` }));
  },
  unbindRequest(pairId) {
    return request({ url: `/match/${pairId}/unbind-request`, method: "POST" });
  },
  unbindConfirm(pairId, data) {
    return request({ url: `/match/${pairId}/unbind-confirm`, method: "PUT", data });
  },
  unbindProgress(pairId) {
    return getData(request({ url: `/match/${pairId}/unbind-progress` }));
  },
  pairDetail(pairId) {
    return getData(request({ url: `/match/${pairId}` }));
  }
};

const meetingApi = {
  create(data) {
    return request({ url: "/meetings", method: "POST", data });
  },
  list(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/meetings${query}` }));
  },
  detail(meetingId) {
    return getData(request({ url: `/meetings/${meetingId}` }));
  },
  updateStatus(meetingId, data) {
    return request({ url: `/meetings/${meetingId}/status`, method: "PUT", data });
  },
  myMeetings() {
    return getData(request({ url: "/meetings/my" }));
  }
};

const notificationApi = {
  list(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/notifications${query}` }));
  },
  read(notificationId) {
    return request({ url: `/notifications/${notificationId}/read`, method: "PUT" });
  },
  batchRead(ids) {
    return request({ url: "/notifications/batch-read", method: "PUT", data: { notificationIds: ids } });
  }
};

const chatApi = {
  sendMessage(data) {
    return getData(request({ url: "/chat/messages", method: "POST", data }));
  },
  messages(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/chat/messages${query}` }));
  },
  read(messageId) {
    return request({ url: `/chat/messages/${messageId}/read`, method: "PUT" });
  },
  participants(pairId) {
    return getData(request({ url: `/chat/pairs/${pairId}/participants` }));
  },
  addParticipant(pairId, userId) {
    return request({ url: `/chat/pairs/${pairId}/participants`, method: "POST", data: { userId } });
  },
  removeParticipant(pairId, userId) {
    return request({ url: `/chat/pairs/${pairId}/participants/${userId}`, method: "DELETE" });
  }
};

const volunteerRecordApi = {
  submit(data) {
    return request({ url: "/volunteer-records", method: "POST", data });
  },
  studentConfirm(recordId, data) {
    return request({ url: `/volunteer-records/${recordId}/student-confirm`, method: "PUT", data });
  },
  list(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/volunteer-records${query}` }));
  }
};

const dashboardApi = {
  overview() {
    return getData(request({ url: "/admin/dashboard/overview" }));
  },
  matchSuccessRate(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/admin/statistics/match-success-rate${query}` }));
  },
  regionDistribution() {
    return getData(request({ url: "/admin/statistics/region-distribution" }));
  },
  subjectDistribution() {
    return getData(request({ url: "/admin/statistics/subject-distribution" }));
  }
};

const adminApi = {
  users(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/admin/users${query}` }));
  },
  userDetail(userId) {
    return getData(request({ url: `/admin/users/${userId}` }));
  },
  updateUserStatus(userId, data) {
    return request({ url: `/admin/users/${userId}/status`, method: "PUT", data });
  },
  createSchool(data) {
    return request({ url: "/admin/schools", method: "POST", data });
  },
  assignSecondaryAdmin(data) {
    return request({ url: "/admin/secondary-admins", method: "POST", data });
  },
  auditTeacher(teacherId, data) {
    return request({ url: `/admin/teachers/${teacherId}/audit`, method: "PUT", data });
  },
  auditStudent(studentId, data) {
    return request({ url: `/admin/students/${studentId}/audit`, method: "PUT", data });
  },
  batchCreateManagedStudents(data) {
    return request({ url: "/admin/students/batch-create", method: "POST", data });
  },
  managedStudents() {
    return getData(request({ url: "/admin/students/managed" }));
  },
  switchManagedStudent(studentId) {
    return request({ url: `/admin/students/${studentId}/switch`, method: "POST" });
  },
  pendingVolunteerRecords(params) {
    const query = buildQuery(params);
    return getData(request({ url: `/admin/volunteer-records/pending${query}` }));
  },
  auditVolunteerRecord(recordId, data) {
    return request({ url: `/admin/volunteer-records/${recordId}/audit`, method: "PUT", data });
  }
};

const systemApi = {
  configs() {
    return getData(request({ url: "/system/configs" }));
  },
  updateConfig(key, data) {
    return request({ url: `/system/configs/${encodeURIComponent(key)}`, method: "PUT", data });
  }
};

const algorithmApi = {
  weights() {
    return getData(request({ url: "/algorithm/weights" }));
  },
  updateWeight(configId, data) {
    return request({ url: `/algorithm/weights/${configId}`, method: "PUT", data });
  },
  recalculateWeights() {
    return request({ url: "/algorithm/recalculate-weights", method: "POST" });
  }
};

function buildQuery(params) {
  const source = params || {};
  const parts = Object.keys(source)
    .filter((key) => source[key] !== undefined && source[key] !== null && source[key] !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(source[key])}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

module.exports = {
  authApi,
  studentApi,
  teacherApi,
  matchApi,
  meetingApi,
  notificationApi,
  chatApi,
  adminApi,
  dashboardApi,
  volunteerRecordApi,
  systemApi,
  algorithmApi
};
