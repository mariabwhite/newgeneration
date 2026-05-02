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
 *  paymentUrl?: string;
 *  paymentProvider?: string;
 *  payerMarkedAt?: string;
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
        paymentProvider: "tbank",
        paymentUrl: "",
        comment: "Индивидуально",
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
        paymentProvider: "tbank",
        paymentUrl: "",
        comment: "Индивидуально",
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
export function loadState() {
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
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

/** @returns {{ userId: string; role: Role } | null} */
export function getSession() {
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
export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** @param {State} state @param {string} userId */
export function getUser(state, userId) {
  return state.users.find((u) => u.id === userId) || null;
}

/** @param {State} state */
export function listStudents(state) {
  return state.users.filter((u) => u.role === "student");
}

/** @param {State} state @param {string} teacherId */
export function listLessonsForTeacher(state, teacherId) {
  return state.lessons
    .filter((l) => l.teacherId === teacherId)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** @param {State} state @param {string} studentId */
export function listLessonsForStudent(state, studentId) {
  return state.lessons
    .filter((l) => l.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** @param {State} state @param {string} studentId */
export function getProgress(state, studentId) {
  return state.progress.find((p) => p.studentId === studentId) || null;
}

/**
 * @param {State} state
 * @param {string} studentId
 * @param {Partial<Progress>} patch
 */
export function upsertProgress(state, studentId, patch) {
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
export function listPaymentsForStudent(state, studentId) {
  return state.payments
    .filter((p) => p.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * @param {State} state
 * @param {Omit<Lesson, "id">} input
 */
export function addLesson(state, input) {
  const lesson = { id: uid("lesson"), ...input };
  state.lessons.push(lesson);
  saveState(state);
  return lesson;
}

/** @param {State} state @param {string} lessonId @param {Partial<Lesson>} patch */
export function updateLesson(state, lessonId, patch) {
  const idx = state.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  state.lessons[idx] = { ...state.lessons[idx], ...patch };
  saveState(state);
  return state.lessons[idx];
}

/** @param {State} state @param {string} lessonId */
export function deleteLesson(state, lessonId) {
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
export function addPayment(state, input) {
  const payment = { id: uid("pay"), ...input };
  state.payments.push(payment);
  saveState(state);
  return payment;
}

/** @param {State} state @param {string} paymentId @param {Partial<Payment>} patch */
export function updatePayment(state, paymentId, patch) {
  const idx = state.payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return null;
  state.payments[idx] = { ...state.payments[idx], ...patch };
  saveState(state);
  return state.payments[idx];
}

/** @param {State} state @param {string} paymentId */
export function deletePayment(state, paymentId) {
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
export function queueNotification(state, input) {
  const n = { id: uid("notif"), ...input };
  state.notifications.push(n);
  saveState(state);
  return n;
}

/** @param {State} state */
export function listPendingNotifications(state) {
  return state.notifications
    .filter((n) => !n.sentAt)
    .slice()
    .sort((a, b) => new Date(b.sendAt) - new Date(a.sendAt));
}

/** @param {State} state @param {string} userId */
export function listPendingNotificationsForUser(state, userId) {
  return listPendingNotifications(state).filter((n) => n.userId === userId);
}

/** @param {State} state @param {string} studentId */
export function listParentsForStudent(state, studentId) {
  return state.users.filter((u) => u.role === "parent" && (u.linkedStudents || []).includes(studentId));
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function getISOForLocalDateTime(dateStr, timeStr) {
  const safeDate = dateStr || todayISODate();
  const safeTime = timeStr || "12:00";
  const [yy, mm, dd] = safeDate.split("-").map((x) => Number(x));
  const [hh, min] = safeTime.split(":").map((x) => Number(x));
  const local = new Date(yy, (mm || 1) - 1, dd || 1, hh || 0, min || 0, 0, 0);
  return local.toISOString();
}

/** @param {State} state @param {string} studentId */
export function getStudentMeta(state, studentId) {
  return state.studentMeta.find((m) => m.studentId === studentId) || null;
}

/**
 * @param {State} state
 * @param {string} studentId
 * @param {Partial<StudentMeta>} patch
 */
export function upsertStudentMeta(state, studentId, patch) {
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
export function listStudentItems(state, studentId, kind = null) {
  return state.studentItems
    .filter((x) => x.studentId === studentId && (!kind || x.kind === kind))
    .slice()
    .sort((a, b) => new Date((b.at || b.createdAt) ?? 0) - new Date((a.at || a.createdAt) ?? 0));
}

/**
 * @param {State} state
 * @param {Omit<StudentItem, "id"|"createdAt">} input
 */
export function addStudentItem(state, input) {
  const item = { id: uid("si"), createdAt: new Date().toISOString(), ...input };
  state.studentItems.push(item);
  saveState(state);
  return item;
}

/** @param {State} state @param {string} itemId @param {Partial<StudentItem>} patch */
export function updateStudentItem(state, itemId, patch) {
  const idx = state.studentItems.findIndex((x) => x.id === itemId);
  if (idx === -1) return null;
  state.studentItems[idx] = { ...state.studentItems[idx], ...patch, id: state.studentItems[idx].id };
  saveState(state);
  return state.studentItems[idx];
}

/** @param {State} state @param {string} itemId */
export function deleteStudentItem(state, itemId) {
  const idx = state.studentItems.findIndex((x) => x.id === itemId);
  if (idx === -1) return false;
  state.studentItems.splice(idx, 1);
  saveState(state);
  return true;
}

/** @param {State} state @param {string} teacherId */
export function listTeacherTasks(state, teacherId) {
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
export function addTeacherTask(state, input) {
  const task = { id: uid("task"), createdAt: new Date().toISOString(), ...input };
  state.teacherTasks.push(task);
  saveState(state);
  return task;
}

/** @param {State} state @param {string} taskId @param {Partial<TeacherTask>} patch */
export function updateTeacherTask(state, taskId, patch) {
  const idx = state.teacherTasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;
  state.teacherTasks[idx] = { ...state.teacherTasks[idx], ...patch, id: state.teacherTasks[idx].id };
  saveState(state);
  return state.teacherTasks[idx];
}

/** @param {State} state @param {string} taskId */
export function deleteTeacherTask(state, taskId) {
  const idx = state.teacherTasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return false;
  state.teacherTasks.splice(idx, 1);
  saveState(state);
  return true;
}
