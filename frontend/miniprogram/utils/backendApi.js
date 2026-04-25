const { request } = require("./env");

function authMockLogin(payload) {
  return request({
    url: "/auth/mock-login",
    method: "POST",
    data: payload
  });
}

function authWxLogin(payload) {
  return request({
    url: "/auth/wx-login",
    method: "POST",
    data: payload
  });
}

function authPhoneLogin(payload) {
  return request({
    url: "/auth/phone-login",
    method: "POST",
    data: payload
  });
}

function authRoleApply(targetRole) {
  return request({
    url: "/auth/role-apply",
    method: "POST",
    data: { targetRole }
  });
}

function getStudentProfile() {
  return request({ url: "/student/profile" });
}

function saveStudentProfile(payload) {
  return request({
    url: "/student/profile",
    method: "PUT",
    data: payload
  });
}

function submitStudentProfile() {
  return request({
    url: "/student/profile/submit",
    method: "POST"
  });
}

function getVolunteerProfile() {
  return request({ url: "/teacher/profile" });
}

function createVolunteerProfile(payload) {
  return request({
    url: "/teacher/profile",
    method: "POST",
    data: payload
  });
}

function updateVolunteerProfile(payload) {
  return request({
    url: "/teacher/profile",
    method: "PUT",
    data: payload
  });
}

function updateVolunteerContinuousMatch(enabled) {
  return request({
    url: "/teacher/continuous-match",
    method: "PUT",
    data: { enabled: !!enabled }
  });
}

function getRecommendations() {
  return request({ url: "/match/recommendations" });
}

function applyMatch(teacherId) {
  return request({
    url: "/match/apply",
    method: "POST",
    data: { teacherId }
  });
}

function getPendingApplications() {
  return request({ url: "/match/pending-applications" });
}

function processApplication(applicationId, action, reason) {
  return request({
    url: `/match/application/${applicationId}/process`,
    method: "PUT",
    data: { action, reason }
  });
}

module.exports = {
  authWxLogin,
  authPhoneLogin,
  authMockLogin,
  authRoleApply,
  getStudentProfile,
  saveStudentProfile,
  submitStudentProfile,
  getVolunteerProfile,
  createVolunteerProfile,
  updateVolunteerProfile,
  updateVolunteerContinuousMatch,
  getRecommendations,
  applyMatch,
  getPendingApplications,
  processApplication
};

