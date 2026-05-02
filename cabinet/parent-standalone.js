(function () {

  "use strict";

const STORAGE_KEY = "nge_os_v1";
const SESSION_KEY = "nge_os_session_v1";

/**
 * @typedef {"student"|"teacher"|"parent"} Role
 *
 * @typedef {{
 *  id: string;
 *  role: Role;
 *  name: string;
 *  email: string;
 *  linkedStudents?: string[];
 * }} User
 *
 * @typedef {"planned"|"done"|"missed"} LessonStatus
 *
 * @typedef {{
 *  id: string;
 *  studentId: string;
 *  teacherId: string;
 *  date: string; // ISO
 *  status: LessonStatus;
 *  homework: string;
 *  notes: string;
 *  progressMeUrl?: string;
 * }} Lesson
 *
 * @typedef {{
 *  id: string;
 *  studentId: string;
 *  amount: number;
 *  status: "pending"|"paid"|"overdue";
 *  date: string; // ISO
 *  comment?: string;
 *  lessonsTotal?: number;
 *  lessonsLeft?: number;
 *  paidAt?: string;
 *  remindAt?: string;
 * }} Payment
 *
 * @typedef {{
 *  studentId: string;
 *  level: string;
 *  goals: string;
 *  comments: string;
 *  studentGoals?: string;
 *  studentNotes?: string;
 * }} Progress
 *
 * @typedef {{
 *  id: string;
 *  studentId: string;
 *  kind: "schedule"|"material"|"practice";
 *  title: string;
 *  details?: string;
 *  url?: string;
 *  source?: "manual"|"linguaboost";
 *  moduleId?: string;
 *  level?: string;
 *  at?: string; // ISO (for schedule/practice)
 *  minutes?: number; // for practice
 *  done?: boolean;
 *  createdAt: string; // ISO
 * }} StudentItem
 *
 * @typedef {{
 *  studentId: string;
 *  tariff: string;
 *  plan?: string;
 * }} StudentMeta
 *
 * @typedef {{
 *  id: string;
 *  teacherId: string;
 *  title: string;
 *  notes?: string;
 *  due?: string; // ISO date
 *  status: "open"|"done";
 *  createdAt: string; // ISO
 * }} TeacherTask
 *
 * @typedef {{
 *  id: string;
 *  userId: string;
 *  channel: "telegram"|"email";
 *  payload: { title: string; text: string; link?: string };
 *  sendAt: string; // ISO
 *  sentAt?: string; // ISO
 * }} Notification
 *
 * @typedef {{
 *  id: string;
 *  studentId: string;
 *  title: string;
 *  body: string;
 *  createdAt: string;
 * }} StudentReport
 *
 * @typedef {{
 *  users: User[];
 *  lessons: Lesson[];
 *  payments: Payment[];
 *  progress: Progress[];
 *  studentItems: StudentItem[];
 *  studentMeta: StudentMeta[];
 *  teacherTasks: TeacherTask[];
 *  notifications: Notification[];
 *  reports?: StudentReport[];
 * }} State
 */

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayISODate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** @returns {State} */
function seed() {
  const teacherId = "u_teacher_1";
  const studentA = "u_student_1";
  const studentB = "u_student_2";
  const parentId = "u_parent_1";

  const now = new Date();
  const plusDays = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  return {
    users: [
      { id: teacherId, role: "teacher", name: "РњР°СЂРёСЏ (РЈС‡РёС‚РµР»СЊ)", email: "teacher@example.com" },
      { id: studentA, role: "student", name: "РЈС‡РµРЅРёРє Рђ", email: "student.a@example.com" },
      { id: studentB, role: "student", name: "РЈС‡РµРЅРёРє Р‘", email: "student.b@example.com" },
      { id: parentId, role: "parent", name: "Р РѕРґРёС‚РµР»СЊ", email: "parent@example.com", linkedStudents: [studentA, studentB] },
    ],
    lessons: [
      {
        id: "l_1",
        studentId: studentA,
        teacherId,
        date: plusDays(0),
        status: "planned",
        homework: "РџРѕРІС‚РѕСЂРёС‚СЊ Past Simple (10 РїСЂРёРјРµСЂРѕРІ) + 15 РјРёРЅСѓС‚ С‡С‚РµРЅРёСЏ.",
        notes: "",
        progressMeUrl: "https://progressme.ru/",
      },
      {
        id: "l_2",
        studentId: studentB,
        teacherId,
        date: plusDays(1),
        status: "planned",
        homework: "РђСѓРґРёСЂРѕРІР°РЅРёРµ: 1 РєРѕСЂРѕС‚РєРѕРµ РІРёРґРµРѕ, РІС‹РїРёСЃР°С‚СЊ 10 СЃР»РѕРІ.",
        notes: "",
      },
      {
        id: "l_3",
        studentId: studentA,
        teacherId,
        date: plusDays(-2),
        status: "done",
        homework: "Р—Р°РєСЂРµРїРёС‚СЊ Р»РµРєСЃРёРєСѓ РїРѕ С‚РµРјРµ В«TravelВ».",
        notes: "РЎРёР»СЊРЅР°СЏ РґРёРЅР°РјРёРєР°, РґРµСЂР¶РёС‚ С‚РµРјРї. РЎР»РµРґСѓСЋС‰РёР№ С€Р°Рі: speaking drills.",
      },
    ],
    payments: [
      {
        id: "p_1",
        studentId: studentA,
        amount: 3500,
        status: "paid",
        date: plusDays(-7),
        paidAt: plusDays(-7),
        remindAt: plusDays(21),
        lessonsTotal: 4,
        lessonsLeft: 3,
        comment: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ",
      },
      {
        id: "p_2",
        studentId: studentB,
        amount: 3000,
        status: "pending",
        date: plusDays(-3),
        remindAt: plusDays(4),
        lessonsTotal: 4,
        lessonsLeft: 1,
        comment: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ",
      },
    ],
    progress: [
      {
        studentId: studentA,
        level: "A2",
        goals: "Speaking + travel vocabulary",
        comments: "РџР»Р°РІРЅРѕ СЂР°СЃС‚С‘С‚ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ.",
        studentGoals: "",
        studentNotes: "",
      },
      {
        studentId: studentB,
        level: "B1",
        goals: "Grammar + fluency",
        comments: "РќСѓР¶РµРЅ СЂРµР¶РёРј РґРѕРјР°С€РєРё 3Г—/РЅРµРґ.",
        studentGoals: "",
        studentNotes: "",
      },
    ],
    studentItems: [
      {
        id: "si_1",
        studentId: studentA,
        kind: "practice",
        title: "Speaking drill",
        details: "10 РјРёРЅСѓС‚ вЂ” РІРѕРїСЂРѕСЃС‹/РѕС‚РІРµС‚С‹ РїРѕ С‚РµРјРµ Travel.",
        minutes: 10,
        at: plusDays(-1),
        done: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "si_2",
        studentId: studentA,
        kind: "material",
        title: "РЎРїРёСЃРѕРє СЃР»РѕРІ: Travel (10)",
        details: "РџРѕРІС‚РѕСЂРёС‚СЊ + 10 РїСЂРёРјРµСЂРѕРІ РІ Past Simple.",
        url: "",
        done: false,
        createdAt: new Date().toISOString(),
      },
    ],
    studentMeta: [
      { studentId: studentA, tariff: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3500 в‚Ѕ", plan: "1Г—/РЅРµРґ" },
      { studentId: studentB, tariff: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3000 в‚Ѕ", plan: "2Г—/РЅРµРґ" },
    ],
    teacherTasks: [
      {
        id: "t_1",
        teacherId,
        title: "РџСЂРѕРІРµСЂРёС‚СЊ РґРѕРјР°С€РєСѓ (РЈС‡РµРЅРёРє Рђ)",
        notes: "Past Simple (10 РїСЂРёРјРµСЂРѕРІ) + Р»РµРєСЃРёРєР° Travel.",
        due: todayISODate(),
        status: "open",
        createdAt: new Date().toISOString(),
      },
    ],
    notifications: [],
    reports: [],
  };
}

/** @returns {State} */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return seed();
    const s = /** @type {State} */ (parsed);

    // Backward-compatible defaults (when localStorage has older schema).
    if (!Array.isArray(s.users)) s.users = [];
    if (!Array.isArray(s.lessons)) s.lessons = [];
    if (!Array.isArray(s.payments)) s.payments = [];
    if (!Array.isArray(s.progress)) s.progress = [];
    if (!Array.isArray(s.notifications)) s.notifications = [];
    if (!Array.isArray(s.reports)) s.reports = [];
    if (!Array.isArray(s.studentItems)) s.studentItems = [];
    if (!Array.isArray(s.studentMeta)) s.studentMeta = [];
    if (!Array.isArray(s.teacherTasks)) s.teacherTasks = [];

    s.progress = s.progress.map((p) => ({
      ...p,
      studentGoals: p.studentGoals || "",
      studentNotes: p.studentNotes || "",
    }));
    s.payments = s.payments.map((p) => ({
      ...p,
      lessonsTotal: Number.isFinite(Number(p.lessonsTotal)) ? Number(p.lessonsTotal) : 0,
      lessonsLeft: Number.isFinite(Number(p.lessonsLeft)) ? Number(p.lessonsLeft) : 0,
      paidAt: p.paidAt || (p.status === "paid" ? p.date : ""),
      remindAt: p.remindAt || "",
      paymentUrl: p.paymentUrl || "",
      paymentProvider: p.paymentProvider || "tbank",
      payerMarkedAt: p.payerMarkedAt || "",
      receiptNumber: p.receiptNumber || "",
      receiptUrl: p.receiptUrl || "",
    }));

    return s;
  } catch {
    return seed();
  }
}

/** @param {State} state */
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

/** @returns {{ userId: string; role: Role } | null} */
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.userId || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** @param {{ userId: string; role: Role }} session */
function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** @param {State} state @param {string} userId */
function getUser(state, userId) {
  return state.users.find((u) => u.id === userId) || null;
}

/** @param {State} state */
function listStudents(state) {
  return state.users.filter((u) => u.role === "student");
}

/** @param {State} state @param {string} teacherId */
function listLessonsForTeacher(state, teacherId) {
  return state.lessons
    .filter((l) => l.teacherId === teacherId)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** @param {State} state @param {string} studentId */
function listLessonsForStudent(state, studentId) {
  return state.lessons
    .filter((l) => l.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** @param {State} state @param {string} studentId */
function getProgress(state, studentId) {
  return state.progress.find((p) => p.studentId === studentId) || null;
}

/**
 * @param {State} state
 * @param {string} studentId
 * @param {Partial<Progress>} patch
 */
function upsertProgress(state, studentId, patch) {
  const idx = state.progress.findIndex((p) => p.studentId === studentId);
  if (idx === -1) {
    const created = {
      studentId,
      level: patch.level || "вЂ”",
      goals: patch.goals || "",
      comments: patch.comments || "",
    };
    state.progress.push(created);
    saveState(state);
    return created;
  }
  state.progress[idx] = { ...state.progress[idx], ...patch, studentId };
  saveState(state);
  return state.progress[idx];
}

/** @param {State} state @param {string} studentId */
function listPaymentsForStudent(state, studentId) {
  return state.payments
    .filter((p) => p.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * @param {State} state
 * @param {Omit<Lesson, "id">} input
 */
function addLesson(state, input) {
  const lesson = { id: uid("lesson"), ...input };
  state.lessons.push(lesson);
  saveState(state);
  return lesson;
}

/** @param {State} state @param {string} lessonId @param {Partial<Lesson>} patch */
function updateLesson(state, lessonId, patch) {
  const idx = state.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  state.lessons[idx] = { ...state.lessons[idx], ...patch };
  saveState(state);
  return state.lessons[idx];
}

/** @param {State} state @param {string} lessonId */
function deleteLesson(state, lessonId) {
  const idx = state.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return false;
  state.lessons.splice(idx, 1);
  saveState(state);
  return true;
}

/**
 * @param {State} state
 * @param {Omit<Payment, "id">} input
 */
function addPayment(state, input) {
  const payment = { id: uid("pay"), ...input };
  state.payments.push(payment);
  saveState(state);
  return payment;
}

/** @param {State} state @param {string} paymentId @param {Partial<Payment>} patch */
function updatePayment(state, paymentId, patch) {
  const idx = state.payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return null;
  state.payments[idx] = { ...state.payments[idx], ...patch };
  saveState(state);
  return state.payments[idx];
}

/** @param {State} state @param {string} paymentId */
function deletePayment(state, paymentId) {
  const idx = state.payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return false;
  state.payments.splice(idx, 1);
  saveState(state);
  return true;
}

/**
 * @param {State} state
 * @param {Omit<Notification, "id">} input
 */
function queueNotification(state, input) {
  const n = { id: uid("notif"), ...input };
  state.notifications.push(n);
  saveState(state);
  return n;
}

/** @param {State} state */
function listPendingNotifications(state) {
  return state.notifications
    .filter((n) => !n.sentAt)
    .slice()
    .sort((a, b) => new Date(b.sendAt) - new Date(a.sendAt));
}

/** @param {State} state @param {string} userId */
function listPendingNotificationsForUser(state, userId) {
  return listPendingNotifications(state).filter((n) => n.userId === userId);
}

/** @param {State} state @param {string} studentId */
function listParentsForStudent(state, studentId) {
  return state.users.filter((u) => u.role === "parent" && (u.linkedStudents || []).includes(studentId));
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function getISOForLocalDateTime(dateStr, timeStr) {
  const safeDate = dateStr || todayISODate();
  const safeTime = timeStr || "12:00";
  const [yy, mm, dd] = safeDate.split("-").map((x) => Number(x));
  const [hh, min] = safeTime.split(":").map((x) => Number(x));
  const local = new Date(yy, (mm || 1) - 1, dd || 1, hh || 0, min || 0, 0, 0);
  return local.toISOString();
}

/** @param {State} state @param {string} studentId */
function getStudentMeta(state, studentId) {
  return state.studentMeta.find((m) => m.studentId === studentId) || null;
}

/**
 * @param {State} state
 * @param {string} studentId
 * @param {Partial<StudentMeta>} patch
 */
function upsertStudentMeta(state, studentId, patch) {
  const idx = state.studentMeta.findIndex((m) => m.studentId === studentId);
  if (idx === -1) {
    const created = {
      studentId,
      tariff: (patch.tariff || "").trim() || "вЂ”",
      plan: (patch.plan || "").trim() || "",
    };
    state.studentMeta.push(created);
    saveState(state);
    return created;
  }
  state.studentMeta[idx] = { ...state.studentMeta[idx], ...patch, studentId };
  saveState(state);
  return state.studentMeta[idx];
}

/**
 * @param {State} state
 * @param {string} studentId
 * @param {StudentItem["kind"] | null} kind
 */
function listStudentItems(state, studentId, kind = null) {
  return state.studentItems
    .filter((x) => x.studentId === studentId && (!kind || x.kind === kind))
    .slice()
    .sort((a, b) => new Date((b.at || b.createdAt) ?? 0) - new Date((a.at || a.createdAt) ?? 0));
}

/**
 * @param {State} state
 * @param {Omit<StudentItem, "id"|"createdAt">} input
 */
function addStudentItem(state, input) {
  const item = { id: uid("si"), createdAt: new Date().toISOString(), ...input };
  state.studentItems.push(item);
  saveState(state);
  return item;
}

/** @param {State} state @param {string} itemId @param {Partial<StudentItem>} patch */
function updateStudentItem(state, itemId, patch) {
  const idx = state.studentItems.findIndex((x) => x.id === itemId);
  if (idx === -1) return null;
  state.studentItems[idx] = { ...state.studentItems[idx], ...patch, id: state.studentItems[idx].id };
  saveState(state);
  return state.studentItems[idx];
}

/** @param {State} state @param {string} itemId */
function deleteStudentItem(state, itemId) {
  const idx = state.studentItems.findIndex((x) => x.id === itemId);
  if (idx === -1) return false;
  state.studentItems.splice(idx, 1);
  saveState(state);
  return true;
}

/** @param {State} state @param {string} teacherId */
function listTeacherTasks(state, teacherId) {
  return state.teacherTasks
    .filter((t) => t.teacherId === teacherId)
    .slice()
    .sort((a, b) => {
      const ad = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

/**
 * @param {State} state
 * @param {Omit<TeacherTask, "id"|"createdAt">} input
 */
function addTeacherTask(state, input) {
  const task = { id: uid("task"), createdAt: new Date().toISOString(), ...input };
  state.teacherTasks.push(task);
  saveState(state);
  return task;
}

/** @param {State} state @param {string} taskId @param {Partial<TeacherTask>} patch */
function updateTeacherTask(state, taskId, patch) {
  const idx = state.teacherTasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;
  state.teacherTasks[idx] = { ...state.teacherTasks[idx], ...patch, id: state.teacherTasks[idx].id };
  saveState(state);
  return state.teacherTasks[idx];
}

/** @param {State} state @param {string} taskId */
function deleteTeacherTask(state, taskId) {
  const idx = state.teacherTasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;
  state.teacherTasks.splice(idx, 1);
  saveState(state);
  return true;
}


const CABINET_THEME_KEY = "nge-cabinet-theme";
const SUN_ICON = "\u2600"; // вЂ
const MOON_ICON = "\u263E"; // вѕ
const THEME_WIRED_FLAG = "__NGE_CABINET_THEME_WIRED__";

function qs(sel) {
  return /** @type {HTMLElement|null} */ (document.querySelector(sel));
}

function qsa(sel) {
  return /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll(sel)));
}

function syncThemeButton() {
  const btn = qs("#theme-toggle");
  if (!btn) return;
  btn.textContent = document.body.classList.contains("light") ? SUN_ICON : MOON_ICON;
}

function getCabinetTheme() {
  const saved = localStorage.getItem(CABINET_THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  localStorage.setItem(CABINET_THEME_KEY, "dark");
  return "dark";
}

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  syncThemeButton();
}

function isThemeWired() {
  // eslint-disable-next-line no-undef
  return typeof window !== "undefined" && Boolean(window[THEME_WIRED_FLAG]);
}

function markThemeWired() {
  // eslint-disable-next-line no-undef
  if (typeof window !== "undefined") window[THEME_WIRED_FLAG] = true;
}

function bootThemeAndLang() {
  // Cabinets default to dark theme; light is optional via toggle.
  applyTheme(getCabinetTheme());

  const savedLang = localStorage.getItem("nge-lang");
  if (savedLang) document.documentElement.setAttribute("lang", savedLang);
  const langBtn = qs("#langBtn");
  if (langBtn) langBtn.textContent = (document.documentElement.getAttribute("lang") || "ru").toUpperCase();

  qsa("[data-nav]").forEach((a) => {
    const page = document.body.getAttribute("data-page") || "";
    if (a.getAttribute("data-nav") === page) a.classList.add("active");
  });

  translatePage();
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  localStorage.setItem(CABINET_THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function toggleLang() {
  const cur = document.documentElement.getAttribute("lang") || "ru";
  const next = cur === "ru" ? "en" : "ru";
  document.documentElement.setAttribute("lang", next);
  localStorage.setItem("nge-lang", next);
  const langBtn = qs("#langBtn");
  if (langBtn) langBtn.textContent = next.toUpperCase();
  translatePage();
}

function translatePage() {
  const lang = document.documentElement.getAttribute("lang") || "ru";
  document.querySelectorAll("[data-ru]").forEach((el) => {
    const text = el.getAttribute(lang === "ru" ? "data-ru" : "data-en");
    if (text) el.textContent = text;
  });
}

function ensureRole(requiredRole) {
  let session = getSession();
  if (!session || session.role !== requiredRole) {
    try {
      signInMock(requiredRole);
      session = getSession();
    } catch {
      // noop
    }
  }
  if (!session || session.role !== requiredRole) {
    const parts = location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const returnTo = encodeURIComponent(last);
    location.href = `login.html?return=${returnTo}&role=${requiredRole}`;
    return null;
  }
  const state = loadState();
  const me = getUser(state, session.userId);
  if (!me) {
    clearSession();
    location.href = "login.html";
    return null;
  }
  return { state, me, session };
}

function signInMock(role) {
  const state = loadState();
  const u = state.users.find((x) => x.role === role);
  if (!u) throw new Error("No user for role");
  setSession({ role, userId: u.id });
  return u;
}

function signOut() {
  clearSession();
  location.href = "login.html";
}

function wireTopbarActions() {
  const themeBtn = qs("#theme-toggle");
  if (themeBtn && !isThemeWired()) {
    themeBtn.addEventListener("click", toggleTheme);
    markThemeWired();
  }
  const langBtn = qs("#langBtn");
  if (langBtn) langBtn.addEventListener("click", toggleLang);

  const outBtn = qs("#signOutBtn");
  if (outBtn) outBtn.addEventListener("click", signOut);

  const resetBtn = qs("#resetStateBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetState();
      saveState(loadState());
      location.reload();
    });
  }

  const me = qs("#whoami");
  const session = getSession();
  if (me && session) {
    const state = loadState();
    const u = getUser(state, session.userId);
    me.textContent = u ? u.name : session.role;
  }

  syncThemeButton();
}


function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function byId(id) {
  return /** @type {HTMLElement|null} */ (document.getElementById(id));
}

function getLang() {
  return document.documentElement.getAttribute("lang") || "ru";
}
function t(ru, en) {
  return getLang() === "ru" ? ru : en;
}

const PAYMENT_SETTINGS_KEY = "nge_payment_settings_v1";
const DEFAULT_TBANK_PAYMENT_URL = "https://www.tinkoff.ru/rm/r_PnDqHEqsDu.EkrmOLeXmQ/MIhLS10143";
const TBANK_PAYMENT_DETAILS = [
  ["РџРѕР»СѓС‡Р°С‚РµР»СЊ", "Р‘СѓСЂС†РµРІР° РњР°СЂРёСЏ Р’РёС‚Р°Р»СЊРµРІРЅР°"],
  ["РЎС‡РµС‚", "40817810200014652973"],
  ["РќР°Р·РЅР°С‡РµРЅРёРµ", "РџРµСЂРµРІРѕРґ СЃСЂРµРґСЃС‚РІ РїРѕ РґРѕРіРѕРІРѕСЂСѓ в„– 5181572792 Р‘СѓСЂС†РµРІР° РњР°СЂРёСЏ Р’РёС‚Р°Р»СЊРµРІРЅР° РќР”РЎ РЅРµ РѕР±Р»Р°РіР°РµС‚СЃСЏ"],
  ["Р‘РРљ", "044525974"],
  ["Р‘Р°РЅРє", "РђРћ \"РўР‘Р°РЅРє\""],
  ["РљРѕСЂСЂ. СЃС‡РµС‚", "30101810145250000974"],
  ["РРќРќ", "7710140679"],
  ["РљРџРџ", "771301001"],
];

function getPaymentSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAYMENT_SETTINGS_KEY) || "{}");
    return {
      tbankUrl: typeof parsed.tbankUrl === "string" && parsed.tbankUrl.trim() ? parsed.tbankUrl.trim() : DEFAULT_TBANK_PAYMENT_URL,
    };
  } catch {
    return { tbankUrl: DEFAULT_TBANK_PAYMENT_URL };
  }
}

function getPaymentUrl(payment) {
  return (payment.paymentUrl || "").trim() || getPaymentSettings().tbankUrl;
}

function renderTbankDetails() {
  return TBANK_PAYMENT_DETAILS.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join("");
}

function pill(status) {
  const map = {
    planned: { tone: "warn", ru: "planned", en: "planned" },
    done: { tone: "ok", ru: "done", en: "done" },
    missed: { tone: "bad", ru: "missed", en: "missed" },
    pending: { tone: "warn", ru: "pending", en: "pending" },
    paid: { tone: "ok", ru: "paid", en: "paid" },
    overdue: { tone: "bad", ru: "overdue", en: "overdue" },
  };
  const v = map[status] || { tone: "", ru: status, en: status };
  return `<span class="pill" data-tone="${escapeHtml(v.tone)}">${escapeHtml(getLang() === "ru" ? v.ru : v.en)}</span>`;
}

function renderChildOptions(state, parentUser) {
  const select = /** @type {HTMLSelectElement|null} */ (byId("childSelect"));
  if (!select) return;
  const ids = parentUser.linkedStudents || [];
  const options = ids
    .map((id) => {
      const u = getUser(state, id);
      return u ? `<option value="${escapeHtml(id)}">${escapeHtml(u.name)}</option>` : "";
    })
    .join("");
  select.innerHTML = options || `<option value="">${escapeHtml(t("РќРµС‚ РїСЂРёРІСЏР·Р°РЅРЅС‹С… СѓС‡РµРЅРёРєРѕРІ", "No linked students"))}</option>`;
}

function renderAttendanceKpis(lessons) {
  const planned = lessons.filter((l) => l.status === "planned").length;
  const done = lessons.filter((l) => l.status === "done").length;
  const missed = lessons.filter((l) => l.status === "missed").length;
  const el = byId("attendanceKpis");
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap: 10px;">
      <span class="pill" data-tone="warn">${escapeHtml(t("planned", "planned"))}: ${planned}</span>
      <span class="pill" data-tone="ok">${escapeHtml(t("done", "done"))}: ${done}</span>
      <span class="pill" data-tone="bad">${escapeHtml(t("missed", "missed"))}: ${missed}</span>
    </div>
  `;
}

function renderLessons(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId).slice(-12).reverse();
  renderAttendanceKpis(lessons);

  const rows = lessons
    .map((l) => {
      return `
        <tr>
          <td><div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div>${pill(l.status)}</td>
          <td class="muted">${escapeHtml((l.homework || "").slice(0, 110) || "вЂ”")}</td>
        </tr>`;
    })
    .join("");

  const table = byId("parentLessonsTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr>
          <th>${escapeHtml(t("Р”Р°С‚Р°", "Date"))}</th>
          <th>${escapeHtml(t("Р”РѕРјР°С€РєР°", "Homework"))}</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="2" class="muted">${escapeHtml(t("РќРµС‚ СѓСЂРѕРєРѕРІ", "No lessons"))}</td></tr>`}</tbody>
    `;
  }
}

function renderHomework(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId)
    .slice()
    .reverse()
    .filter((l) => (l.homework || "").trim())
    .slice(0, 8);

  const homeworkHtml = lessons.length
    ? lessons
        .map(
          (l) => `
            <div style="padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div>
              <div class="muted">${escapeHtml(l.homework)}</div>
            </div>
          `
        )
        .join("")
    : `<div class="muted">${escapeHtml(t("РџРѕРєР° РЅРµС‚ РґРѕРјР°С€РєРё", "No homework yet"))}</div>`;

  const materials = listStudentItems(state, studentId, "material").slice(0, 6);
  const materialsHtml = materials.length
    ? `
      <div style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px;">
        <div class="panel-kicker">${escapeHtml(t("РњР°С‚РµСЂРёР°Р»С‹ СѓС‡РµРЅРёРєР°", "Student materials"))}</div>
        ${materials
          .map((m) => {
            const link = m.url
              ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                  m.url
                )}" target="_blank" rel="noopener noreferrer">в†—</a>`
              : "";
            return `
              <div style="display:flex; justify-content:space-between; gap:12px; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <div>
                  <div><strong>${escapeHtml(m.title)}</strong></div>
                  ${m.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(m.details)}</div>` : ""}
                </div>
                <div>${link}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const practice = listStudentItems(state, studentId, "practice").slice(0, 6);
  const practiceHtml = practice.length
    ? `
      <div style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px;">
        <div class="panel-kicker">${escapeHtml(t("РўСЂРµРЅР°Р¶С‘СЂС‹ Рё РїСЂР°РєС‚РёРєР°", "Practice and trainers"))}</div>
        ${practice
          .map((p) => {
            const link = p.url
              ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                  p.url
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("РћС‚РєСЂС‹С‚СЊ", "Open"))}</a>`
              : "";
            return `
              <div style="display:flex; justify-content:space-between; gap:12px; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <div>
                  <div><strong>${escapeHtml(p.title)}</strong> ${p.done ? pill("paid") : ""}</div>
                  ${p.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(p.details)}</div>` : ""}
                  <div class="muted" style="margin-top:4px;">${escapeHtml(
                    [p.level, p.minutes ? `${p.minutes} ${t("РјРёРЅ", "min")}` : ""].filter(Boolean).join(" В· ")
                  )}</div>
                </div>
                <div>${link}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const html = `${homeworkHtml}${materialsHtml}${practiceHtml}`;
  const el = byId("parentHomeworkList");
  if (el) el.innerHTML = html;
}

function renderProgress(state, studentId) {
  const prog = getProgress(state, studentId);
  const el = byId("parentProgressBox");
  if (!el) return;
  el.innerHTML = prog
    ? `
      <div style="display:grid; gap: 10px;">
        <div><span class="panel-kicker">${escapeHtml(t("РЈСЂРѕРІРµРЅСЊ", "Level"))}</span><div><strong>${escapeHtml(prog.level)}</strong></div></div>
        <div><span class="panel-kicker">${escapeHtml(t("Р¦РµР»Рё", "Goals"))}</span><div class="muted">${escapeHtml(prog.goals)}</div></div>
        <div><span class="panel-kicker">${escapeHtml(t("РљРѕРјРјРµРЅС‚Р°СЂРёР№ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ", "Teacher comment"))}</span><div class="muted">${escapeHtml(prog.comments)}</div></div>
      </div>`
    : `<div class="muted">${escapeHtml(t("РџРѕРєР° РЅРµС‚ РґР°РЅРЅС‹С…", "No data yet"))}</div>`;
}

function buildTeacherSavedReportText(state, report) {
  const student = getUser(state, report.studentId);
  const progress = getProgress(state, report.studentId) || {};
  const meta = getStudentMeta(state, report.studentId) || {};
  const lessons = listLessonsForStudent(state, report.studentId).slice(-8).reverse();
  const builder = window.NGEReportDocs?.buildReportDocument;
  if (!builder) return report.body || "";
  return builder({
    title: report.title || "РћС‚С‡С‘С‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ",
    studentName: student?.name || "вЂ”",
    generatedLabel: formatDateTime(report.createdAt),
    level: progress.level || "вЂ”",
    subscription: meta.tariff || "вЂ”",
    totalLessons: meta.lessonsTotal || lessons.length,
    lessonsLeft: meta.lessonsLeft ?? "вЂ”",
    focus: progress.goals || progress.comments || "Р Р°Р±РѕС‡РёР№ С„РѕРєСѓСЃ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ.",
    body: report.body || progress.comments || "",
    homework: lessons.find((l) => l.homework)?.homework || "",
    nextStep: meta.plan || progress.goals || "РџСЂРѕРґРѕР»Р¶Р°РµРј РїРѕ РїР»Р°РЅСѓ Р·Р°РЅСЏС‚РёР№.",
    lessons: lessons.map((l) => ({
      date: formatDateTime(l.date),
      status: l.status,
      topic: "РЈСЂРѕРє Р°РЅРіР»РёР№СЃРєРѕРіРѕ",
      homework: l.homework || l.notes || "",
    })),
  });
}

function renderParentReports(state, studentId) {
  const el = byId("parentReportsBox");
  if (!el) return;
  const reports = (state.reports || [])
    .filter((r) => r.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  if (!reports.length) {
    el.innerHTML = `
      <div style="border-top:1px solid var(--line); padding-top:12px;">
        <div class="panel-kicker">${escapeHtml(t("РћС‚С‡С‘С‚С‹", "Reports"))}</div>
        <div class="muted">${escapeHtml(t("РћС‚С‡С‘С‚РѕРІ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ РїРѕРєР° РЅРµС‚", "No teacher reports yet"))}</div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="border-top:1px solid var(--line); padding-top:12px;">
      <div class="panel-kicker">${escapeHtml(t("РћС‚С‡С‘С‚С‹", "Reports"))}</div>
      ${reports.map((report) => `
        <div class="student-item-row">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(report.createdAt))}</div>
            <div><strong>${escapeHtml(report.title || t("РћС‚С‡С‘С‚", "Report"))}</strong></div>
            <div class="muted">${escapeHtml((report.body || "").slice(0, 120))}</div>
          </div>
          <div class="student-item-actions">
            <button class="btn-mini" type="button" data-parent-report="${escapeHtml(report.id)}">${escapeHtml(t("PDF", "PDF"))}</button>
          </div>
        </div>`).join("")}
    </div>`;

  el.querySelectorAll("[data-parent-report]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-parent-report");
      const fresh = loadState();
      const report = (fresh.reports || []).find((x) => x.id === id);
      if (!report) return;
      const student = getUser(fresh, report.studentId);
      const safeName = (student?.name || "student").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
      const html = buildTeacherSavedReportText(fresh, report);
      window.NGEReportDocs?.openPdfPrint
        ? window.NGEReportDocs.openPdfPrint(
ge-teacher-report-${safeName}.pdf`, html)
        : (() => {
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = 
ge-teacher-report-${safeName}.html`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          })();
    });
  });
}

function renderPayments(state, studentId) {
  const payments = listPaymentsForStudent(state, studentId).slice(0, 10);
  const html = payments.length
    ? payments
        .map((p) => {
          const total = Number(p.lessonsTotal || 0);
          const left = Number(p.lessonsLeft || 0);
          const paidAt = p.paidAt ? formatDateTime(p.paidAt) : t("РЅРµ РѕРїР»Р°С‡РµРЅРѕ", "not paid");
          const remindAt = p.remindAt ? formatDateTime(p.remindAt) : t("РЅРµ Р·Р°РґР°РЅРѕ", "not set");
          const paymentUrl = getPaymentUrl(p);
          const markedAt = p.payerMarkedAt ? formatDateTime(p.payerMarkedAt) : "";
          const receiptNumber = (p.receiptNumber || "").trim();
          const receiptUrl = (p.receiptUrl || "").trim();
          return `<div class="payment-row">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(p.date))}</div>
              <div class="muted">${escapeHtml(p.comment || "")}</div>
              <div style="margin-top:6px;"><strong>${escapeHtml(total ? `${left}/${total}` : "вЂ”")}</strong> <span class="muted">${escapeHtml(t("Р·Р°РЅСЏС‚РёР№ РѕСЃС‚Р°Р»РѕСЃСЊ / РІСЃРµРіРѕ", "lessons left / total"))}</span></div>
              <div class="muted" style="margin-top:4px;">${escapeHtml(t("РћРїР»Р°С‡РµРЅРѕ", "Paid"))}: ${escapeHtml(paidAt)} В· ${escapeHtml(t("РќР°РїРѕРјРЅРёС‚СЊ", "Remind"))}: ${escapeHtml(remindAt)}</div>
              <div class="payment-placeholder">
                <strong>${escapeHtml(t("РћРїР»Р°С‚Р° С‡РµСЂРµР· Рў-Р‘Р°РЅРє", "T-Bank payment"))}</strong>
                <div class="muted" style="margin-top:4px;">${escapeHtml(markedAt ? t(`Р РѕРґРёС‚РµР»СЊ РѕС‚РјРµС‚РёР» РѕРїР»Р°С‚Сѓ: ${markedAt}`, `Payment marked by parent: ${markedAt}`) : t("РџРѕСЃР»Рµ РѕРїР»Р°С‚С‹ РЅР°Р¶РјРёС‚Рµ В«РЇ РѕРїР»Р°С‚РёР»(Р°)В»: РїСЂРµРїРѕРґР°РІР°С‚РµР»СЊ РїРѕРґС‚РІРµСЂРґРёС‚ РїР»Р°С‚С‘Р¶ Рё РѕР±РЅРѕРІРёС‚ РѕСЃС‚Р°С‚РѕРє Р·Р°РЅСЏС‚РёР№.", "After payment, click вЂњI paidвЂќ: the teacher will confirm it and update the lesson balance."))}</div>
                <div class="muted" style="margin-top:8px;">${renderTbankDetails()}</div>
                <div class="actions" style="margin-top:10px;">
                  ${paymentUrl ? `<a class="btn-mini" data-primary href="${escapeHtml(paymentUrl)}" target="_blank" rel="noopener">РћРїР»Р°С‚РёС‚СЊ С‡РµСЂРµР· Рў-Р‘Р°РЅРє</a>` : `<span class="btn-mini" aria-disabled="true">${escapeHtml(t("РЎСЃС‹Р»РєР° Рў-Р‘Р°РЅРєР° РіРѕС‚РѕРІРёС‚СЃСЏ", "T-Bank link pending"))}</span>`}
                  ${paymentUrl ? `<button class="btn-mini" type="button" data-parent-pay-confirm="${escapeHtml(p.id)}">${escapeHtml(t("РЇ РѕРїР»Р°С‚РёР»(Р°)", "I paid"))}</button>` : ""}
                </div>
              </div>
              ${receiptUrl ? `<div class="actions" style="margin-top:8px;"><a class="btn-mini" href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener">${escapeHtml(t("РћС‚РєСЂС‹С‚СЊ С‡РµРє", "Open receipt"))}</a></div>` : ""}
              ${receiptNumber && !receiptUrl ? `<div class="muted" style="margin-top:8px;">${escapeHtml(t("Р§РµРє", "Receipt"))}: ${escapeHtml(receiptNumber)}</div>` : ""}
            </div>
            <div class="payment-actions mono"><strong>${escapeHtml(String(p.amount))} в‚Ѕ</strong> ${pill(p.status)}</div>
          </div>`;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("РџРѕРєР° РЅРµС‚ РѕРїР»Р°С‚", "No payments yet"))}</div>`;
  const el = byId("parentPaymentsList");
  if (el) el.innerHTML = html;
  el?.querySelectorAll("[data-parent-pay-confirm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const paymentId = btn.getAttribute("data-parent-pay-confirm") || "";
      const fresh = loadState();
      const payment = fresh.payments.find((x) => x.id === paymentId);
      if (!payment) return;
      if (!getPaymentUrl(payment)) return;
      updatePayment(fresh, paymentId, { status: "pending", payerMarkedAt: new Date().toISOString() });
      const student = getUser(fresh, payment.studentId);
      (fresh.users || [])
        .filter((u) => u.role === "teacher")
        .forEach((teacher) => {
          queueNotification(fresh, {
            userId: teacher.id,
            channel: "telegram",
            payload: {
              title: "Р РѕРґРёС‚РµР»СЊ РѕС‚РјРµС‚РёР» РѕРїР»Р°С‚Сѓ",
              text: `${student?.name || "РЈС‡РµРЅРёРє"}: ${payment.amount} в‚Ѕ В· Рў-Р‘Р°РЅРє В· Р¶РґС‘С‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ`,
              link: payment.paymentUrl || "",
            },
            sendAt: new Date().toISOString(),
          });
        });
      saveState(fresh);
      renderPayments(loadState(), studentId);
    });
  });
}

function renderNotifications(state, parentId) {
  const items = listPendingNotificationsForUser(state, parentId);
  const el = byId("parentNotifList");
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div class="muted">${escapeHtml(t("РџРѕРєР° РЅРµС‚ СѓРІРµРґРѕРјР»РµРЅРёР№", "No notifications yet"))}</div>`;
    return;
  }
  el.innerHTML = items
    .map((n) => {
      const payload = `${n.payload.title}\n${n.payload.text}${n.payload.link ? `\n${n.payload.link}` : ""}`;
      return `
        <div style="border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(n.sendAt))}</div>
              <div><strong>${escapeHtml(n.payload.title)}</strong></div>
            </div>
            <button class="btn-mini" type="button" data-copy="${escapeHtml(payload)}">${escapeHtml(t("РљРѕРїРёСЂРѕРІР°С‚СЊ", "Copy"))}</button>
          </div>
          <div class="muted" style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(n.payload.text)}</div>
        </div>`;
    })
    .join("");

  el.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = t("РЎРєРѕРїРёСЂРѕРІР°РЅРѕ", "Copied");
        setTimeout(() => (btn.textContent = t("РљРѕРїРёСЂРѕРІР°С‚СЊ", "Copy")), 1200);
      } catch {
        // noop
      }
    });
  });
}

function buildProgressReport(state, parentUser, studentId) {
  const student = getUser(state, studentId);
  const progress = getProgress(state, studentId) || {};
  const meta = getStudentMeta(state, studentId) || {};
  const lessons = listLessonsForStudent(state, studentId);
  const payments = listPaymentsForStudent(state, studentId);
  const materials = listStudentItems(state, studentId, "material");
  const practice = listStudentItems(state, studentId, "practice");
  const doneItems = [...materials, ...practice].filter((x) => x.done);
  const practiceMinutes = practice.reduce((sum, item) => sum + (item.done ? Number(item.minutes || 0) : 0), 0);
  const latestHomework = lessons.slice().reverse().find((l) => l.homework)?.homework || "";
  const builder = window.NGEReportDocs?.buildReportDocument;
  if (!builder) return `РћС‚С‡С‘С‚ РѕР± СѓСЃРїРµРІР°РµРјРѕСЃС‚Рё New Generation English\nРЈС‡РµРЅРёРє: ${student?.name || "вЂ”"}`;
  return builder({
    title: "Р РѕРґРёС‚РµР»СЊСЃРєРёР№ РѕС‚С‡С‘С‚ РѕР± СѓСЃРїРµРІР°РµРјРѕСЃС‚Рё",
    studentName: student?.name || "вЂ”",
    parentName: parentUser.name || "",
    generatedLabel: formatDateTime(new Date().toISOString()),
    level: progress.level || "вЂ”",
    subscription: meta.tariff || "вЂ”",
    totalLessons: meta.lessonsTotal || lessons.length,
    lessonsLeft: meta.lessonsLeft ?? "вЂ”",
    focus: progress.goals || progress.comments || "РџСЂРѕРґРѕР»Р¶Р°РµРј СЂР°Р±РѕС‚Сѓ РїРѕ С‚РµРєСѓС‰РµРјСѓ СѓС‡РµР±РЅРѕРјСѓ РїР»Р°РЅСѓ.",
    body: [
      progress.comments || "",
      `Р’С‹РїРѕР»РЅРµРЅРѕ Р·Р°РґР°РЅРёР№: ${doneItems.length}.`,
      practiceMinutes ? `Р—Р°РєСЂС‹С‚Рѕ ${practiceMinutes} РјРёРЅСѓС‚ РїСЂР°РєС‚РёРєРё.` : "",
    ].filter(Boolean).join("\n"),
    homework: latestHomework,
    nextStep: meta.plan || progress.goals || "РЎР»РµРґРёС‚СЊ Р·Р° РґРѕРјР°С€РєРѕР№ Рё Р±Р»РёР¶Р°Р№С€РёРјРё РјР°С‚РµСЂРёР°Р»Р°РјРё.",
    lessons: lessons.slice(-12).reverse().map((l) => ({
      date: formatDateTime(l.date),
      status: l.status,
      topic: "РЈСЂРѕРє Р°РЅРіР»РёР№СЃРєРѕРіРѕ",
      homework: l.homework || l.notes || "",
    })),
    materials: materials.map((m) => ({
      title: m.title,
      details: m.details || m.url || "",
      done: Boolean(m.done),
      date: m.at ? formatDateTime(m.at) : "",
    })),
    practice: practice.map((p) => ({
      title: p.title,
      details: p.details || p.level || p.url || "",
      done: Boolean(p.done),
      minutes: p.minutes || "",
    })),
    payments: payments.map((p) => {
      const total = Number(p.lessonsTotal || 0);
      const left = Number(p.lessonsLeft || 0);
      return {
        date: formatDateTime(p.date),
        amount: p.amount,
        status: p.status,
        comment: `${total ? `РћСЃС‚Р°Р»РѕСЃСЊ Р·Р°РЅСЏС‚РёР№: ${left}/${total}. ` : ""}${p.remindAt ? `РќР°РїРѕРјРЅРёС‚СЊ: ${formatDateTime(p.remindAt)}. ` : ""}${p.comment || ""}`.trim(),
      };
    }),
  });
}

function downloadProgressReport(state, parentUser, studentId) {
  const student = getUser(state, studentId);
  const report = buildProgressReport(state, parentUser, studentId);
  const safeName = (student?.name || "student").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
  if (window.NGEReportDocs?.openPdfPrint) {
    window.NGEReportDocs.openPdfPrint(
ge-progress-${safeName}.pdf`, report);
    return;
  }
  const blob = new Blob([report], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = 
ge-progress-${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ensureReportButton(parentUser, getStudentId) {
  const host = byId("parentProgressBox")?.closest(".panel")?.querySelector(".panel-head");
  if (!host || byId("downloadParentReportBtn")) return;
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.innerHTML = `<button class="btn-mini" id="downloadParentReportBtn" type="button" data-primary>PDF-РѕС‚С‡С‘С‚</button>`;
  host.appendChild(actions);
  byId("downloadParentReportBtn")?.addEventListener("click", () => {
    const studentId = getStudentId();
    if (!studentId) return;
    downloadProgressReport(loadState(), parentUser, studentId);
  });
}

function initParentCabinet(ctx) {
  const state = loadState();
  renderChildOptions(state, ctx.me);

  const select = /** @type {HTMLSelectElement|null} */ (byId("childSelect"));
  const first = select?.value || (ctx.me.linkedStudents && ctx.me.linkedStudents[0]);
  ensureReportButton(ctx.me, () => select?.value || first || "");

  function renderAll(studentId) {
    const fresh = loadState();
    if (!studentId) return;
    renderLessons(fresh, studentId);
    renderHomework(fresh, studentId);
    renderProgress(fresh, studentId);
    renderParentReports(fresh, studentId);
    renderPayments(fresh, studentId);
    renderNotifications(fresh, ctx.me.id);
  }

  if (first) renderAll(first);

  select?.addEventListener("change", () => {
    renderAll(select.value);
  });

  const langBtn = byId("langBtn");
  langBtn?.addEventListener("click", () => {
    const id = select?.value || first;
    renderAll(id);
  });
}



  bootThemeAndLang();
  var ctx = ensureRole("parent");
  wireTopbarActions();
  if (ctx) initParentCabinet(ctx);

})();
