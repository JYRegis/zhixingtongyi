const { request } = require("./env");

function getData(promise) {
  return promise.then((res) => (res ? res.data : null));
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
  adminApi
};
