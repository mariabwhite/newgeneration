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
      { id: teacherId, role: "teacher", name: "Мария (Учитель)", email: "teacher@example.com" },
      { id: studentA, role: "student", name: "Ученик А", email: "student.a@example.com" },
      { id: studentB, role: "student", name: "Ученик Б", email: "student.b@example.com" },
      { id: parentId, role: "parent", name: "Родитель", email: "parent@example.com", linkedStudents: [studentA, studentB] },
    ],
    lessons: [
      {
        id: "l_1",
        studentId: studentA,
        teacherId,
        date: plusDays(0),
        status: "planned",
        homework: "Повторить Past Simple (10 примеров) + 15 минут чтения.",
        notes: "",
        progressMeUrl: "https://progressme.ru/",
      },
      {
        id: "l_2",
        studentId: studentB,
        teacherId,
        date: plusDays(1),
        status: "planned",
        homework: "Аудирование: 1 короткое видео, выписать 10 слов.",
        notes: "",
      },
      {
        id: "l_3",
        studentId: studentA,
        teacherId,
        date: plusDays(-2),
        status: "done",
        homework: "Закрепить лексику по теме «Travel».",
        notes: "Сильная динамика, держит темп. Следующий шаг: speaking drills.",
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
        comments: "Плавно растёт уверенность.",
        studentGoals: "",
        studentNotes: "",
      },
      {
        studentId: studentB,
        level: "B1",
        goals: "Grammar + fluency",
        comments: "Нужен режим домашки 3×/нед.",
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
        details: "10 минут — вопросы/ответы по теме Travel.",
        minutes: 10,
        at: plusDays(-1),
        done: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "si_2",
        studentId: studentA,
        kind: "material",
        title: "Список слов: Travel (10)",
        details: "Повторить + 10 примеров в Past Simple.",
        url: "",
        done: false,
        createdAt: new Date().toISOString(),
      },
    ],
    studentMeta: [
      { studentId: studentA, tariff: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3500 в‚Ѕ", plan: "1×/нед" },
      { studentId: studentB, tariff: "РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3000 в‚Ѕ", plan: "2×/нед" },
    ],
    teacherTasks: [
      {
        id: "t_1",
        teacherId,
        title: "Проверить домашку (Ученик А)",
        notes: "Past Simple (10 примеров) + лексика Travel.",
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


const LAB_MODULES = [
  {
    id: "pre-a1-hello-classroom",
    level: "PRE-A1",
    title: "Hello Classroom Fun",
    topic: "First words",
    audience: "Kids / beginners",
    href: "../lingua-boost-lab/pre-a1/hello-classroom-fun.html",
    minutes: 10,
    description: "Первые слова, приветствия и игровые задания для самого старта.",
  },
  {
    id: "a1-school-pronouns",
    level: "A1",
    title: "School Words and Pronouns",
    topic: "Vocabulary and pronouns",
    audience: "Kids / beginners",
    href: "../lingua-boost-lab/a1/school-words-and-pronouns.html",
    minutes: 15,
    description: "Школьная лексика, местоимения, карточки и простая игровая практика.",
  },
  {
    id: "a1-prepositions-world",
    level: "A1",
    title: "Prepositions World",
    topic: "Prepositions",
    audience: "Kids / beginners",
    href: "../lingua-boost-lab/a1/prepositions-world.html",
    minutes: 12,
    description: "Предлоги места через визуальные задания и короткие тренировки.",
  },
  {
    id: "a1-past-simple",
    level: "A1",
    title: "Past Simple Adventure",
    topic: "Past Simple",
    audience: "Kids / teens",
    href: "../lingua-boost-lab/a1/past-simple-adventure.html",
    minutes: 15,
    description: "РРіСЂРѕРІР°СЏ С‚СЂРµРЅРёСЂРѕРІРєР° Past Simple СЃ РєРѕСЂРѕС‚РєРёРјРё Р·Р°РґР°РЅРёСЏРјРё.",
  },
  {
    id: "a1-easter-english",
    level: "A1",
    title: "Easter English Lesson",
    topic: "Seasonal lesson",
    audience: "Kids / beginners",
    href: "../lingua-boost-lab/a1/easter-english-lesson.html",
    minutes: 15,
    description: "Seasonal vocabulary, short tasks, checklists, and creative practice.",
  },
  {
    id: "a2-ancient-china",
    level: "A2",
    title: "Ancient China Explorer",
    topic: "Culture and reading",
    audience: "Teens / mixed",
    href: "../lingua-boost-lab/a2/ancient-china-explorer.html",
    minutes: 20,
    description: "Short reading, new vocabulary, listening, and questions about Ancient China.",
  },
  {
    id: "a2-core-trainer",
    level: "A2",
    title: "Core Trainer A2-B1",
    topic: "Core skills",
    audience: "Teens / adults",
    href: "../lingua-boost-lab/a2/core-trainer-a2-b1.html",
    minutes: 20,
    description: "Базовая системная тренировка для перехода к уверенному B1.",
  },
  {
    id: "b1-word-building",
    level: "B1",
    title: "Word Building: Prefixes and Suffixes",
    topic: "Word formation",
    audience: "Teens / exams",
    href: "../lingua-boost-lab/b1/word-building-prefixes-and-suffixes.html",
    minutes: 20,
    description: "Словообразование, приставки, суффиксы и экзаменационная практика.",
  },
  {
    id: "b1-ancient-china-culture",
    level: "B1",
    title: "Ancient China: Cultural Studies",
    topic: "Culture and discussion",
    audience: "Teens / adults",
    href: "../lingua-boost-lab/b1/ancient-china-cultural-studies.html",
    minutes: 20,
    description: "Reading, vocabulary, comprehension questions, and discussion tasks.",
  },
  {
    id: "b1-space-explorers",
    level: "B1+",
    title: "Beyond Earth: Space Explorers",
    topic: "Space English",
    audience: "Teens / adults",
    href: "../lingua-boost-lab/b1/space-explorers-english.html",
    minutes: 20,
    description: "Space vocabulary, listening, pronunciation, and speaking tasks.",
  },
  {
    id: "b1-restaurant-menu",
    level: "B1",
    title: "Restaurant Menu Lab",
    topic: "Speaking and rubric",
    audience: "Teens / adults",
    href: "../lingua-boost-lab/b1/restaurant-menu-lab.html",
    minutes: 20,
    description: "Food vocabulary, speaking task и понятная рубрика для устного ответа.",
  },
  {
    id: "b2-geo-articles",
    level: "B2+",
    title: "Articles with Geographical Names",
    topic: "Articles",
    audience: "Advanced",
    href: "../lingua-boost-lab/b2-plus/articles-with-geographical-names.html",
    minutes: 25,
    description: "Артикли с географическими названиями и продвинутая грамматика.",
  },
];


function isoAtNoon(dateStr) {
  const safeDate = dateStr || new Date().toISOString().slice(0, 10);
  const [yy, mm, dd] = safeDate.split("-").map((x) => Number(x));
  const local = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0);
  return local.toISOString();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
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
  return `<span class="pill" data-tone="${v.tone}">${escapeHtml(v.ru)}</span>`;
}

function byId(id) {
  return /** @type {HTMLElement|null} */ (document.getElementById(id));
}

function setHTML(id, html) {
  const el = byId(id);
  if (el) el.innerHTML = html;
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
  ["Получатель", "Бурцева Мария Витальевна"],
  ["Счет", "40817810200014652973"],
  ["Назначение", "Перевод средств по договору № 5181572792 Бурцева Мария Витальевна НДС не облагается"],
  ["Р‘РРљ", "044525974"],
  ["Банк", "АО \"ТБанк\""],
  ["Корр. счет", "30101810145250000974"],
  ["РРќРќ", "7710140679"],
  ["КПП", "771301001"],
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

function savePaymentSettings(settings) {
  localStorage.setItem(PAYMENT_SETTINGS_KEY, JSON.stringify({
    tbankUrl: (settings.tbankUrl || "").trim(),
  }));
}

function getPaymentUrl(payment) {
  return (payment.paymentUrl || "").trim() || getPaymentSettings().tbankUrl;
}

function renderTbankDetails() {
  return TBANK_PAYMENT_DETAILS.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join("");
}

function computeKPIs(state, teacherId) {
  const lessons = listLessonsForTeacher(state, teacherId);
  const planned = lessons.filter((l) => l.status === "planned");
  const done = lessons.filter((l) => l.status === "done");
  const missed = lessons.filter((l) => l.status === "missed");

  const payments = state.payments;
  const pendingPays = payments.filter((p) => p.status !== "paid");

  return [
    { k: t("ПЛАН", "PLANNED"), v: planned.length },
    { k: t("ГОТОВО", "DONE"), v: done.length },
    { k: t("ПРОПУСК", "MISSED"), v: missed.length },
    { k: t("ОПЛАТЫ", "PAYMENTS"), v: pendingPays.length },
  ];
}

function renderKpis(state, teacherId) {
  const kpis = computeKPIs(state, teacherId);
  const html = kpis
    .map(
      (x) => `
      <div class="kv">
        <div class="k">${escapeHtml(x.k)}</div>
        <div class="v">${escapeHtml(String(x.v))}</div>
      </div>`
    )
    .join("");
  setHTML("kpiGrid", html);
}

function teacherUid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function ensureTeacherCollections(state) {
  if (!Array.isArray(state.reports)) state.reports = [];
  return state;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadHtmlReport(filename, html) {
  if (window.NGEReportDocs?.openPdfPrint) {
    window.NGEReportDocs.openPdfPrint(filename.replace(/\.html$/i, ".pdf"), html);
    return;
  }
  if (window.NGEReportDocs?.downloadHtml) {
    window.NGEReportDocs.downloadHtml(filename, html);
    return;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeICS(text) {
  return String(text || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function toICSDate(iso) {
  return new Date(iso).toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function downloadGoogleCalendarICS(state, teacherId) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//New Generation English//Teacher Cabinet//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  listLessonsForTeacher(state, teacherId).forEach((lesson) => {
    const start = new Date(lesson.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    const student = usersById.get(lesson.studentId);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${lesson.id}@new-generation-english`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(start.toISOString())}`,
      `DTEND:${toICSDate(end.toISOString())}`,
      `SUMMARY:${escapeICS(`Урок английского · ${student?.name || "ученик"}`)}`,
      `DESCRIPTION:${escapeICS(`Статус: ${lesson.status}\nДомашка: ${lesson.homework || "—"}\nЗаметки: ${lesson.notes || "—"}${lesson.progressMeUrl ? `\nProgressMe: ${lesson.progressMeUrl}` : ""}`)}`,
      lesson.progressMeUrl ? `URL:${escapeICS(lesson.progressMeUrl)}` : "",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  downloadTextFile("nge-google-calendar.ics", lines.filter(Boolean).join("\r\n"));
}

function renderStudentCreator(state, teacherId) {
  const el = byId("studentCreator");
  const editor = byId("studentEditor");
  if (editor) editor.style.display = "none";
  if (!el) return;

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding:14px; border-radius:16px; border-color:var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новый ученик", "New student"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("РРјСЏ СѓС‡РµРЅРёРєР°", "Student name"))}
          <input id="newStudentName" placeholder="${escapeHtml(t("РќР°РїСЂ.: РђРЅРЅР°", "e.g. Anna"))}">
        </label>
        <label>${escapeHtml(t("Email ученика", "Student email"))}
          <input id="newStudentEmail" placeholder="student@example.com">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("РРјСЏ СЂРѕРґРёС‚РµР»СЏ", "Parent name"))}
          <input id="newParentName" placeholder="${escapeHtml(t("РњРѕР¶РЅРѕ РѕСЃС‚Р°РІРёС‚СЊ РїСѓСЃС‚С‹Рј", "Optional"))}">
        </label>
        <label>${escapeHtml(t("Email родителя", "Parent email"))}
          <input id="newParentEmail" placeholder="parent@example.com">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <input id="newStudentLevel" placeholder="A1/A2/B1">
        </label>
        <label>${escapeHtml(t("Абонемент", "Subscription"))}
          <input id="newStudentTariff" placeholder="${escapeHtml(t("РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3500 в‚Ѕ", "1:1 В· 3500 в‚Ѕ"))}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("План", "Plan"))}
          <input id="newStudentPlan" placeholder="${escapeHtml(t("1Г—/РЅРµРґ, РІС‚РѕСЂРЅРёРє 14:00", "1Г—/week, Tue 14:00"))}">
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="createStudentBtn" type="button">${escapeHtml(t("Создать ученика", "Create student"))}</button>
        <button class="btn-mini" id="cancelStudentBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelStudentBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("createStudentBtn")?.addEventListener("click", () => {
    const name = /** @type {HTMLInputElement|null} */ (byId("newStudentName"))?.value.trim() || "";
    if (!name) return;
    const email = /** @type {HTMLInputElement|null} */ (byId("newStudentEmail"))?.value.trim() || `${teacherUid("student")}@example.com`;
    const parentName = /** @type {HTMLInputElement|null} */ (byId("newParentName"))?.value.trim() || "";
    const parentEmail = /** @type {HTMLInputElement|null} */ (byId("newParentEmail"))?.value.trim() || "";
    const level = /** @type {HTMLInputElement|null} */ (byId("newStudentLevel"))?.value.trim() || "";
    const tariff = /** @type {HTMLInputElement|null} */ (byId("newStudentTariff"))?.value.trim() || "";
    const plan = /** @type {HTMLInputElement|null} */ (byId("newStudentPlan"))?.value.trim() || "";

    const fresh = ensureTeacherCollections(loadState());
    const studentId = teacherUid("u_student");
    fresh.users.push({ id: studentId, role: "student", name, email });
    if (parentName || parentEmail) {
      fresh.users.push({
        id: teacherUid("u_parent"),
        role: "parent",
        name: parentName || "Родитель",
        email: parentEmail || `${teacherUid("parent")}@example.com`,
        linkedStudents: [studentId],
      });
    }
    upsertProgress(fresh, studentId, { level, goals: "", comments: "" });
    upsertStudentMeta(fresh, studentId, { tariff, plan });
    saveState(fresh);
    el.style.display = "none";
    renderStudents(loadState());
    renderKpis(loadState(), teacherId);
  });
}

function ensureTeacherControlNotice() {
  if (byId("teacherControlNotice")) return;
  const scopePanel = document.querySelector("#kpiGrid")?.closest("section")?.previousElementSibling?.querySelector(".panel");
  if (!scopePanel) return;
  const notice = document.createElement("div");
  notice.id = "teacherControlNotice";
  notice.className = "panel-sub";
  notice.style.cssText = "margin-top:12px; border-top:1px solid var(--line); padding-top:12px;";
  notice.textContent = t(
    "Важно: кабинет преподавателя должен полностью управлять двумя другими кабинетами. Всё, что назначено или изменено здесь, должно быть видно ученику и родителю: расписание, домашка, материалы, практика, прогресс, оплаты, уведомления и отчёты.",
    "Important: the teacher cabinet must fully control the other two cabinets. Everything assigned or changed here must be visible to the student and parent: schedule, homework, materials, practice, progress, payments, notifications, and reports."
  );
  scopePanel.appendChild(notice);
}

function renderStudents(state) {
  const students = listStudents(state);
  const rows = students
    .map((s) => {
      const p = getProgress(state, s.id);
      const meta = getStudentMeta(state, s.id);
      return `
        <tr data-student-row="1" data-id="${escapeHtml(s.id)}">
          <td><strong>${escapeHtml(s.name)}</strong><div class="panel-kicker">${escapeHtml(s.email)}</div></td>
          <td>${escapeHtml(p?.level || "—")}</td>
          <td class="muted">${escapeHtml((p?.goals || "").slice(0, 42) || "—")}</td>
          <td class="muted mono">${escapeHtml((meta?.tariff || "—").slice(0, 28))}</td>
        </tr>`;
    })
    .join("");

  setHTML(
    "studentsTable",
    `
    <thead>
      <tr>
        <th>${escapeHtml(t("Ученик", "Student"))}</th>
        <th>${escapeHtml(t("Уровень", "Level"))}</th>
        <th>${escapeHtml(t("Цели", "Goals"))}</th>
        <th>${escapeHtml(t("Тариф", "Tariff"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">${escapeHtml(t("Нет данных", "No data"))}</td></tr>`}</tbody>
  `
  );

  const table = byId("studentsTable");
  table?.querySelectorAll("[data-student-row]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.getAttribute("data-id");
      if (!id) return;
      renderStudentEditor(loadState(), id);
    });
  });
}

function renderStudentControlBridge(state, studentId) {
  const el = byId("studentControlBridge");
  if (!el) return;
  const items = listStudentItems(state, studentId).slice(0, 8);
  const labOptions = LAB_MODULES.map(
    (m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(`${m.level} В· ${m.title}`)}</option>`
  ).join("");
  const rows = items.length
    ? items
        .map(
          (item) => `
          <div class="student-item-row">
            <div>
              <div><strong>${escapeHtml(item.title)}</strong></div>
              <div class="muted">${escapeHtml(item.kind)}${item.done ? " · выполнено" : ""}${item.details ? ` В· ${escapeHtml(item.details)}` : ""}</div>
            </div>
            <div class="student-item-actions">
              <button class="btn-mini" type="button" data-remove-student-item="${escapeHtml(item.id)}">${escapeHtml(t("Убрать", "Remove"))}</button>
            </div>
          </div>`
        )
        .join("")
    : `<div class="muted">${escapeHtml(t("Пока нет назначений в кабинеты ученика и родителя.", "No assignments in student and parent cabinets yet."))}</div>`;

  el.innerHTML = `
    <div class="panel-kicker">${escapeHtml(t("Контроль кабинетов", "Cabinet control"))}</div>
    <p class="panel-sub" style="margin-bottom:10px;">${escapeHtml(
      t(
        "Преподаватель управляет тем, что увидят ученик и родитель: материалы, практика, тренажёры, статусы, прогресс, оплаты и уведомления.",
        "The teacher controls what the student and parent see: materials, practice, trainers, statuses, progress, payments, and notifications."
      )
    )}</p>
    <div class="payment-placeholder" style="margin-bottom:12px;">${escapeHtml(
      t(
        "Попадает ученику: расписание, домашка, материалы, тренажёры, прогресс. Попадает родителю: расписание, домашка, материалы, прогресс, отчёты, оплаты и уведомления.",
        "Student sees: schedule, homework, materials, trainers, progress. Parent sees: schedule, homework, materials, progress, reports, payments, and notifications."
      )
    )}</div>
    ${rows}
    <div class="form-row" style="margin-top: 12px;">
      <label>${escapeHtml(t("Тип", "Type"))}
        <select id="teacherItemKind">
          <option value="material">${escapeHtml(t("Материал / домашка", "Material / homework"))}</option>
          <option value="practice">${escapeHtml(t("Практика / тренажёр", "Practice / trainer"))}</option>
        </select>
      </label>
      <label>${escapeHtml(t("Минуты", "Minutes"))}
        <input id="teacherItemMinutes" type="number" min="0" step="5" placeholder="15">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Название", "Title"))}
        <input id="teacherItemTitle" placeholder="${escapeHtml(t("Напр.: LinguaBoost · Travel verbs", "e.g. LinguaBoost · Travel verbs"))}">
      </label>
      <label>${escapeHtml(t("Комментарий", "Comment"))}
        <textarea id="teacherItemDetails" placeholder="${escapeHtml(t("Что сделать, на что обратить внимание…", "What to do, what to notice…"))}"></textarea>
      </label>
      <label>${escapeHtml(t("Ссылка", "Link"))}
        <input id="teacherItemUrl" placeholder="https://...">
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" data-primary id="teacherAssignItemBtn" type="button">${escapeHtml(t("Назначить в оба кабинета", "Assign to both cabinets"))}</button>
    </div>
    <div class="form-row" style="margin-top:14px; grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Быстро назначить тренажёр LinguaBoost", "Quick LinguaBoost trainer"))}
        <select id="teacherLabModule">${labOptions}</select>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="teacherAssignLabBtn" type="button">${escapeHtml(t("Назначить тренажёр", "Assign trainer"))}</button>
    </div>
  `;

  el.querySelectorAll("[data-remove-student-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-student-item");
      if (!id) return;
      const fresh = loadState();
      deleteStudentItem(fresh, id);
      saveState(fresh);
      renderStudentControlBridge(loadState(), studentId);
    });
  });

  byId("teacherAssignItemBtn")?.addEventListener("click", () => {
    const kind = /** @type {HTMLSelectElement|null} */ (byId("teacherItemKind"))?.value || "material";
    const title = /** @type {HTMLInputElement|null} */ (byId("teacherItemTitle"))?.value.trim() || "";
    const details = /** @type {HTMLTextAreaElement|null} */ (byId("teacherItemDetails"))?.value.trim() || "";
    const url = /** @type {HTMLInputElement|null} */ (byId("teacherItemUrl"))?.value.trim() || "";
    const minutesRaw = Number(/** @type {HTMLInputElement|null} */ (byId("teacherItemMinutes"))?.value || 0);
    if (!title) return;
    const fresh = loadState();
    addStudentItem(fresh, {
      studentId,
      kind,
      title,
      details,
      url,
      minutes: Number.isFinite(minutesRaw) ? minutesRaw : 0,
      done: false,
      at: new Date().toISOString(),
    });
    const student = getUser(fresh, studentId);
    listParentsForStudent(fresh, studentId).forEach((parent) => {
      queueNotification(fresh, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новое назначение",
          text: `${student?.name || "Ученик"} получил новое задание: ${title}${details ? `\n${details}` : ""}`,
          link: url || undefined,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(fresh);
    renderStudentControlBridge(loadState(), studentId);
    renderNotifications(loadState());
  });

  byId("teacherAssignLabBtn")?.addEventListener("click", () => {
    const moduleId = /** @type {HTMLSelectElement|null} */ (byId("teacherLabModule"))?.value || "";
    const module = LAB_MODULES.find((m) => m.id === moduleId);
    if (!module) return;
    const fresh = loadState();
    addStudentItem(fresh, {
      studentId,
      kind: "practice",
      title: module.title,
      details: `${module.description} ${t("Назначено преподавателем из LinguaBoost Lab.", "Assigned by the teacher from LinguaBoost Lab.")}`,
      url: module.href,
      minutes: module.minutes,
      done: false,
      at: new Date().toISOString(),
      source: "linguaboost",
      moduleId: module.id,
      level: module.level,
    });
    const student = getUser(fresh, studentId);
    listParentsForStudent(fresh, studentId).forEach((parent) => {
      queueNotification(fresh, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новый тренажёр LinguaBoost",
          text: `${student?.name || "Ученик"} получил тренажёр: ${module.title}`,
          link: module.href,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(fresh);
    renderStudentControlBridge(loadState(), studentId);
    renderNotifications(loadState());
  });
}

function renderStudentEditor(state, studentId) {
  const el = byId("studentEditor");
  if (!el) return;
  const student = getUser(state, studentId);
  if (!student) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  const p = getProgress(state, studentId) || { studentId, level: "", goals: "", comments: "" };
  const meta = getStudentMeta(state, studentId) || { studentId, tariff: "вЂ”", plan: "" };
  const parents = listParentsForStudent(state, studentId);
  const parentRows = parents.length
    ? parents
        .map(
          (parent) => `<div class="muted">${escapeHtml(parent.name)} В· ${escapeHtml(parent.email)}</div>`
        )
        .join("")
    : `<div class="muted">${escapeHtml(t("Родитель пока не привязан", "No parent linked yet"))}</div>`;

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Профиль ученика", "Student profile"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(student.name)}</h3>
        </div>
        <div class="actions">
          <button class="btn-mini" id="closeStudentBtn" type="button">${escapeHtml(t("Свернуть", "Collapse"))}</button>
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <input id="studentLevel" value="${escapeHtml(p.level || "")}" placeholder="A1/A2/B1/B2...">
        </label>
        <label>${escapeHtml(t("Email", "Email"))}
          <input value="${escapeHtml(student.email)}" disabled>
        </label>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Тариф", "Tariff"))}
          <input id="studentTariff" value="${escapeHtml(meta.tariff || "")}" placeholder="${escapeHtml(t("РќР°РїСЂ.: РРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕ В· 3500 в‚Ѕ", "e.g. 1:1 В· 3500 в‚Ѕ"))}">
        </label>
        <label>${escapeHtml(t("План", "Plan"))}
          <input id="studentPlan" value="${escapeHtml(meta.plan || "")}" placeholder="${escapeHtml(t("РќР°РїСЂ.: 2Г—/РЅРµРґ", "e.g. 2Г—/week"))}">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Цели", "Goals"))}
          <textarea id="studentGoals" placeholder="${escapeHtml(t("РљРѕСЂРѕС‚РєРѕ: С‡С‚Рѕ РґРµР»Р°РµРј Рё Р·Р°С‡РµРјвЂ¦", "Short: goals and whyвЂ¦"))}">${escapeHtml(
            p.goals || ""
          )}</textarea>
        </label>
        <label>${escapeHtml(t("Комментарии", "Comments"))}
          <textarea id="studentComments" placeholder="${escapeHtml(t("РќР°Р±Р»СЋРґРµРЅРёСЏ Рё РґРѕРіРѕРІРѕСЂС‘РЅРЅРѕСЃС‚РёвЂ¦", "Observations and agreementsвЂ¦"))}">${escapeHtml(
            p.comments || ""
          )}</textarea>
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="saveStudentBtn" type="button">${escapeHtml(t("Сохранить", "Save"))}</button>
      </div>

      <div style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px;">
        <div class="panel-kicker">${escapeHtml(t("Родители", "Parents"))}</div>
        ${parentRows}
        <div class="form-row">
          <label>${escapeHtml(t("РРјСЏ СЂРѕРґРёС‚РµР»СЏ", "Parent name"))}
            <input id="attachParentName" placeholder="${escapeHtml(t("РќР°РїСЂРёРјРµСЂ: РјР°РјР° РђРЅРЅС‹", "e.g. Anna's mother"))}">
          </label>
          <label>${escapeHtml(t("Email родителя", "Parent email"))}
            <input id="attachParentEmail" placeholder="parent@example.com">
          </label>
        </div>
        <div class="actions">
          <button class="btn-mini" id="attachParentBtn" type="button">${escapeHtml(t("Добавить родителя", "Add parent"))}</button>
        </div>
      </div>

      <div id="studentControlBridge" style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px;"></div>
    </div>
  `;

  renderStudentControlBridge(state, studentId);

  byId("closeStudentBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("saveStudentBtn")?.addEventListener("click", () => {
    const level = /** @type {HTMLInputElement|null} */ (byId("studentLevel"))?.value || "";
    const tariff = /** @type {HTMLInputElement|null} */ (byId("studentTariff"))?.value || "";
    const plan = /** @type {HTMLInputElement|null} */ (byId("studentPlan"))?.value || "";
    const goals = /** @type {HTMLTextAreaElement|null} */ (byId("studentGoals"))?.value || "";
    const comments = /** @type {HTMLTextAreaElement|null} */ (byId("studentComments"))?.value || "";
    upsertProgress(state, studentId, { level: level.trim(), goals, comments });
    upsertStudentMeta(state, studentId, { tariff: tariff.trim(), plan: plan.trim() });
    saveState(state);
    renderStudents(loadState());
    renderNotifications(loadState());
  });

  byId("attachParentBtn")?.addEventListener("click", () => {
    const parentName = /** @type {HTMLInputElement|null} */ (byId("attachParentName"))?.value.trim() || "";
    const parentEmail = /** @type {HTMLInputElement|null} */ (byId("attachParentEmail"))?.value.trim() || "";
    if (!parentName && !parentEmail) return;
    const fresh = loadState();
    const existing = parentEmail
      ? fresh.users.find((u) => u.role === "parent" && u.email.toLowerCase() === parentEmail.toLowerCase())
      : null;
    if (existing) {
      const linked = new Set(existing.linkedStudents || []);
      linked.add(studentId);
      existing.linkedStudents = Array.from(linked);
    } else {
      fresh.users.push({
        id: teacherUid("u_parent"),
        role: "parent",
        name: parentName || "Родитель",
        email: parentEmail || `${teacherUid("parent")}@example.com`,
        linkedStudents: [studentId],
      });
    }
    saveState(fresh);
    renderStudentEditor(loadState(), studentId);
    renderStudents(loadState());
  });
}

function renderLessons(state, teacherId, selectedLessonId = null) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const lessons = listLessonsForTeacher(state, teacherId);

  const rows = lessons
    .map((l) => {
      const student = usersById.get(l.studentId);
      const active = selectedLessonId && l.id === selectedLessonId ? ` style="background: color-mix(in srgb, var(--accent) 10%, transparent);"` : "";
      const link = l.progressMeUrl
        ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
            l.progressMeUrl
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Урок", "Lesson"))} ↗</a>`
        : `<span class="muted">${escapeHtml(t("вЂ”", "вЂ”"))}</span>`;

      return `
      <tr data-lesson-row="1" data-id="${escapeHtml(l.id)}"${active}>
        <td><div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div><strong>${escapeHtml(student?.name || "—")}</strong></td>
        <td>${pill(l.status)}</td>
        <td class="muted">${escapeHtml((l.homework || "").slice(0, 54) || "—")}</td>
        <td><div class="student-item-actions">${link}<button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-lesson-del="${escapeHtml(l.id)}">${escapeHtml(t("Удалить", "Delete"))}</button></div></td>
      </tr>`;
    })
    .join("");

  setHTML(
    "lessonsTable",
    `
    <thead>
      <tr>
        <th>${escapeHtml(t("Дата", "Date"))}</th>
        <th>${escapeHtml(t("Статус", "Status"))}</th>
        <th>${escapeHtml(t("Домашка", "Homework"))}</th>
        <th>${escapeHtml(t("Действия", "Actions"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">${escapeHtml(t("Нет уроков", "No lessons"))}</td></tr>`}</tbody>
  `
  );

  const table = byId("lessonsTable");
  if (!table) return;
  table.querySelectorAll("[data-lesson-del]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = btn.getAttribute("data-lesson-del");
      if (!id) return;
      const fresh = loadState();
      deleteLesson(fresh, id);
      saveState(fresh);
      renderKpis(loadState(), teacherId);
      renderLessons(loadState(), teacherId);
      const editor = byId("lessonEditor");
      if (editor) editor.style.display = "none";
    });
  });
  table.querySelectorAll("[data-lesson-row]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.getAttribute("data-id");
      if (!id) return;
      renderLessons(loadState(), teacherId, id);
      renderLessonEditor(loadState(), teacherId, id);
    });
  });
}

function renderLessonEditor(state, teacherId, lessonId) {
  const lesson = state.lessons.find((l) => l.id === lessonId);
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const student = lesson ? usersById.get(lesson.studentId) : null;
  const el = byId("lessonEditor");
  const creator = byId("lessonCreator");
  if (creator) creator.style.display = "none";
  if (!el) return;
  if (!lesson) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  el.style.display = "block";

  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Редактор урока", "Lesson editor"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(student?.name || "—")} · ${escapeHtml(
    formatDateTime(lesson.date)
  )}</h3>
        </div>
        <div class="actions">
          ${
            lesson.progressMeUrl
              ? `<a class="btn-mini" href="${escapeHtml(lesson.progressMeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  t("Перейти", "Open")
                )} в†—</a>`
              : ""
          }
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="lessonStatus">
            <option value="planned"${lesson.status === "planned" ? " selected" : ""}>planned</option>
            <option value="done"${lesson.status === "done" ? " selected" : ""}>done</option>
            <option value="missed"${lesson.status === "missed" ? " selected" : ""}>missed</option>
          </select>
        </label>
        <label>${escapeHtml(t("ProgressMe URL", "ProgressMe URL"))}
          <input id="lessonProgressMe" value="${escapeHtml(lesson.progressMeUrl || "")}" placeholder="https://...">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Домашнее задание", "Homework"))}
          <textarea id="lessonHomework" placeholder="${escapeHtml(t("Текст домашки…", "Homework text…"))}">${escapeHtml(lesson.homework || "")}</textarea>
        </label>
        <label>${escapeHtml(t("Заметки преподавателя", "Teacher notes"))}
          <textarea id="lessonNotes" placeholder="${escapeHtml(t("Кратко: что было/что дальше…", "Short: what happened / next steps…"))}">${escapeHtml(
    lesson.notes || ""
  )}</textarea>
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="saveLessonBtn" type="button">${escapeHtml(t("Сохранить", "Save"))}</button>
        <button class="btn-mini" id="cancelLessonBtn" type="button">${escapeHtml(t("Свернуть", "Collapse"))}</button>
      </div>
    </div>
  `;

  const saveBtn = byId("saveLessonBtn");
  const cancelBtn = byId("cancelLessonBtn");
  const statusEl = /** @type {HTMLSelectElement|null} */ (byId("lessonStatus"));
  const hwEl = /** @type {HTMLTextAreaElement|null} */ (byId("lessonHomework"));
  const notesEl = /** @type {HTMLTextAreaElement|null} */ (byId("lessonNotes"));
  const urlEl = /** @type {HTMLInputElement|null} */ (byId("lessonProgressMe"));

  cancelBtn?.addEventListener("click", () => {
    if (el) el.style.display = "none";
  });

  saveBtn?.addEventListener("click", () => {
    const nextStatus = statusEl?.value || lesson.status;
    const prevStatus = lesson.status;
    const patched = updateLesson(state, lesson.id, {
      status: nextStatus,
      homework: hwEl?.value || "",
      notes: notesEl?.value || "",
      progressMeUrl: urlEl?.value?.trim() || "",
    });
    if (!patched) return;

    if (prevStatus !== "done" && nextStatus === "done") {
      const parents = listParentsForStudent(state, lesson.studentId);
      const link = urlEl?.value?.trim() || undefined;
      const hw = (hwEl?.value || "").trim();
      parents.forEach((p) => {
        queueNotification(state, {
          userId: p.id,
          channel: "telegram",
          payload: {
            title: "Урок проведён",
            text: `Урок с ${student?.name || "учеником"} отмечен как DONE.${hw ? `\n\nР”РѕРјР°С€РєР°:\n${hw}` : ""}`,
            link,
          },
      sendAt: new Date().toISOString(),
        });
      });
    }

    saveState(state);

    renderKpis(loadState(), teacherId);
    renderLessons(loadState(), teacherId, lesson.id);
    renderNotifications(loadState());
  });
}

function renderLessonCreator(state, teacherId) {
  const el = byId("lessonCreator");
  const editor = byId("lessonEditor");
  if (editor) editor.style.display = "none";
  if (!el) return;

  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  const nowDate = new Date().toISOString().slice(0, 10);

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Создать урок", "Create lesson"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(t("Новый урок", "New lesson"))}</h3>
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="newLessonStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="newLessonStatus">
            <option value="planned" selected>planned</option>
            <option value="done">done</option>
            <option value="missed">missed</option>
          </select>
        </label>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Дата", "Date"))}
          <input id="newLessonDate" type="date" value="${escapeHtml(nowDate)}">
        </label>
        <label>${escapeHtml(t("Время", "Time"))}
          <input id="newLessonTime" type="time" value="12:00">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Домашка (черновик)", "Homework (draft)"))}
          <textarea id="newLessonHomework" placeholder="${escapeHtml(t("Что задать…", "What to assign…"))}"></textarea>
        </label>
        <label>${escapeHtml(t("ProgressMe URL (опционально)", "ProgressMe URL (optional)"))}
          <input id="newLessonProgressMe" placeholder="https://...">
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="createLessonBtn" type="button">${escapeHtml(t("Создать", "Create"))}</button>
        <button class="btn-mini" id="cancelCreateLessonBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelCreateLessonBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("createLessonBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("newLessonStudent"))?.value;
    const status = /** @type {HTMLSelectElement|null} */ (byId("newLessonStatus"))?.value || "planned";
    const date = /** @type {HTMLInputElement|null} */ (byId("newLessonDate"))?.value;
    const time = /** @type {HTMLInputElement|null} */ (byId("newLessonTime"))?.value;
    const homework = /** @type {HTMLTextAreaElement|null} */ (byId("newLessonHomework"))?.value || "";
    const progressMeUrl = /** @type {HTMLInputElement|null} */ (byId("newLessonProgressMe"))?.value?.trim() || "";

    if (!studentId) return;
    const created = addLesson(state, {
      studentId,
      teacherId,
      date: getISOForLocalDateTime(date, time),
      status,
      homework,
      notes: "",
      progressMeUrl,
    });
    const student = getUser(state, studentId);
    listParentsForStudent(state, studentId).forEach((parent) => {
      queueNotification(state, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новый урок в расписании",
          text: `${student?.name || "Ученик"}: ${formatDateTime(created.date)}${homework ? `\n\nР”РѕРјР°С€РєР°:\n${homework}` : ""}`,
          link: progressMeUrl || undefined,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(state);
    el.style.display = "none";

    renderKpis(loadState(), teacherId);
    renderLessons(loadState(), teacherId);
  });
}

function renderSubscriptionMeta(payment) {
  const total = Number(payment.lessonsTotal || 0);
  const left = Number(payment.lessonsLeft || 0);
  const paidAt = payment.paidAt ? formatDateTime(payment.paidAt) : t("не оплачено", "not paid");
  const remindAt = payment.remindAt ? formatDateTime(payment.remindAt) : t("не задано", "not set");
  const parts = [
    total ? `${t("занятий", "lessons")}: ${left}/${total}` : "",
    `${t("оплачено", "paid")}: ${paidAt}`,
    `${t("напомнить", "remind")}: ${remindAt}`,
  ].filter(Boolean);
  return parts.join(" В· ");
}

function renderPaymentSettings() {
  const host = byId("paymentCreator");
  const panel = byId("paymentsPanel");
  if (!host || !panel) return;
  let el = byId("paymentSettings");
  if (!el) {
    el = document.createElement("div");
    el.id = "paymentSettings";
    el.style.marginTop = "12px";
    panel.insertBefore(el, host);
  }
  const settings = getPaymentSettings();
  el.innerHTML = `
    <div class="payment-placeholder">
      <strong>${escapeHtml(t("Общая ссылка Т-Банка", "Default T-Bank link"))}</strong>
      <div class="muted" style="margin-top:4px;">${escapeHtml(t("Она подставляется во все оплаты без индивидуальной ссылки.", "It is used for every payment without an individual link."))}</div>
      <div class="muted" style="margin-top:8px;">${renderTbankDetails()}</div>
      <div class="form-row" style="grid-template-columns: 1fr; margin-top:10px;">
        <label>${escapeHtml(t("Ссылка на оплату", "Payment link"))}
          <input id="defaultTbankUrl" type="url" value="${escapeHtml(settings.tbankUrl)}" placeholder="https://...">
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="saveDefaultTbankUrl" type="button">${escapeHtml(t("Сохранить ссылку", "Save link"))}</button>
        ${settings.tbankUrl ? `<a class="btn-mini" href="${escapeHtml(settings.tbankUrl)}" target="_blank" rel="noopener">${escapeHtml(t("Проверить", "Test"))}</a>` : ""}
      </div>
    </div>
  `;
  byId("saveDefaultTbankUrl")?.addEventListener("click", () => {
    const tbankUrl = /** @type {HTMLInputElement|null} */ (byId("defaultTbankUrl"))?.value || "";
    savePaymentSettings({ tbankUrl });
    renderPaymentSettings();
    renderPayments(loadState());
  });
}

function renderPayments(state) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));

  const items = state.payments
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .map((p) => {
      const student = usersById.get(p.studentId);
      const paymentUrl = getPaymentUrl(p);
      const markedAt = p.payerMarkedAt ? formatDateTime(p.payerMarkedAt) : "";
      const receiptNumber = (p.receiptNumber || "").trim();
      const receiptUrl = (p.receiptUrl || "").trim();
      return `
        <div class="payment-row">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(p.date))}</div>
            <div><strong>${escapeHtml(student?.name || "—")}</strong> · <span class="muted">${escapeHtml(p.comment || "")}</span></div>
            <div class="muted" style="margin-top:4px;">${escapeHtml(renderSubscriptionMeta(p))}</div>
            <div class="payment-placeholder">
              <strong>${escapeHtml(t("Т-Банк", "T-Bank"))}</strong>
              <div class="muted" style="margin-top:4px;">${escapeHtml(paymentUrl ? t("Ссылка на оплату видна родителю.", "Payment link is visible to the parent.") : t("Добавьте ссылку Т-Банка, чтобы у родителя появилась кнопка оплаты.", "Add a T-Bank link so the parent sees the payment button."))}</div>
              ${markedAt ? `<div class="muted" style="margin-top:4px;">${escapeHtml(t(`Родитель отметил оплату: ${markedAt}`, `Parent marked payment: ${markedAt}`))}</div>` : ""}
              ${paymentUrl ? `<a class="btn-mini" href="${escapeHtml(paymentUrl)}" target="_blank" rel="noopener" style="margin-top:10px;">${escapeHtml(t("Открыть ссылку", "Open link"))}</a>` : ""}
            </div>
          </div>
          <div class="payment-receipt" style="margin-top:10px;">
            <div class="muted">${escapeHtml(receiptNumber || receiptUrl ? t("Чек добавлен и виден родителю.", "Receipt is added and visible to the parent.") : t("После подтверждения оплаты добавьте номер или ссылку чека.", "After confirming payment, add the receipt number or link."))}</div>
            <div class="form-row" style="grid-template-columns: 1fr 1fr; margin-top:10px;">
              <label>${escapeHtml(t("Номер чека", "Receipt number"))}
                <input data-receipt-number="${escapeHtml(p.id)}" value="${escapeHtml(receiptNumber)}" placeholder="${escapeHtml(t("из Мой налог", "from My Tax"))}">
              </label>
              <label>${escapeHtml(t("Ссылка на чек", "Receipt link"))}
                <input data-receipt-url="${escapeHtml(p.id)}" type="url" value="${escapeHtml(receiptUrl)}" placeholder="https://...">
              </label>
            </div>
            <button class="btn-mini" type="button" data-save-receipt="${escapeHtml(p.id)}">${escapeHtml(t("Сохранить чек", "Save receipt"))}</button>
          </div>
          <div class="payment-actions">
            <span class="mono"><strong>${escapeHtml(String(p.amount))} ₽</strong></span>
            ${pill(p.status)}
            <button class="btn-mini" type="button" data-pay-id="${escapeHtml(p.id)}">${escapeHtml(t("Статус", "Status"))}</button>
            <button class="btn-mini" type="button" data-pay-del="${escapeHtml(p.id)}">${escapeHtml(t("Удалить", "Delete"))}</button>
          </div>
        </div>`;
    })
    .join("");

  setHTML("paymentsList", items || `<div class="muted">${escapeHtml(t("Пока нет оплат", "No payments yet"))}</div>`);

  byId("paymentsList")?.querySelectorAll("[data-pay-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pay-id");
      if (!id) return;
      const p = state.payments.find((x) => x.id === id);
      if (!p) return;
      const next = p.status === "paid" ? "pending" : p.status === "pending" ? "overdue" : "paid";
      updatePayment(state, id, { status: next, paidAt: next === "paid" ? new Date().toISOString() : p.paidAt || "" });
      const student = getUser(state, p.studentId);
      listParentsForStudent(state, p.studentId).forEach((parent) => {
        queueNotification(state, {
          userId: parent.id,
          channel: "telegram",
          payload: {
            title: "Обновлён статус оплаты",
            text: `${student?.name || "Ученик"}: ${p.amount} ₽ · ${next}${p.comment ? ` В· ${p.comment}` : ""}`,
          },
          sendAt: new Date().toISOString(),
        });
      });
      saveState(state);
      renderPayments(loadState());
      renderNotifications(loadState());
    });
  });

  byId("paymentsList")?.querySelectorAll("[data-save-receipt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-save-receipt");
      if (!id) return;
      const receiptNumber = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-number="${CSS.escape(id)}"]`))?.value || "";
      const receiptUrl = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-url="${CSS.escape(id)}"]`))?.value || "";
      updatePayment(state, id, {
        receiptNumber: receiptNumber.trim(),
        receiptUrl: receiptUrl.trim(),
      });
      renderPayments(loadState());
    });
  });

  byId("paymentsList")?.querySelectorAll("[data-pay-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pay-del");
      if (!id) return;
      const fresh = loadState();
      deletePayment(fresh, id);
      saveState(fresh);
      renderPayments(loadState());
      renderKpis(loadState(), getSession()?.userId || "");
    });
  });
}

function renderPaymentCreator(state) {
  const el = byId("paymentCreator");
  if (!el) return;
  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  const today = new Date().toISOString().slice(0, 10);

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новая оплата", "New payment"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="newPayStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Сумма (₽)", "Amount (₽)"))}
          <input id="newPayAmount" type="number" value="3000" min="0">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Дата", "Date"))}
          <input id="newPayDate" type="date" value="${escapeHtml(today)}">
        </label>
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="newPayStatus">
            <option value="pending" selected>pending</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
          </select>
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Комментарий", "Comment"))}
          <input id="newPayComment" placeholder="${escapeHtml(t("Например: индивидуально / пакет", "e.g. individual / bundle"))}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Ссылка на оплату Т-Банк", "T-Bank payment link"))}
          <input id="newPayUrl" type="url" placeholder="https://...">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Занятий в абонементе", "Lessons in package"))}
          <input id="newPayLessonsTotal" type="number" min="0" value="4">
        </label>
        <label>${escapeHtml(t("Осталось занятий", "Lessons left"))}
          <input id="newPayLessonsLeft" type="number" min="0" value="4">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Оплачено", "Paid on"))}
          <input id="newPayPaidAt" type="date" value="${escapeHtml(today)}">
        </label>
        <label>${escapeHtml(t("Напомнить", "Remind on"))}
          <input id="newPayRemindAt" type="date">
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="createPayBtn" type="button">${escapeHtml(t("Добавить", "Add"))}</button>
        <button class="btn-mini" id="cancelPayBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelPayBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("createPayBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("newPayStudent"))?.value;
    const amount = Number((/** @type {HTMLInputElement|null} */ (byId("newPayAmount"))?.value || "0").trim());
    const dateStr = /** @type {HTMLInputElement|null} */ (byId("newPayDate"))?.value;
    const status = /** @type {HTMLSelectElement|null} */ (byId("newPayStatus"))?.value || "pending";
    const comment = /** @type {HTMLInputElement|null} */ (byId("newPayComment"))?.value || "";
    const paymentUrl = /** @type {HTMLInputElement|null} */ (byId("newPayUrl"))?.value?.trim() || "";
    const lessonsTotal = Number(/** @type {HTMLInputElement|null} */ (byId("newPayLessonsTotal"))?.value || 0);
    const lessonsLeft = Number(/** @type {HTMLInputElement|null} */ (byId("newPayLessonsLeft"))?.value || 0);
    const paidAt = /** @type {HTMLInputElement|null} */ (byId("newPayPaidAt"))?.value || "";
    const remindAt = /** @type {HTMLInputElement|null} */ (byId("newPayRemindAt"))?.value || "";

    if (!studentId) return;
    const payment = addPayment(state, {
      studentId,
      amount: Number.isFinite(amount) ? amount : 0,
      status,
      date: isoAtNoon(dateStr),
      comment,
      lessonsTotal: Number.isFinite(lessonsTotal) ? lessonsTotal : 0,
      lessonsLeft: Number.isFinite(lessonsLeft) ? lessonsLeft : 0,
      paidAt: status === "paid" && paidAt ? isoAtNoon(paidAt) : "",
      remindAt: remindAt ? isoAtNoon(remindAt) : "",
      paymentProvider: "tbank",
      paymentUrl,
      payerMarkedAt: "",
    });
    const student = getUser(state, studentId);
    listParentsForStudent(state, studentId).forEach((parent) => {
      queueNotification(state, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новая запись об оплате",
          text: `${student?.name || "Ученик"}: ${payment.amount} ₽ · ${payment.status}${comment ? ` В· ${comment}` : ""}${paymentUrl ? " · ссылка Т-Банк добавлена" : ""}`,
          link: paymentUrl,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(state);
    el.style.display = "none";
    renderPayments(loadState());
  });
}

function renderTasks(state, teacherId) {
  const tasks = listTeacherTasks(state, teacherId);
  const html = tasks
    .map((x) => {
      const done = x.status === "done";
      const due = x.due ? `<span class="panel-kicker">${escapeHtml(x.due)}</span>` : `<span class="muted">вЂ”</span>`;
      return `
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
          <div style="${done ? "opacity:.7; text-decoration: line-through;" : ""}">
            <div><strong>${escapeHtml(x.title)}</strong></div>
            <div style="margin-top: 4px; display:flex; gap: 10px; align-items:center; flex-wrap:wrap;">
              ${due}
              ${x.notes ? `<span class="muted">${escapeHtml(x.notes)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex; gap: 8px;">
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-toggle="${escapeHtml(x.id)}">${escapeHtml(
        done ? "↺" : "✓"
      )}</button>
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-edit="${escapeHtml(x.id)}">${escapeHtml(
        t("Ред.", "Edit")
      )}</button>
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-del="${escapeHtml(x.id)}">×</button>
          </div>
        </div>
      `;
    })
    .join("");

  setHTML("tasksList", html || `<div class="muted">${escapeHtml(t("Пока нет задач", "No tasks yet"))}</div>`);

  byId("tasksList")?.querySelectorAll("[data-task-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-toggle") || "";
      const fresh = loadState();
      const cur = fresh.teacherTasks.find((t) => t.id === id);
      if (!cur) return;
      updateTeacherTask(fresh, id, { status: cur.status === "done" ? "open" : "done" });
      saveState(fresh);
      renderTasks(loadState(), teacherId);
      renderKpis(loadState(), teacherId);
    });
  });

  byId("tasksList")?.querySelectorAll("[data-task-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-del") || "";
      const fresh = loadState();
      deleteTeacherTask(fresh, id);
      saveState(fresh);
      const creator = byId("taskCreator");
      if (creator) creator.style.display = "none";
      renderTasks(loadState(), teacherId);
      renderKpis(loadState(), teacherId);
    });
  });

  byId("tasksList")?.querySelectorAll("[data-task-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-edit") || "";
      const fresh = loadState();
      const task = fresh.teacherTasks.find((t) => t.id === id);
      if (!task) return;
      renderTaskCreator(fresh, teacherId, task);
    });
  });
}

function renderTaskCreator(state, teacherId, task = null) {
  const el = byId("taskCreator");
  if (!el) return;

  const isEdit = Boolean(task);
  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-kicker">${escapeHtml(isEdit ? t("Редактировать задачу", "Edit task") : t("Новая задача", "New task"))}</div>
      <div class="form-row" style="grid-template-columns: 1fr 180px;">
        <label>${escapeHtml(t("Заголовок", "Title"))}
          <input id="taskTitle" value="${escapeHtml(task?.title || "")}" placeholder="${escapeHtml(t("Например: подготовить материалы…", "e.g. prepare materials…"))}">
        </label>
        <label>${escapeHtml(t("Срок (опционально)", "Due (optional)"))}
          <input id="taskDue" type="date" value="${escapeHtml(task?.due || "")}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Заметка", "Note"))}
          <textarea id="taskNotes" placeholder="${escapeHtml(t("Детали…", "Details…"))}">${escapeHtml(task?.notes || "")}</textarea>
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="taskSaveBtn" type="button">${escapeHtml(isEdit ? t("Сохранить", "Save") : t("Добавить", "Add"))}</button>
        <button class="btn-mini" id="taskCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("taskCancelBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("taskSaveBtn")?.addEventListener("click", () => {
    const title = /** @type {HTMLInputElement|null} */ (byId("taskTitle"))?.value?.trim() || "";
    const due = /** @type {HTMLInputElement|null} */ (byId("taskDue"))?.value || "";
    const notes = /** @type {HTMLTextAreaElement|null} */ (byId("taskNotes"))?.value?.trim() || "";
    if (!title) return;

    if (task) {
      updateTeacherTask(state, task.id, { title, due: due || "", notes });
    } else {
      addTeacherTask(state, { teacherId, title, due: due || "", notes, status: "open" });
    }
    saveState(state);
    el.style.display = "none";
    renderTasks(loadState(), teacherId);
    renderKpis(loadState(), teacherId);
  });
}

function renderNotifications(state) {
  const pending = listPendingNotifications(state);
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const html = pending
    .slice(0, 8)
    .map((n) => {
      const payload = `${n.payload.title}\n${n.payload.text}${n.payload.link ? `\n${n.payload.link}` : ""}`;
      const recipient = usersById.get(n.userId);
      return `
        <div style="border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(n.sendAt))} · ${escapeHtml(n.channel)} · ${escapeHtml(recipient?.name || n.userId)}</div>
              <div><strong>${escapeHtml(n.payload.title)}</strong></div>
            </div>
            <button class="btn-mini" type="button" data-copy="${escapeHtml(payload)}">${escapeHtml(t("Копировать", "Copy"))}</button>
          </div>
          <div class="muted" style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(n.payload.text)}</div>
        </div>`;
    })
    .join("");

  setHTML("notifList", html || `<div class="muted">${escapeHtml(t("Очередь пуста", "Queue is empty"))}</div>`);

  byId("notifList")?.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = t("Скопировано", "Copied");
        setTimeout(() => (btn.textContent = t("Копировать", "Copy")), 1200);
      } catch {
        // noop
      }
    });
  });
}

function buildTeacherReportText(state, report) {
  const student = getUser(state, report.studentId);
  const progress = getProgress(state, report.studentId) || {};
  const meta = getStudentMeta(state, report.studentId) || {};
  const lessons = (state.lessons || []).filter((l) => l.studentId === report.studentId).slice(-10).reverse();
  const materials = listStudentItems(state, report.studentId, "material");
  const practice = listStudentItems(state, report.studentId, "practice");
  const payments = listPaymentsForStudent(state, report.studentId);
  const builder = window.NGEReportDocs?.buildReportDocument;
  if (!builder) return report.body || "";
  return builder({
    title: report.title || "Отчёт преподавателя",
    studentName: student?.name || "—",
    generatedLabel: formatDateTime(report.createdAt),
    level: progress.level || "—",
    subscription: meta.tariff || "—",
    totalLessons: meta.lessonsTotal || lessons.length,
    lessonsLeft: meta.lessonsLeft ?? "—",
    focus: progress.goals || progress.comments || "Учебный фокус преподавателя.",
    body: report.body || progress.comments || "",
    homework: lessons.find((l) => l.homework)?.homework || "",
    nextStep: meta.plan || progress.goals || "Продолжаем по плану занятий.",
    lessons: lessons.map((l) => ({
      date: formatDateTime(l.date),
      status: l.status,
      topic: "Урок английского",
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
        comment: `${total ? `Осталось занятий: ${left}/${total}. ` : ""}${p.remindAt ? `Напомнить: ${formatDateTime(p.remindAt)}. ` : ""}${p.comment || ""}`.trim(),
      };
    }),
  });
}

function renderReports(state) {
  ensureTeacherCollections(state);
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const html = state.reports
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((report) => {
      const student = usersById.get(report.studentId);
      return `
        <div class="student-item-row">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(report.createdAt))} · ${escapeHtml(student?.name || "—")}</div>
            <div><strong>${escapeHtml(report.title || "Отчёт")}</strong></div>
            <div class="muted">${escapeHtml((report.body || "").slice(0, 120))}</div>
          </div>
          <div class="student-item-actions">
            <button class="btn-mini" type="button" data-download-report="${escapeHtml(report.id)}">${escapeHtml(t("PDF", "PDF"))}</button>
          </div>
        </div>
      `;
    })
    .join("");

  setHTML("reportsList", html || `<div class="muted">${escapeHtml(t("Отчётов пока нет", "No reports yet"))}</div>`);

  byId("reportsList")?.querySelectorAll("[data-download-report]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-download-report");
      const fresh = ensureTeacherCollections(loadState());
      const report = fresh.reports.find((x) => x.id === id);
      if (!report) return;
      const student = getUser(fresh, report.studentId);
      const safeName = (student?.name || "student").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
      downloadHtmlReport(
        `nge-teacher-report-${safeName}.pdf`, buildTeacherReportText(fresh, report));
    });
  });
}

function renderReportCreator(state) {
  const el = byId("reportCreator");
  if (!el) return;
  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding:14px; border-radius:16px; border-color:var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новый отчёт", "New report"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="reportStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Название отчёта", "Report title"))}
          <input id="reportTitle" value="${escapeHtml(t("Отчёт о прогрессе", "Progress report"))}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Текст отчёта", "Report text"))}
          <textarea id="reportBody" placeholder="${escapeHtml(t("Краткий вывод: что уже получается, где нужна поддержка, следующий шаг. Например: ученик привыкает слышать английский в понятных ситуациях, реагирует на команды и повторяет короткие фразы.", "Summary: what works, where support is needed, and the next step."))}"></textarea>
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="saveReportBtn" type="button">${escapeHtml(t("Сохранить и уведомить", "Save and notify"))}</button>
        <button class="btn-mini" id="downloadDraftReportBtn" type="button">${escapeHtml(t("PDF-черновик", "PDF draft"))}</button>
        <button class="btn-mini" id="cancelReportBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelReportBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("downloadDraftReportBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("reportStudent"))?.value || "";
    const report = {
      id: "draft",
      studentId,
      title: /** @type {HTMLInputElement|null} */ (byId("reportTitle"))?.value.trim() || "Отчёт",
      body: /** @type {HTMLTextAreaElement|null} */ (byId("reportBody"))?.value.trim() || "",
      createdAt: new Date().toISOString(),
    };
    downloadHtmlReport("nge-teacher-report-draft.pdf", buildTeacherReportText(loadState(), report));
  });

  byId("saveReportBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("reportStudent"))?.value || "";
    const title = /** @type {HTMLInputElement|null} */ (byId("reportTitle"))?.value.trim() || "Отчёт";
    const body = /** @type {HTMLTextAreaElement|null} */ (byId("reportBody"))?.value.trim() || "";
    if (!studentId || !body) return;
    const fresh = ensureTeacherCollections(loadState());
    const report = { id: teacherUid("report"), studentId, title, body, createdAt: new Date().toISOString() };
    fresh.reports.push(report);
    addStudentItem(fresh, {
      studentId,
      kind: "material",
      title,
      details: body,
      url: "",
      done: false,
      at: report.createdAt,
    });
    const student = getUser(fresh, studentId);
    listParentsForStudent(fresh, studentId).forEach((parent) => {
      queueNotification(fresh, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новый отчёт преподавателя",
          text: `${student?.name || "Ученик"}: ${title}\n\n${body}`,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(fresh);
    el.style.display = "none";
    renderReports(loadState());
    renderNotifications(loadState());
  });
}

function initTeacherCabinet(ctx) {
  const { me } = ctx;

  const state = loadState();
  ensureTeacherControlNotice();
  renderKpis(state, me.id);
  renderStudents(state);
  renderLessons(state, me.id);
  renderPaymentSettings();
  renderPayments(state);
  renderTasks(state, me.id);
  renderReports(state);
  renderNotifications(state);

  byId("exportCalendarBtn")?.addEventListener("click", () => {
    downloadGoogleCalendarICS(loadState(), me.id);
  });

  byId("addLessonBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    renderLessonCreator(fresh, me.id);
  });

  byId("addStudentBtn")?.addEventListener("click", () => {
    renderStudentCreator(loadState(), me.id);
  });

  byId("addPaymentBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    const el = byId("paymentCreator");
    if (el) {
      if (el.style.display === "none" || !el.style.display) renderPaymentCreator(fresh);
      else el.style.display = "none";
    }
  });

  byId("addTaskBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    const el = byId("taskCreator");
    if (el) {
      if (el.style.display === "none" || !el.style.display) renderTaskCreator(fresh, me.id, null);
      else el.style.display = "none";
    }
  });

  byId("addReportBtn")?.addEventListener("click", () => {
    renderReportCreator(loadState());
  });

  // Re-render when language toggles (simple approach)
  const langBtn = byId("langBtn");
  langBtn?.addEventListener("click", () => {
    const fresh = loadState();
    renderKpis(fresh, me.id);
    renderStudents(fresh);
    renderLessons(fresh, me.id);
    renderPaymentSettings();
    renderPayments(fresh);
    renderTasks(fresh, me.id);
    renderReports(fresh);
    renderNotifications(fresh);
  });
}



  bootThemeAndLang();
  var ctx = ensureRole("teacher");
  wireTopbarActions();
  if (ctx) initTeacherCabinet(ctx);

})();
