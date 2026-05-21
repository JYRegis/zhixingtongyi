/**
 * 集中写入本地「测试用」Mock 数据。勿在线上开启。
 * 在开发者工具中设置 Storage: zhixing_run_mock_seed = 1 后**重启**小程序，见 docs/MOCK_DATA.md。
 *
 * 覆盖：入驻(待审/通过/驳回)、L1/L2/学生/教师 全角色；认定义务时长(待审/通过/驳回)；解绑样例。
 */
const { saveProfile } = require("./userProfileStore");
const { replaceApplicationsForDev } = require("./onboardingStore");
const { replaceHoursListForDev } = require("./hoursReviewStore");
const { getSchoolName } = require("./schoolsMock");
const { replaceActivePairListForDev, mergeListWithDefaults } = require("./pairingStore");

const T0 = 1715000000000;
const t = (i) => T0 + i * 60 * 1000;

const L2_VOL = "13800138010";
const L2_REC = "13800138020";
const L1_A = "13800138000";
const L1_B = "13800138001";

const TEST_PROFILES = [
  {
    phone: L1_A,
    role: "admin_level_1",
    nickname: "张平台(已通过)",
    onboardingStatus: "approved",
    name: "张一",
    organization: "XX 教育基金会 (Mock)"
  },
  {
    phone: L1_B,
    role: "admin_level_1",
    nickname: "李平台(待审)",
    onboardingStatus: "pending",
    name: "李二"
  },
  {
    phone: L2_VOL,
    role: "admin_level_2",
    nickname: "王支教(二级)",
    onboardingStatus: "approved",
    l2Scope: "volunteer_side",
    name: "王老师",
    supportSchoolIds: ["sup_xmu", "sup_ynu", "sup_ynnu", "sup_kmu"],
    recipientTargetIds: []
  },
  {
    phone: L2_REC,
    role: "admin_level_2",
    nickname: "赵受援(二级)",
    onboardingStatus: "approved",
    l2Scope: "recipient_side",
    name: "赵老师",
    supportSchoolIds: [],
    recipientTargetIds: ["rec_yunlong", "rec_mengku", "rec_hekou", "rec_shidian", "rec_nujiang"]
  },
  { phone: "13800138033", role: "admin_level_2", nickname: "待审-钱老师", onboardingStatus: "pending", name: "钱待" },
  { phone: "13800138022", role: "admin_level_2", nickname: "驳回-钱驳", onboardingStatus: "rejected", name: "钱驳", rejectNote: "材料不全(Mock)" }
];

const MOCK_APPLICATIONS = [
  /* —— 学生：待审 —— */
  {
    id: "s_p_01",
    applicantId: "13800138062",
    role: "student",
    schoolId: "rec_yunlong",
    schoolName: getSchoolName("rec_yunlong"),
    status: "pending",
    targetL2UserId: L2_REC,
    createdAt: t(1),
    extra: { name: "陈心语", studentNo: "R2025001", grade: "初三", studentAvailableTime: "W:1,3,5|S:night" }
  },
  {
    id: "s_p_02",
    applicantId: "13800138012",
    role: "student",
    schoolId: "rec_mengku",
    schoolName: getSchoolName("rec_mengku"),
    status: "pending",
    targetL2UserId: L2_REC,
    createdAt: t(2),
    extra: { name: "和晓燕", studentNo: "M2025002", grade: "高一", studentAvailableTime: "W:6,7|S:mor,noon" }
  },
  {
    id: "s_p_03",
    applicantId: "13800138018",
    role: "student",
    schoolId: "rec_hekou",
    schoolName: getSchoolName("rec_hekou"),
    status: "pending",
    targetL2UserId: L2_REC,
    createdAt: t(3),
    extra: { name: "周小花", studentNo: "H2025", grade: "初二", studentAvailableTime: "W:1,7|S:mor,night" }
  },
  {
    id: "s_p_04",
    applicantId: "13800138050",
    role: "student",
    schoolId: "rec_lushi",
    schoolName: getSchoolName("rec_lushi"),
    status: "pending",
    targetL2UserId: null,
    createdAt: t(4),
    extra: { name: "无L2-仅一級", studentNo: "L99", grade: "高二", studentAvailableTime: "W:6|S:night" }
  },
  {
    id: "s_p_05",
    applicantId: "13800138040",
    role: "student",
    schoolId: "rec_nujiang",
    schoolName: getSchoolName("rec_nujiang"),
    status: "pending",
    targetL2UserId: L2_REC,
    createdAt: t(5),
    extra: { name: "怒江-测试", studentNo: "N800", grade: "初一", studentAvailableTime: "W:1,2,3,4,5,6,7|S:mor" }
  },
  {
    id: "s_p_06",
    applicantId: "13800138060",
    role: "student",
    schoolId: "rec_mengku",
    schoolName: getSchoolName("rec_mengku"),
    status: "pending",
    targetL2UserId: L2_REC,
    createdAt: t(55),
    extra: { name: "张末审", studentNo: "M9008", grade: "初三", studentAvailableTime: "W:2,4,6|S:noon" }
  },
  /* —— 学生：通过 —— */
  {
    id: "s_a_01",
    applicantId: "13800138013",
    role: "student",
    schoolId: "rec_yunlong",
    schoolName: getSchoolName("rec_yunlong"),
    status: "approved",
    targetL2UserId: L2_REC,
    createdAt: t(10),
    extra: { name: "已审学员甲", studentNo: "R2025003", grade: "初一", studentAvailableTime: "W:2,4|S:noon" },
    reviewedByL2: L2_REC
  },
  {
    id: "s_a_02",
    applicantId: "13800138035",
    role: "student",
    schoolId: "rec_shidian",
    schoolName: getSchoolName("rec_shidian"),
    status: "approved",
    targetL2UserId: L2_REC,
    createdAt: t(11),
    extra: { name: "施甸-已通过", studentNo: "SD201", grade: "初二" },
    reviewedByL2: L2_REC
  },
  {
    id: "s_a_03",
    applicantId: "13800138036",
    role: "student",
    schoolId: "rec_lushi",
    schoolName: getSchoolName("rec_lushi"),
    status: "approved",
    targetL2UserId: null,
    createdAt: t(12),
    extra: { name: "一級審-学员E", studentNo: "L888" },
    reviewedByL1: L1_A
  },
  {
    id: "s_h_00",
    applicantId: "13800138013",
    role: "student",
    schoolId: "rec_yunlong",
    schoolName: getSchoolName("rec_yunlong"),
    status: "rejected",
    targetL2UserId: L2_REC,
    createdAt: t(8),
    rejectNote: "首次:信息不全(旧单)",
    extra: { name: "已审学员甲", studentNo: "R2025003" }
  },
  /* —— 学生：驳回(仅见最新:通过后旧驳回仍留库) —— */
  {
    id: "s_r_01",
    applicantId: "13800138043",
    role: "student",
    schoolId: "rec_shidian",
    schoolName: getSchoolName("rec_shidian"),
    status: "rejected",
    targetL2UserId: L2_REC,
    createdAt: t(14),
    rejectNote: "学籍与学校不符(Mock)",
    extra: { name: "驳回-学员A", studentNo: "S555" }
  },
  {
    id: "s_r_02",
    applicantId: "13800138044",
    role: "student",
    schoolId: "rec_hekou",
    schoolName: getSchoolName("rec_hekou"),
    status: "rejected",
    targetL2UserId: L2_REC,
    createdAt: t(15),
    rejectNote: "学号无法核验",
    extra: { name: "驳回-学员B", studentNo: "H777" }
  },
  {
    id: "s_r_03",
    applicantId: "13800138045",
    role: "student",
    schoolId: "rec_mengku",
    schoolName: getSchoolName("rec_mengku"),
    status: "rejected",
    targetL2UserId: L2_REC,
    createdAt: t(16),
    rejectNote: "超龄(演示)",
    extra: { name: "驳回-学员C" }
  },
  /* —— 教师:待审 —— */
  {
    id: "t_p_01",
    applicantId: "13800138014",
    role: "teacher",
    schoolId: "sup_xmu",
    schoolName: getSchoolName("sup_xmu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(20),
    extra: { name: "志愿A", workNo: "T9001", availableTime: "W:1,2,3,4,5|S:mor" }
  },
  {
    id: "t_p_02",
    applicantId: "13800138015",
    role: "teacher",
    schoolId: "sup_ynu",
    schoolName: getSchoolName("sup_ynu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(21),
    extra: { name: "志愿B", workNo: "T9002" }
  },
  {
    id: "t_p_03",
    applicantId: "13800138019",
    role: "teacher",
    schoolId: "sup_kmu",
    schoolName: getSchoolName("sup_kmu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(22),
    extra: { name: "支愿昆明", workNo: "K210" }
  },
  {
    id: "t_p_04",
    applicantId: "13800138041",
    role: "teacher",
    schoolId: "sup_ynnu",
    schoolName: getSchoolName("sup_ynnu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(23),
    extra: { name: "师大批次", workNo: "YNU01" }
  },
  {
    id: "t_p_05",
    applicantId: "13800138070",
    role: "teacher",
    schoolId: "sup_ynu",
    schoolName: getSchoolName("sup_ynu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(24),
    extra: { name: "末批志愿", workNo: "T7700" }
  },
  /* —— 教师:通过 —— */
  {
    id: "t_a_01",
    applicantId: "13800138042",
    role: "teacher",
    schoolId: "sup_xmu",
    schoolName: getSchoolName("sup_xmu"),
    status: "approved",
    targetL2UserId: L2_VOL,
    createdAt: t(30),
    extra: { name: "已审-志愿员", workNo: "H999" },
    reviewedByL2: L2_VOL
  },
  {
    id: "t_a_02",
    applicantId: "13800138038",
    role: "teacher",
    schoolId: "sup_ynu",
    schoolName: getSchoolName("sup_ynu"),
    status: "approved",
    targetL2UserId: L2_VOL,
    createdAt: t(31),
    extra: { name: "云州-过审", workNo: "T880" },
    reviewedByL2: L2_VOL
  },
  {
    id: "t_a_03",
    applicantId: "13800138039",
    role: "teacher",
    schoolId: "sup_kmu",
    schoolName: getSchoolName("sup_kmu"),
    status: "approved",
    targetL2UserId: L2_VOL,
    createdAt: t(32),
    extra: { name: "昆院-过审" },
    reviewedByL1: L1_A
  },
  /* —— 教师:驳回 —— */
  {
    id: "t_r_01",
    applicantId: "13800138016",
    role: "teacher",
    schoolId: "sup_xmu",
    schoolName: getSchoolName("sup_xmu"),
    status: "rejected",
    targetL2UserId: L2_VOL,
    createdAt: t(25),
    rejectNote: "学工号与在册不一致(演示)",
    extra: { name: "驳回样本D", workNo: "T9003" }
  },
  {
    id: "t_r_02",
    applicantId: "13800138055",
    role: "teacher",
    schoolId: "sup_ynu",
    schoolName: getSchoolName("sup_ynu"),
    status: "rejected",
    targetL2UserId: L2_VOL,
    createdAt: t(26),
    rejectNote: "可授课时间无法匹配",
    extra: { name: "驳回-志愿E" }
  },
  {
    id: "t_h_00",
    applicantId: "13800138016",
    role: "teacher",
    schoolId: "sup_xmu",
    schoolName: getSchoolName("sup_xmu"),
    status: "pending",
    targetL2UserId: L2_VOL,
    createdAt: t(40),
    extra: { name: "驳回样本D-重提", workNo: "T9003-new" }
  },
  /* —— 学校老师(L2)入驻 —— */
  {
    id: "l2_p_1",
    applicantId: "13800138017",
    role: "admin_level_2",
    schoolId: "",
    schoolName: "",
    status: "pending",
    targetL2UserId: null,
    createdAt: t(50),
    extra: { name: "新校老师-待一級", l2Note: "希望受援" }
  },
  {
    id: "l2_p_2",
    applicantId: "13800138033",
    role: "admin_level_2",
    schoolId: "",
    schoolName: "",
    status: "pending",
    targetL2UserId: null,
    createdAt: t(51),
    extra: { name: "钱待", l2Note: "与上面档案同号" }
  },
  {
    id: "l2_r_1",
    applicantId: "13800138022",
    role: "admin_level_2",
    schoolId: "",
    schoolName: "",
    status: "rejected",
    targetL2UserId: null,
    createdAt: t(51),
    rejectNote: "未提交在职证明",
    extra: { name: "钱驳" }
  },
  {
    id: "l2_a_1",
    applicantId: "13800138010",
    role: "admin_level_2",
    schoolId: "",
    schoolName: "",
    status: "approved",
    targetL2UserId: null,
    createdAt: t(5),
    extra: { name: "王老师" },
    reviewedByL1: L1_A
  },
  /* —— 平台L1 入驻 —— */
  {
    id: "l1_p_1",
    applicantId: L1_B,
    role: "admin_level_1",
    schoolId: "",
    schoolName: "",
    status: "pending",
    targetL2UserId: null,
    createdAt: t(60),
    extra: { orgNote: "二平台-待一級" }
  },
  {
    id: "l1_p_2",
    applicantId: "13800138090",
    role: "admin_level_1",
    schoolId: "",
    schoolName: "",
    status: "pending",
    targetL2UserId: null,
    createdAt: t(61),
    extra: { orgNote: "新平台-待" }
  },
  {
    id: "l1_r_1",
    applicantId: "13800138095",
    role: "admin_level_1",
    schoolId: "",
    schoolName: "",
    status: "rejected",
    targetL2UserId: null,
    createdAt: t(62),
    rejectNote: "机构资质未上传",
    extra: { name: "驳回-平台" }
  },
  {
    id: "l1_r_2",
    applicantId: "13800138090",
    role: "admin_level_1",
    schoolId: "",
    schoolName: "",
    status: "rejected",
    targetL2UserId: null,
    createdAt: t(59),
    rejectNote: "申请未过",
    extra: { orgNote: "新平台-申请" }
  },
  {
    id: "l1_a_1",
    applicantId: L1_A,
    role: "admin_level_1",
    schoolId: "",
    schoolName: "",
    status: "approved",
    targetL2UserId: null,
    createdAt: t(3),
    extra: { orgNote: "首通-张" },
    reviewedByL1: "system_first"
  }
];

const MOCK_HOURS = [
  /* 待审 */
  { id: "hr_p_01", schoolId: "rec_yunlong", schoolName: getSchoolName("rec_yunlong"), studentName: "龙兴-演示A", volunteerName: "张志愿", hours: 4, week: "2026-W16", targetL2UserId: L2_REC, status: "pending", createdAt: t(200) },
  { id: "hr_p_02", schoolId: "rec_mengku", schoolName: getSchoolName("rec_mengku"), studentName: "和晓燕", volunteerName: "王志愿", hours: 6, week: "2026-W16", targetL2UserId: L2_REC, status: "pending", createdAt: t(201) },
  { id: "hr_p_03", schoolId: "rec_hekou", schoolName: getSchoolName("rec_hekou"), studentName: "河口-小花", volunteerName: "周志愿", hours: 3, week: "2026-W16", targetL2UserId: L2_REC, status: "pending", createdAt: t(202) },
  { id: "hr_p_04", schoolId: "rec_shidian", schoolName: getSchoolName("rec_shidian"), studentName: "施甸-大伟", volunteerName: "何志愿", hours: 5, week: "2026-W16", targetL2UserId: L2_REC, status: "pending", createdAt: t(203) },
  { id: "hr_p_05", schoolId: "rec_nujiang", schoolName: getSchoolName("rec_nujiang"), studentName: "怒实-小敏", volunteerName: "高志愿", hours: 1.5, week: "2026-W16", targetL2UserId: L2_REC, status: "pending", createdAt: t(204) },
  { id: "hr_p_06", schoolId: "rec_mengku", schoolName: getSchoolName("rec_mengku"), studentName: "白玛", volunteerName: "金志愿", hours: 4, week: "2026-W15", targetL2UserId: L2_REC, status: "pending", createdAt: t(205) },
  { id: "hr_p_07", schoolId: "rec_yunlong", schoolName: getSchoolName("rec_yunlong"), studentName: "小林", volunteerName: "吴志愿", hours: 2, week: "2026-W18", targetL2UserId: L2_REC, status: "pending", createdAt: t(206) },
  { id: "hr_p_08", schoolId: "rec_hekou", schoolName: getSchoolName("rec_hekou"), studentName: "H-新单", volunteerName: "V新", hours: 8, week: "2026-W20", targetL2UserId: L2_REC, status: "pending", createdAt: t(220) },
  { id: "hr_p_00", schoolId: "rec_lushi", schoolName: getSchoolName("rec_lushi"), studentName: "鲁甸-无L2", volunteerName: "V某", hours: 2, week: "2026-W17", targetL2UserId: "", status: "pending", createdAt: t(210) },
  /* 通过 */
  { id: "hr_a_01", schoolId: "rec_yunlong", schoolName: getSchoolName("rec_yunlong"), studentName: "已审学员甲", volunteerName: "李志愿", hours: 2, week: "2026-W15", targetL2UserId: L2_REC, status: "approved", createdAt: t(180), resolvedAt: t(181), reviewedBy: L2_REC },
  { id: "hr_a_02", schoolId: "rec_mengku", schoolName: getSchoolName("rec_mengku"), studentName: "勐库-过", volunteerName: "A志愿", hours: 3, week: "2026-W14", targetL2UserId: L2_REC, status: "approved", createdAt: t(170), resolvedAt: t(171), reviewedBy: L2_REC },
  { id: "hr_a_03", schoolId: "rec_shidian", schoolName: getSchoolName("rec_shidian"), studentName: "施-已认", volunteerName: "B志愿", hours: 1, week: "2026-W19", targetL2UserId: L2_REC, status: "approved", createdAt: t(195), resolvedAt: t(196), reviewedBy: L1_A },
  { id: "hr_a_04", schoolId: "rec_yunlong", schoolName: getSchoolName("rec_yunlong"), studentName: "龙-旧过", volunteerName: "C志愿", hours: 4, week: "2026-W10", targetL2UserId: L2_REC, status: "approved", createdAt: t(100), resolvedAt: t(101), reviewedBy: L2_REC },
  { id: "hr_a_05", schoolId: "rec_nujiang", schoolName: getSchoolName("rec_nujiang"), studentName: "怒-已认", volunteerName: "D志愿", hours: 5, week: "2026-W12", targetL2UserId: L2_REC, status: "approved", createdAt: t(150), resolvedAt: t(151), reviewedBy: L1_A },
  /* 驳回(列表若只显示 pending，此类用于「历史」/后续扩展) —— 仍写入 storage 便于对账; 若 UI 无筛「已处理」可只在存储见 */
  { id: "hr_r_01", schoolId: "rec_mengku", schoolName: getSchoolName("rec_mengku"), studentName: "驳回-时长A", volunteerName: "E志愿", hours: 9, week: "2026-W11", targetL2UserId: L2_REC, status: "rejected", createdAt: t(130), resolvedAt: t(131), reviewedBy: L2_REC },
  { id: "hr_r_02", schoolId: "rec_yunlong", schoolName: getSchoolName("rec_yunlong"), studentName: "驳回-时长B", volunteerName: "F志", hours: 2, week: "2026-W12", targetL2UserId: L2_REC, status: "rejected", createdAt: t(132), resolvedAt: t(133), reviewedBy: L1_A }
];

const MOCK_UNBIND_LIST = [
  {
    id: "ub_p_1",
    pairId: "P-PD-1",
    schoolId: "rec_yunlong",
    studentId: "stu_101",
    studentName: "学员甲",
    partnerName: "志愿者甲",
    l2UserId: L2_REC,
    reason: "时间冲突(待三方)",
    fromRole: "student",
    status: "pending_approval",
    agree: { student: false, teacher: false, l2: false },
    createdAt: t(300)
  },
  {
    id: "ub_ok_1",
    pairId: "P-OK-1",
    schoolId: "rec_mengku",
    studentId: "stu_201",
    studentName: "学员乙",
    partnerName: "志愿者乙",
    l2UserId: L2_REC,
    reason: "已协商完成(演示已结束)",
    fromRole: "teacher",
    status: "completed",
    agree: { student: true, teacher: true, l2: true },
    createdAt: t(310)
  },
  {
    id: "ub_r_1",
    pairId: "P-RJ-1",
    schoolId: "rec_yunlong",
    studentId: "stu_301",
    studentName: "学员丙",
    partnerName: "志愿者丙",
    l2UserId: L2_REC,
    reason: "材料不齐",
    fromRole: "admin_level_2",
    status: "rejected",
    createdAt: t(320)
  }
];

/**
 * 同一 applicantId 多笔时，以**最新** createdAt 的 status 写档案(与 ensureStatusFromApplications 思想一致)
 */
function pickLatestAppsByApplicant(apps) {
  const m = {};
  for (let i = 0; i < apps.length; i += 1) {
    const a = apps[i];
    if (!a || !a.applicantId) {
      continue;
    }
    const k = a.applicantId;
    if (!m[k] || a.createdAt > m[k].createdAt) {
      m[k] = a;
    }
  }
  return m;
}

function writeProfiles() {
  const byPhone = {};
  for (let i = 0; i < TEST_PROFILES.length; i += 1) {
    const row = TEST_PROFILES[i];
    const { phone, ...rest } = row;
    byPhone[phone] = 1;
    saveProfile(phone, { userId: phone, phone, ...rest });
  }
  const latest = pickLatestAppsByApplicant(MOCK_APPLICATIONS);
  const phones = Object.keys(latest);
  for (let j = 0; j < phones.length; j += 1) {
    const phone = phones[j];
    if (byPhone[phone]) {
      continue;
    }
    const a = latest[phone];
    const nm = a.extra && a.extra.name ? a.extra.name : "用户" + phone.slice(-4);
    saveProfile(phone, {
      userId: phone,
      phone,
      role: a.role,
      nickname: nm,
      name: nm,
      onboardingStatus: a.status,
      schoolId: a.schoolId || "",
      rejectNote: a.rejectNote || ""
    });
  }
}

const UNBIND_KEY = "zhixing_unbind_requests";

function runFullMockSeed() {
  try {
    writeProfiles();
    const appsSorted = [...MOCK_APPLICATIONS].sort((a, b) => b.createdAt - a.createdAt);
    replaceApplicationsForDev(appsSorted);
    const hoursSorted = [...MOCK_HOURS].sort((a, b) => b.createdAt - a.createdAt);
    replaceHoursListForDev(hoursSorted);
    replaceActivePairListForDev(
      mergeListWithDefaults([
        {
          pairId: "pair_001",
          studentId: "stu_001",
          teacherId: "vol_001",
          studentName: "王同学",
          partnerName: "李志愿者",
          subject: "综合学科",
          startDate: "2026-04-20",
          status: "结对中",
          schoolId: "rec_yunlong"
        }
      ])
    );
    wx.setStorageSync(UNBIND_KEY, MOCK_UNBIND_LIST);
    const phones = [L1_A, L1_B, L2_VOL, L2_REC, "13800138090", "13900000000"];
    wx.setStorageSync("zhixing_saved_phones", phones);
  } catch (e) {
    if (console && console.error) {
      console.error("[mockDataSeed]", e);
    }
  }
}

module.exports = {
  runFullMockSeed,
  SEED_L2_VOL: L2_VOL,
  SEED_L2_REC: L2_REC,
  SEED_L1: L1_A,
  SEED_L1_PENDING: L1_B,
  TEST_PROFILES,
  MOCK_APPLICATIONS,
  MOCK_HOURS,
  MOCK_UNBIND_LIST
};
