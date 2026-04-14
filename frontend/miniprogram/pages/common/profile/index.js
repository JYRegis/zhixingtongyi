const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

const roleFieldMap = {
  teacher: ["name", "school", "grade", "subjects", "personality", "availableTime"],
  student: ["name", "school", "grade", "subjects", "guardianContact", "learningGoal"],
  admin_level_2: ["name", "school", "region", "managedStudents"],
  admin_level_1: ["name", "organization", "permissionNote"]
};

const roleMetaMap = {
  teacher: {
    eyebrow: "支教档案",
    title: "完善你的支教资料",
    desc: "把擅长科目、授课时间与个人风格整理清楚，后续匹配时信息会更完整。",
    badges: ["支教角色", "课程时间", "风格与特长"],
    focusNote: "优先填写你可授课的时间和擅长方向，便于后续匹配时使用。"
  },
  student: {
    eyebrow: "学习档案",
    title: "完善你的学习资料",
    desc: "将学习需求、监护人联系方式和阶段目标补充完整，让个人档案更加完整。",
    badges: ["学习目标", "需求科目", "资料可持续扩展"],
    focusNote: "建议先填姓名、学校和学习目标，这三项最能体现个人学习画像。"
  },
  admin_level_2: {
    eyebrow: "区域资料",
    title: "完善学校老师信息",
    desc: "当前资料页汇总区域管理身份所需信息，便于后续管理工作使用。",
    badges: ["区域管理", "代管范围", "协同管理"],
    focusNote: "可把学校、区域和代管范围填完整，便于清晰界定职责范围。"
  },
  admin_level_1: {
    eyebrow: "平台资料",
    title: "完善平台运营资料",
    desc: "补充所属机构和权限说明，使平台管理身份信息更完整、更具可信度。",
    badges: ["平台运营", "权限说明", "管理端可用"],
    focusNote: "本页会保留平台角色最关键的组织与权限说明，适合作为管理侧说明入口。"
  }
};

const sectionMetaMap = {
  basic: {
    title: "基础信息",
    desc: "用于确认你当前的基本身份信息，也是个人档案的基础。"
  },
  ability: {
    title: "教学与能力信息",
    desc: "聚焦擅长科目、教学风格与可授课时间，便于形成更完整的教学能力说明。"
  },
  learning: {
    title: "学习支持信息",
    desc: "用于描述当前学习目标和日常沟通方式，便于匹配更合适的志愿者。"
  },
  region: {
    title: "区域管理信息",
    desc: "记录你所负责的区域和代管学生范围，让区域管理角色更加清晰。"
  },
  platform: {
    title: "平台运营信息",
    desc: "用于说明所属机构和平台权限，突出管理端的职责边界。"
  }
};

const fieldMetaMap = {
  name: {
    label: "姓名",
    placeholder: "请输入姓名",
    type: "input",
    section: "basic",
    hint: "用于身份识别与联络。"
  },
  school: {
    label: "学校",
    placeholder: "请输入学校",
    type: "input",
    section: "basic",
    hint: "用于说明当前就读或服务学校。"
  },
  grade: {
    label: "年级",
    placeholder: "请输入年级",
    type: "input",
    section: "basic",
    hint: "有助于匹配更合适的课程节奏。"
  },
  subjects: {
    label: "擅长/需求科目",
    placeholder: "如：数学、英语",
    type: "input",
    section: "ability",
    hint: "支持填写多个科目，建议使用顿号或逗号分隔。"
  },
  personality: {
    label: "性格描述",
    placeholder: "请输入性格特点、教学风格或个人特长",
    type: "textarea",
    section: "ability",
    hint: "适合作为支教志愿者的个人风格补充说明。"
  },
  availableTime: {
    label: "可授课时间",
    placeholder: "如：周六 19:00-21:00",
    type: "input",
    section: "ability",
    hint: "建议填写可固定参与支教的时间段。"
  },
  guardianContact: {
    label: "监护人联系方式",
    placeholder: "用于紧急联系",
    type: "input",
    section: "learning",
    hint: "用于联系学员监护人。"
  },
  learningGoal: {
    label: "学习目标",
    placeholder: "请输入阶段学习目标",
    type: "textarea",
    section: "learning",
    hint: "例如提分目标、阅读计划或薄弱点改善方向。"
  },
  region: {
    label: "管辖区域",
    placeholder: "如：云龙县龙兴村",
    type: "input",
    section: "region",
    hint: "用于说明学校老师负责的区域范围。"
  },
  managedStudents: {
    label: "代管学员范围",
    placeholder: "填写代管年级、班级或学生范围",
    type: "textarea",
    section: "region",
    hint: "有助于明确代管范围与职责分工。"
  },
  organization: {
    label: "所属机构",
    placeholder: "请输入平台运营单位",
    type: "input",
    section: "platform",
    hint: "用于说明平台管理员隶属的机构或组织。"
  },
  permissionNote: {
    label: "权限备注",
    placeholder: "记录授权、审批或岗位说明",
    type: "textarea",
    section: "platform",
    hint: "建议写清楚当前拥有的审核或干预权限范围。"
  }
};

const roleSectionOrderMap = {
  teacher: ["basic", "ability"],
  student: ["basic", "learning"],
  admin_level_2: ["basic", "region"],
  admin_level_1: ["basic", "platform"]
};

function buildSections(role, form) {
  const visibleFields = roleFieldMap[role] || roleFieldMap.student;
  const grouped = {};

  visibleFields.forEach((key) => {
    const meta = fieldMetaMap[key];
    if (!meta) {
      return;
    }
    const sectionKey = meta.section;
    if (!grouped[sectionKey]) {
      grouped[sectionKey] = {
        key: sectionKey,
        title: sectionMetaMap[sectionKey].title,
        desc: sectionMetaMap[sectionKey].desc,
        fields: []
      };
    }
    grouped[sectionKey].fields.push({
      key,
      label: meta.label,
      placeholder: meta.placeholder,
      type: meta.type,
      hint: meta.hint,
      value: form[key] || ""
    });
  });

  return (roleSectionOrderMap[role] || ["basic"])
    .map((key) => grouped[key])
    .filter(Boolean);
}

function buildSummaryCards(role, visibleFields, form) {
  const filledCount = visibleFields.filter((key) => (form[key] || "").trim()).length;
  const totalCount = visibleFields.length;
  return [
    {
      label: "当前角色",
      value: ROLE_DISPLAY_NAME[role] || "访客",
      note: "字段会根据当前身份自动切换"
    },
    {
      label: "填写进度",
      value: `${filledCount}/${totalCount}`,
      note: "已填写 / 应填写字段数"
    },
    {
      label: "表单分组",
      value: `${(roleSectionOrderMap[role] || []).length || 1}组`,
      note: "按角色拆分为更清晰的资料模块"
    }
  ];
}

Page({
  data: {
    role: "",
    roleLabel: "",
    visibleFields: [],
    heroEyebrow: "",
    heroTitle: "",
    heroDesc: "",
    heroBadges: [],
    focusNote: "",
    summaryCards: [],
    sections: [],
    form: {
      name: "",
      school: "",
      grade: "",
      subjects: "",
      personality: "",
      availableTime: "",
      guardianContact: "",
      learningGoal: "",
      region: "",
      managedStudents: "",
      organization: "",
      permissionNote: ""
    }
  },
  onLoad() {
    this.syncPage(this.data.form);
  },
  onShow() {
    this.syncPage(this.data.form);
  },
  syncPage(form) {
    const role = getApp().globalData.role || "";
    const visibleFields = roleFieldMap[role] || roleFieldMap.student;
    const roleMeta = roleMetaMap[role] || roleMetaMap.student;
    this.setData({
      role,
      roleLabel: ROLE_DISPLAY_NAME[role] || "访客",
      visibleFields,
      heroEyebrow: roleMeta.eyebrow,
      heroTitle: roleMeta.title,
      heroDesc: roleMeta.desc,
      heroBadges: roleMeta.badges,
      focusNote: roleMeta.focusNote,
      summaryCards: buildSummaryCards(role, visibleFields, form),
      sections: buildSections(role, form),
      form
    });
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const nextForm = {
      ...this.data.form,
      [field]: value
    };
    this.syncPage(nextForm);
  },
  onSubmit() {
    const { form, visibleFields } = this.data;
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: "请填写姓名", icon: "none" });
      return;
    }
    if (visibleFields.includes("school") && !form.school.trim()) {
      wx.showToast({ title: "请填写学校", icon: "none" });
      return;
    }
    if (visibleFields.includes("grade") && !form.grade.trim()) {
      wx.showToast({ title: "请填写年级", icon: "none" });
      return;
    }
    wx.showToast({
      title: "资料已提交",
      icon: "success"
    });
  }
});
