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
      { id: "p_1", studentId: studentA, amount: 3500, status: "paid", date: plusDays(-7), comment: "Индивидуально" },
      { id: "p_2", studentId: studentB, amount: 3000, status: "pending", date: plusDays(-3), comment: "Индивидуально" },
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
      { studentId: studentA, tariff: "Индивидуально · 3500 ₽", plan: "1×/нед" },
      { studentId: studentB, tariff: "Индивидуально · 3000 ₽", plan: "2×/нед" },
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
      level: patch.level || "—",
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
    .sort((a, b) => new Date(a.sendAt) - new Date(b.sendAt));
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
      tariff: (patch.tariff || "").trim() || "—",
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
const SUN_ICON = "\u2600"; // ☀
const MOON_ICON = "\u263E"; // ☾
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
  syncLabLinks();
}

function getLabThemeParam() {
  return document.body.classList.contains("light") ? "lite" : "dark";
}

function withLabTheme(href) {
  if (!href || !href.includes("lingua-boost-lab")) return href;
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const body = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const clean = body.replace(/([?&])theme=[^&#]*&?/i, "$1").replace(/[?&]$/, "");
  const sep = clean.includes("?") ? "&" : "?";
  return `${clean}${sep}theme=${getLabThemeParam()}${hash}`;
}

function syncLabLinks() {
  document.querySelectorAll('a[href*="lingua-boost-lab"]').forEach((a) => {
    const raw = a.getAttribute("href") || "";
    a.setAttribute("href", withLabTheme(raw));
  });
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
    id: "a1-01-routines",
    level: "A1",
    title: "Present Simple Routines",
    topic: "Present Simple",
    audience: "Kids / adults",
    href: "../lingua-boost-lab/a1/a1-01-present-simple-routines.html",
    minutes: 45,
    description: "Guided A1 lesson for daily routines, adverbs of frequency, reading, listening, and final speaking.",
  },
  {
    id: "a1-02-questions-negatives",
    level: "A1",
    title: "Present Simple Questions and Negatives",
    topic: "Questions and negatives",
    audience: "Kids / adults",
    href: "../lingua-boost-lab/a1/a1-02-present-simple-questions-negatives.html",
    minutes: 45,
    description: "Guided A1 lesson for do / does questions, negatives, short answers, and final practice.",
  },
  {
    id: "a1-03-there-is-are",
    level: "A1",
    title: "There is / There are",
    topic: "Places and things",
    audience: "Kids / adults",
    href: "../lingua-boost-lab/a1/a1-03-present-simple-adverbs-frequency.html",
    minutes: 45,
    description: "Guided A1 lesson for describing rooms, workspaces, objects, and places.",
  },
  {
    id: "a1-04-have-has",
    level: "A1",
    title: "Have / Has: My Things",
    topic: "Have / has",
    audience: "Kids / adults",
    href: "../lingua-boost-lab/a1/a1-04-have-has-my-things.html",
    minutes: 45,
    description: "Guided A1 lesson for things people have, do not have, and ask about.",
  },{
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
    description: "Игровая тренировка Past Simple с короткими заданиями.",
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

function pill(status) {
  const map = {
    planned: { tone: "warn", ru: "planned", en: "planned" },
    done: { tone: "ok", ru: "done", en: "done" },
    missed: { tone: "bad", ru: "missed", en: "missed" },
  };
  const v = map[status] || { tone: "", ru: status, en: status };
  return `<span class="pill" data-tone="${escapeHtml(v.tone)}">${escapeHtml(getLang() === "ru" ? v.ru : v.en)}</span>`;
}

function dateDistanceLabel(iso) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target - start) / 86400000);
  if (days === 0) return t("сегодня", "today");
  if (days === 1) return t("завтра", "tomorrow");
  if (days > 1) return t(`через ${days} дн.`, `in ${days} days`);
  if (days === -1) return t("вчера", "yesterday");
  return t(`${Math.abs(days)} дн. назад`, `${Math.abs(days)} days ago`);
}

function renderScheduleTimeline(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId)
    .filter((l) => new Date(l.date).getTime() >= Date.now() - 86400000)
    .slice(0, 5);
  const events = listStudentItems(state, studentId, "schedule").slice(0, 5);
  const items = [
    ...lessons.map((l) => ({
      type: "lesson",
      title: t("Урок с преподавателем", "Lesson with teacher"),
      at: l.date,
      details: l.homework || t("Домашка появится после урока.", "Homework will appear after the lesson."),
      status: l.status,
      url: l.progressMeUrl || "",
    })),
    ...events.map((x) => ({
      type: "event",
      title: x.title,
      at: x.at || x.createdAt,
      details: x.details || "",
      status: "planned",
      url: x.url || "",
    })),
  ]
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .slice(0, 6);

  const el = byId("scheduleTimeline");
  if (!el) return;
  el.innerHTML = items.length
    ? items
        .map((x, index) => {
          const link = x.url
            ? `<a class="btn-mini timeline-open" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть", "Open"))}</a>`
            : "";
          return `
            <article class="timeline-item" style="--i:${index}">
              <div class="timeline-dot"></div>
              <div class="timeline-body">
                <div class="timeline-meta">${escapeHtml(formatDateTime(x.at))} · ${escapeHtml(dateDistanceLabel(x.at))}</div>
                <div class="timeline-title">${escapeHtml(x.title)}</div>
                ${x.details ? `<div class="timeline-text">${escapeHtml(x.details)}</div>` : ""}
                <div class="timeline-actions">${pill(x.status)}${link}</div>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Ближайших событий пока нет.", "No upcoming events yet."))}</div>`;
}

function renderLessonsTable(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId).slice(-12).reverse();
  const rows = lessons
    .map((l) => {
      const link = l.progressMeUrl
        ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
            l.progressMeUrl
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Урок", "Lesson"))} ↗</a>`
        : `<span class="muted">—</span>`;
      return `
        <tr>
          <td><div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div><strong>${escapeHtml(l.status)}</strong></td>
          <td class="muted">${escapeHtml((l.homework || "").slice(0, 90) || "—")}</td>
          <td>${link}</td>
        </tr>`;
    })
    .join("");

  const table = byId("studentLessonsTable");
  if (!table) return;
  table.innerHTML = `
    <thead>
      <tr>
        <th>${escapeHtml(t("Дата", "Date"))}</th>
        <th>${escapeHtml(t("Домашка", "Homework"))}</th>
        <th>${escapeHtml(t("ProgressMe", "ProgressMe"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="3" class="muted">${escapeHtml(t("Нет уроков", "No lessons"))}</td></tr>`}</tbody>
  `;
}

function renderHomeworkFromLessons(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId)
    .slice()
    .reverse()
    .filter((l) => (l.homework || "").trim())
    .slice(0, 6);
  const html = lessons.length
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
    : `<div class="muted">${escapeHtml(t("Пока нет домашки от преподавателя", "No teacher homework yet"))}</div>`;
  const el = byId("homeworkList");
  if (el) el.innerHTML = html;
}

function renderStudentItems(state, studentId) {
  const events = listStudentItems(state, studentId, "schedule");
  const materials = listStudentItems(state, studentId, "material");
  const practice = listStudentItems(state, studentId, "practice");

  const eventsHtml = events.length
    ? events
        .map((x) => {
          const when = x.at ? formatDateTime(x.at) : "—";
          const link = x.url
            ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">↗</a>`
            : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div>
                <div class="panel-kicker">${escapeHtml(when)}</div>
                <div><strong>${escapeHtml(x.title)}</strong></div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-event="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Событий пока нет", "No events yet"))}</div>`;
  const eventsEl = byId("eventsList");
  if (eventsEl) eventsEl.innerHTML = eventsHtml;

  const materialsHtml = materials.length
    ? materials
        .map((x) => {
          const link = x.url
            ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">↗</a>`
            : "";
          const done = x.done ? ` style="opacity:.7; text-decoration: line-through;"` : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div${done}>
                <div><strong>${escapeHtml(x.title)}</strong></div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-toggle-material="${escapeHtml(
                  x.id
                )}">${escapeHtml(x.done ? "↺" : "✓")}</button>
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-material="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Материалов пока нет", "No materials yet"))}</div>`;
  const matEl = byId("materialsList");
  if (matEl) matEl.innerHTML = materialsHtml;

  const practiceHtml = practice.length
    ? practice
        .map((x) => {
          const when = x.at ? formatDateTime(x.at) : "—";
          const mins = x.minutes ? `${x.minutes}m` : "";
          const done = x.done ? ` style="opacity:.7; text-decoration: line-through;"` : "";
          const source = x.source === "linguaboost" ? `<span class="pill" data-tone="warn">${escapeHtml(x.level || "LAB")}</span>` : "";
          const link = x.url
            ? `<a class="btn-mini" style="min-height:32px; padding: 0 10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть", "Open"))}</a>`
            : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div${done}>
                <div class="panel-kicker">${escapeHtml([when, mins].filter(Boolean).join(" · "))}</div>
                <div><strong>${escapeHtml(x.title)}</strong> ${source}</div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-toggle-practice="${escapeHtml(
                  x.id
                )}">${escapeHtml(x.done ? "↺" : "✓")}</button>
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-practice="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Практики пока нет", "No practice yet"))}</div>`;
  const prEl = byId("practiceList");
  if (prEl) prEl.innerHTML = practiceHtml;

  eventsEl?.querySelectorAll("[data-del-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-event") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  matEl?.querySelectorAll("[data-del-material]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-material") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  matEl?.querySelectorAll("[data-toggle-material]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-material") || "";
      const s = loadState();
      const cur = s.studentItems.find((x) => x.id === id);
      if (!cur) return;
      updateStudentItem(s, id, { done: !cur.done });
      renderStudentItems(loadState(), studentId);
    });
  });
  prEl?.querySelectorAll("[data-del-practice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-practice") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  prEl?.querySelectorAll("[data-toggle-practice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-practice") || "";
      const s = loadState();
      const cur = s.studentItems.find((x) => x.id === id);
      if (!cur) return;
      updateStudentItem(s, id, { done: !cur.done });
      renderStudentItems(loadState(), studentId);
    });
  });
}

function renderProgressBox(state, studentId) {
  const p = getProgress(state, studentId);
  const el = byId("progressBox");
  if (!el) return;
  if (!p) {
    el.innerHTML = `<div class="muted">${escapeHtml(t("Пока нет данных", "No data yet"))}</div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid; gap: 10px;">
      <div><span class="panel-kicker">${escapeHtml(t("Уровень", "Level"))}</span><div><strong>${escapeHtml(p.level)}</strong></div></div>
      <div><span class="panel-kicker">${escapeHtml(t("Цели (от преподавателя)", "Goals (teacher)"))}</span><div class="muted">${escapeHtml(
        p.goals
      )}</div></div>
      <div><span class="panel-kicker">${escapeHtml(t("Комментарий (от преподавателя)", "Comment (teacher)"))}</span><div class="muted">${escapeHtml(
        p.comments
      )}</div></div>

      <div style="padding-top: 8px; border-top: 1px solid var(--line);">
        <span class="panel-kicker">${escapeHtml(t("Мои цели", "My goals"))}</span>
        <textarea id="studentGoals" placeholder="${escapeHtml(t("Например: 2×/нед speaking…", "e.g. 2×/week speaking…"))}">${escapeHtml(
          p.studentGoals || ""
        )}</textarea>
      </div>
      <div>
        <span class="panel-kicker">${escapeHtml(t("Мои заметки", "My notes"))}</span>
        <textarea id="studentNotes" placeholder="${escapeHtml(t("Что получается / что сложно…", "What works / what’s hard…"))}">${escapeHtml(
          p.studentNotes || ""
        )}</textarea>
      </div>
    </div>
  `;
}

function renderEventCreator(open) {
  const el = byId("eventCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 140px 120px;">
      <label>${escapeHtml(t("Событие", "Event"))}
        <input id="evTitle" placeholder="${escapeHtml(t("Название…", "Title…"))}">
      </label>
      <label>${escapeHtml(t("Дата", "Date"))}
        <input id="evDate" type="date" value="${escapeHtml(today)}">
      </label>
      <label>${escapeHtml(t("Время", "Time"))}
        <input id="evTime" type="time" value="12:00">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Ссылка (опционально)", "Link (optional)"))}
        <input id="evLink" placeholder="https://...">
      </label>
      <label>${escapeHtml(t("Комментарий (опционально)", "Note (optional)"))}
        <textarea id="evDetails" placeholder="${escapeHtml(t("Коротко…", "Short…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="evSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="evCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderMaterialCreator(open) {
  const el = byId("materialCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 1fr;">
      <label>${escapeHtml(t("Материал", "Material"))}
        <input id="matTitle" placeholder="${escapeHtml(t("Название…", "Title…"))}">
      </label>
      <label>${escapeHtml(t("Ссылка", "Link"))}
        <input id="matUrl" placeholder="https://...">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Комментарий", "Note"))}
        <textarea id="matDetails" placeholder="${escapeHtml(t("Что это и зачем…", "What is it and why…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="matSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="matCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderPracticeCreator(open) {
  const el = byId("practiceCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 120px 140px;">
      <label>${escapeHtml(t("Практика", "Practice"))}
        <input id="prTitle" placeholder="${escapeHtml(t("Например: Listening…", "e.g. Listening…"))}">
      </label>
      <label>${escapeHtml(t("Минут", "Minutes"))}
        <input id="prMinutes" type="number" min="1" value="10">
      </label>
      <label>${escapeHtml(t("Дата", "Date"))}
        <input id="prDate" type="date" value="${escapeHtml(today)}">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Комментарий", "Note"))}
        <textarea id="prDetails" placeholder="${escapeHtml(t("Что делали…", "What did you do…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="prSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="prCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderLabPicker() {
  const el = byId("labPicker");
  if (!el) return;
  const levels = Array.from(new Set(LAB_MODULES.map((m) => m.level)));
  el.innerHTML = `
    <div class="lab-picker">
      <div class="form-row lab-picker-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <select id="labLevelSelect">
            <option value="">${escapeHtml(t("Все уровни", "All levels"))}</option>
            ${levels.map((level) => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`).join("")}
          </select>
        </label>
        <label>${escapeHtml(t("Тренажёр", "Trainer"))}
          <select id="labModuleSelect"></select>
        </label>
        <label>${escapeHtml(t("Когда сделать", "Due date"))}
          <input id="labDueDate" type="date" value="${escapeHtml(new Date().toISOString().slice(0, 10))}">
        </label>
      </div>
      <div id="labModulePreview" class="lab-module-preview"></div>
      <div class="actions">
        <button class="btn-mini" id="addLabModuleBtn" type="button" data-primary>${escapeHtml(t("Добавить в домашку", "Add to homework"))}</button>
        <a class="btn-mini" href="../lingua-boost-lab/index.html" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть лабораторию", "Open lab"))}</a>
      </div>
    </div>
  `;

  const levelSelect = /** @type {HTMLSelectElement|null} */ (byId("labLevelSelect"));
  const moduleSelect = /** @type {HTMLSelectElement|null} */ (byId("labModuleSelect"));
  const preview = byId("labModulePreview");

  function filteredModules() {
    const level = levelSelect?.value || "";
    return LAB_MODULES.filter((m) => !level || m.level === level);
  }

  function syncModuleOptions() {
    if (!moduleSelect) return;
    moduleSelect.innerHTML = filteredModules()
      .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.title)}</option>`)
      .join("");
    syncPreview();
  }

  function syncPreview() {
    if (!preview || !moduleSelect) return;
    const module = LAB_MODULES.find((m) => m.id === moduleSelect.value) || filteredModules()[0];
    if (!module) {
      preview.innerHTML = `<div class="muted">${escapeHtml(t("В лаборатории пока нет модулей.", "No modules yet."))}</div>`;
      return;
    }
    preview.innerHTML = `
      <div class="lab-card">
        <div class="panel-kicker">${escapeHtml(module.level)} · ${escapeHtml(module.topic)}</div>
        <strong>${escapeHtml(module.title)}</strong>
        <p class="muted">${escapeHtml(module.description)}</p>
        <div class="lab-card-meta">
          <span class="pill">${escapeHtml(module.audience)}</span>
          <span class="pill">${escapeHtml(module.minutes)} ${escapeHtml(t("мин", "min"))}</span>
        </div>
      </div>
    `;
  }

  levelSelect?.addEventListener("change", syncModuleOptions);
  moduleSelect?.addEventListener("change", syncPreview);
  syncModuleOptions(); syncLabLinks();
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildStudentReport(state, studentId, studentName) {
  const lessons = listLessonsForStudent(state, studentId).slice(-8).reverse();
  const practice = listStudentItems(state, studentId, "practice");
  const materials = listStudentItems(state, studentId, "material");
  const events = listStudentItems(state, studentId, "schedule");
  const progress = getProgress(state, studentId);
  const donePractice = practice.filter((x) => x.done).length;
  const totalMinutes = practice.reduce((sum, x) => sum + (Number(x.minutes) || 0), 0);

  const line = (label, value = "") => `${label}: ${value}`.trim();
  return [
    "New Generation English",
    `Отчёт ученика: ${studentName}`,
    `Дата выгрузки: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
    "",
    "Прогресс",
    line("Уровень", progress?.level || "—"),
    line("Цели преподавателя", progress?.goals || "—"),
    line("Комментарий преподавателя", progress?.comments || "—"),
    line("Мои цели", progress?.studentGoals || "—"),
    line("Мои заметки", progress?.studentNotes || "—"),
    "",
    "Сводка",
    line("Ближайших/последних уроков", String(lessons.length)),
    line("Материалов", String(materials.length)),
    line("Практик и тренажёров", String(practice.length)),
    line("Готово практик", String(donePractice)),
    line("Минут практики", String(totalMinutes)),
    line("Личных событий", String(events.length)),
    "",
    "Уроки",
    ...(lessons.length
      ? lessons.map((l) => `- ${formatDateTime(l.date)} · ${l.status} · ${l.homework || "без домашки"}`)
      : ["- пока нет уроков"]),
    "",
    "Домашние материалы",
    ...(materials.length
      ? materials.map((x) => `- ${x.done ? "[готово]" : "[в работе]"} ${x.title}${x.url ? ` · ${x.url}` : ""}`)
      : ["- пока нет материалов"]),
    "",
    "Тренажёры и практика",
    ...(practice.length
      ? practice.map((x) => `- ${x.done ? "[готово]" : "[в работе]"} ${x.title}${x.level ? ` · ${x.level}` : ""}${x.url ? ` · ${x.url}` : ""}`)
      : ["- пока нет практики"]),
    "",
  ].join("\n");
}

function initStudentCabinet(ctx) {
  const { me } = ctx;

  function renderAll() {
    const state = loadState();
    renderScheduleTimeline(state, me.id);
    renderLessonsTable(state, me.id);
    renderHomeworkFromLessons(state, me.id);
    renderStudentItems(state, me.id);
    renderProgressBox(state, me.id);
  }

  renderAll();
  renderLabPicker();

  let eventOpen = false;
  let materialOpen = false;
  let practiceOpen = false;

  renderEventCreator(false);
  renderMaterialCreator(false);
  renderPracticeCreator(false);

  byId("addEventBtn")?.addEventListener("click", () => {
    eventOpen = !eventOpen;
    renderEventCreator(eventOpen);
    if (eventOpen) {
      byId("evCancelBtn")?.addEventListener("click", () => {
        eventOpen = false;
        renderEventCreator(false);
      });
      byId("evSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("evTitle"))?.value?.trim() || "";
        const date = /** @type {HTMLInputElement|null} */ (byId("evDate"))?.value || "";
        const time = /** @type {HTMLInputElement|null} */ (byId("evTime"))?.value || "12:00";
        const url = /** @type {HTMLInputElement|null} */ (byId("evLink"))?.value?.trim() || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("evDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, { studentId: me.id, kind: "schedule", title, details, url, at: getISOForLocalDateTime(date, time) });
        eventOpen = false;
        renderEventCreator(false);
        renderAll();
      });
    }
  });

  byId("addMaterialBtn")?.addEventListener("click", () => {
    materialOpen = !materialOpen;
    renderMaterialCreator(materialOpen);
    if (materialOpen) {
      byId("matCancelBtn")?.addEventListener("click", () => {
        materialOpen = false;
        renderMaterialCreator(false);
      });
      byId("matSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("matTitle"))?.value?.trim() || "";
        const url = /** @type {HTMLInputElement|null} */ (byId("matUrl"))?.value?.trim() || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("matDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, { studentId: me.id, kind: "material", title, details, url, done: false });
        materialOpen = false;
        renderMaterialCreator(false);
        renderAll();
      });
    }
  });

  byId("addPracticeBtn")?.addEventListener("click", () => {
    practiceOpen = !practiceOpen;
    renderPracticeCreator(practiceOpen);
    if (practiceOpen) {
      byId("prCancelBtn")?.addEventListener("click", () => {
        practiceOpen = false;
        renderPracticeCreator(false);
      });
      byId("prSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("prTitle"))?.value?.trim() || "";
        const minutes = Number((/** @type {HTMLInputElement|null} */ (byId("prMinutes"))?.value || "0").trim());
        const date = /** @type {HTMLInputElement|null} */ (byId("prDate"))?.value || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("prDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, {
          studentId: me.id,
          kind: "practice",
          title,
          details,
          minutes: Number.isFinite(minutes) ? Math.max(1, minutes) : 10,
          at: getISOForLocalDateTime(date, "12:00"),
          done: false,
        });
        practiceOpen = false;
        renderPracticeCreator(false);
        renderAll();
      });
    }
  });

  byId("addLabModuleBtn")?.addEventListener("click", () => {
    const moduleId = /** @type {HTMLSelectElement|null} */ (byId("labModuleSelect"))?.value || "";
    const due = /** @type {HTMLInputElement|null} */ (byId("labDueDate"))?.value || "";
    const module = LAB_MODULES.find((m) => m.id === moduleId);
    if (!module) return;
    const state = loadState();
    addStudentItem(state, {
      studentId: me.id,
      kind: "practice",
      title: module.title,
      details: `${module.description} ${t("Добавлено из LinguaBoost Лаб.", "Added from LinguaBoost Lab.")}`,
      url: withLabTheme(module.href),
      minutes: module.minutes,
      at: getISOForLocalDateTime(due, "12:00"),
      done: false,
      source: "linguaboost",
      moduleId: module.id,
      level: module.level,
    });
    renderAll();
  });

  byId("saveStudentNotesBtn")?.addEventListener("click", () => {
    const goals = /** @type {HTMLTextAreaElement|null} */ (byId("studentGoals"))?.value || "";
    const notes = /** @type {HTMLTextAreaElement|null} */ (byId("studentNotes"))?.value || "";
    const state = loadState();
    upsertProgress(state, me.id, { studentGoals: goals.trim(), studentNotes: notes.trim() });
    saveState(state);
    renderAll();
  });

  byId("downloadProgressBtn")?.addEventListener("click", () => {
    const state = loadState();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`nge-student-progress-${stamp}.txt`, buildStudentReport(state, me.id, me.name));
  });

  const langBtn = byId("langBtn");
  langBtn?.addEventListener("click", () => {
    renderAll();
    renderLabPicker();
  });
}



  bootThemeAndLang();
  var ctx = ensureRole("student");
  wireTopbarActions();
  if (ctx) initStudentCabinet(ctx);

})();

