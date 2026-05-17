function getL1SchoolFilterOptions() { return [{ id: "", name: "全部学校" }]; }
function getPairedListForL1() { return []; }
function getPairedListForRecipientL2() { return []; }
function getPairedListForVolunteerL2() { return []; }
function getPairedListForUser() { return []; }
function getPairedList() { return []; }
function getL1ThreadTitleLine(partnerId) { return "会话 #" + partnerId; }
function mapThreadForL1View(partnerId, raw) { return (raw || []).map((m) => ({ ...m, partyLabel: m.isSelf ? "我" : "对方", avatarChar: (m.from || "?").charAt(0) || "?" })); }
function loadThread() { return []; }
function saveThread() {}
function isRecipientL2ObserverAllowed() { return false; }
function isVolunteerL2ObserverAllowed() { return false; }
function getAllowedRecipientL2ObserverPartnerIds() { return []; }
module.exports = { getPairedList, getPairedListForUser, getPairedListForL1, getPairedListForRecipientL2, getPairedListForVolunteerL2, getL1SchoolFilterOptions, getL1ThreadTitleLine, mapThreadForL1View, loadThread, saveThread, isRecipientL2ObserverAllowed, isVolunteerL2ObserverAllowed, getAllowedRecipientL2ObserverPartnerIds };
