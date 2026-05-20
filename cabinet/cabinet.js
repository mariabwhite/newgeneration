/**
 * NG English · cabinet · MVP v2 (2026-05-16)
 *
 * Single module that replaces the old zoo:
 *   app.js, core.js, student.js, teacher.js, parent.js, *-standalone.js
 *
 * Reads ./data.json (snapshot from Notion).
 * Auth: 4-digit PIN per student, password for teacher. Session in localStorage.
 *
 * Security note: this is MVP. data.json ships to the browser, so anyone who
 * downloads it can read all PINs and student records. For production, move to
 * a serverless proxy that holds the Notion API key.
 */
(function () {
  "use strict";

  const SESSION_KEY = "nge_session_v2";

  /**
   * Data is loaded via <script src="./data.js"> which sets window.NGE_DATA.
   * (fetch() doesn't work on file:// in Chrome/Edge.)
   */
  async function loadData() {
    if (window.NGE_DATA) return window.NGE_DATA;
    throw new Error("data.js не подгрузился — проверь подключение <script src='./data.js'> до cabinet.js");
  }

  /* ---------- session ---------- */

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function setSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function signOut() {
    clearSession();
    location.href = "./login.html";
  }

  /* ---------- auth ---------- */

  async function sha256(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Try to sign in with `code`. Returns session object or null.
   * If `code` looks like a 4-digit PIN — match student by pin.
   * Otherwise — treat as teacher password (hash + compare).
   */
  async function tryLogin(code) {
    const data = await loadData();
    const trimmed = String(code).trim();

    // 4-digit PIN → family (PIN shared between student and parent;
    // login.html shows a picker right after to set the final role).
    if (/^\d{4}$/.test(trimmed)) {
      const student = data.students.find(s => s.pin === trimmed);
      if (student) {
        return { role: "family", studentId: student.id, name: student.name };
      }
      return null;
    }

    // Teacher password
    const hashHex = await sha256(trimmed);
    if (hashHex === data.teacher.passwordHash) {
      return { role: "teacher", name: data.teacher.name };
    }

    return null;
  }

  /* ---------- guard ---------- */

  function requireSession(expectedRole) {
    const s = getSession();
    if (!s) { location.href = "./login.html"; return null; }
    if (expectedRole && s.role !== expectedRole) {
      // Role mismatch — bounce to login
      location.href = "./login.html";
      return null;
    }
    return s;
  }

  /**
   * Для student.html / parent.html: возвращает session + studentId для рендера.
   * Преподаватель (если есть ?student=<id>) видит превью без сброса своей
   * сессии. Студент видит только свои данные.
   */
  function requireStudentViewSession() {
    const s = getSession();
    if (!s) { location.href = "./login.html"; return null; }
    const url = new URL(location.href);
    const previewId = url.searchParams.get("student");
    if (s.role === "teacher") {
      if (!previewId) { location.href = "./teacher.html"; return null; }
      return { ...s, viewStudentId: previewId, isPreview: true };
    }
    if (s.role === "student" || s.role === "parent") {
      return { ...s, viewStudentId: s.studentId, isPreview: false };
    }
    // role === "family" → user hasn't picked yet; bounce to login picker.
    location.href = "./login.html";
    return null;
  }

  /* ---------- find student helpers ---------- */

  async function getStudentById(id) {
    const data = await loadData();
    return data.students.find(s => s.id === id) || null;
  }

  async function getAllStudents() {
    const data = await loadData();
    return data.students;
  }

  async function getReportsForStudent(studentId) {
    const data = await loadData();
    return (data.reports || []).filter(r => r.student_id === studentId);
  }

  /* ---------- drafts (localStorage) ---------- */
  /* MVP-механика: Маша создаёт черновики отчётов локально в браузере.
     Родитель НИКОГДА не видит локальные черновики — только данные из data.js
     со статусом "sent". Чтобы опубликовать черновик, Маша нажимает
     "Опубликовать" → копируется промт для Claude → Claude правит data.js
     (status: "sent") → bumpает ?v= → родитель видит. */

  const DRAFTS_KEY = "nge-report-drafts";

  function _readDrafts() {
    try {
      const raw = localStorage.getItem(DRAFTS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  function _writeDrafts(arr) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr)); } catch (_) {}
  }

  function getDrafts() {
    return _readDrafts();
  }

  function getDraftForStudent(studentId, month) {
    return _readDrafts().find(d => d.student_id === studentId && d.month === month) || null;
  }

  function saveDraft(draft) {
    if (!draft || !draft.student_id || !draft.month) {
      throw new Error("saveDraft: student_id и month обязательны");
    }
    const all = _readDrafts();
    const idx = all.findIndex(d => d.student_id === draft.student_id && d.month === draft.month);
    const now = new Date().toISOString();
    const enriched = Object.assign({}, draft, {
      id: draft.id || ("local-" + draft.student_id + "-" + draft.month),
      status: "draft",
      source: "local",
      updated_at: now,
      created_at: (idx >= 0 ? all[idx].created_at : now)
    });
    if (idx >= 0) all[idx] = enriched;
    else all.push(enriched);
    _writeDrafts(all);
    return enriched;
  }

  function deleteDraft(id) {
    const all = _readDrafts();
    const filtered = all.filter(d => d.id !== id);
    _writeDrafts(filtered);
    return filtered.length !== all.length;
  }

  /**
   * Унифицированный поиск отчёта или черновика по ученику и месяцу.
   * Приоритет: data.js sent > локальный draft > data.js !sent > nothing.
   * Возвращает { source, report, status } или null.
   *   source = "data" — из data.js (Notion snapshot)
   *   source = "draft" — из localStorage (локальный черновик Маши)
   *   status = "sent" — опубликован (виден родителю)
   *   status = "draft" — черновик (НЕ виден родителю)
   */
  function getReportOrDraft(studentId, month) {
    const data = window.NGE_DATA || {};
    const reports = data.reports || [];
    const dataReport = reports.find(r => r.student_id === studentId && r.month === month);
    if (dataReport && (dataReport.status === "sent" || dataReport.report_status === "sent")) {
      return { source: "data", report: dataReport, status: "sent" };
    }
    const localDraft = getDraftForStudent(studentId, month);
    if (localDraft) {
      return { source: "draft", report: localDraft, status: "draft" };
    }
    if (dataReport) {
      return { source: "data", report: dataReport, status: dataReport.status || "draft" };
    }
    return null;
  }

  /* ---------- render: student view ---------- */

  function _esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Извлечь "Имя Отчество" из "Фамилия Имя Отчество" */
  function _parseImyaOtchestvo(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 3) return parts[1] + " " + parts[2];
    if (parts.length === 2) return parts[1];
    return parts[0];
  }

  /* Уменьшительное имя ребёнка: explicit nickname или первое слово name */
  function _studentNickname(student) {
    if (!student) return "";
    if (student.nickname) return student.nickname;
    return student.name.trim().split(/\s+/)[0];
  }

  /* Приветствие для ученика. Сначала проверяем явное поле greeting_student в data.js
     (Маша задала разный тон для каждого), потом fallback на автологику. */
  function _greetingForStudent(student) {
    if (!student) return "Здравствуйте!";
    if (student.greeting_student) return student.greeting_student;
    /* fallback автологика */
    if (student.id === "ekaterina-mariya-pair") return "Привет, девочки!";
    if (student.is_adult && !student.casual_greeting) return "Здравствуйте, " + _parseImyaOtchestvo(student.name);
    return "Привет, " + _studentNickname(student);
  }

  /* Приветствие для родителя. Сначала явное greeting_parent в data.js, иначе автологика. */
  function _greetingForParent(student) {
    if (!student) return "Здравствуйте!";
    if (student.greeting_parent) return student.greeting_parent;
    /* fallback автологика */
    if (student.id === "ekaterina-mariya-pair") return "Здравствуйте!";
    if (student.is_adult && !student.casual_greeting) return "Здравствуйте, " + _parseImyaOtchestvo(student.name);
    if (student.is_adult && student.casual_greeting) return "Привет, " + _studentNickname(student);
    if (student.parent_name) return "Здравствуйте, " + _parseImyaOtchestvo(student.parent_name);
    return "Здравствуйте!";
  }

  function renderStudent(container, student) {
    if (!student) {
      container.innerHTML = "<p>Профиль ученика не найден.</p>";
      return;
    }
    const goal = student.goal ? `<div class="cab-card-row"><span class="cab-row-label">Цель</span><span class="cab-row-value">${_esc(student.goal)}</span></div>` : "";
    const parent = student.parent_name ? `<div class="cab-card-row"><span class="cab-row-label">Родитель</span><span class="cab-row-value">${_esc(student.parent_name)}</span></div>` : "";
    container.innerHTML = `
      <div class="cab-hero">
        <h1>${_esc(_greetingForStudent(student))}</h1>
        <p class="cab-hero-sub">Ваш личный кабинет</p>
      </div>

      <div class="cab-grid">
        <article class="cab-card">
          <h3>Профиль</h3>
          <div class="cab-card-row"><span class="cab-row-label">Имя</span><span class="cab-row-value">${_esc(student.name)}</span></div>
          ${student.level ? `<div class="cab-card-row"><span class="cab-row-label">Уровень</span><span class="cab-row-value">${_esc(student.level)}</span></div>` : ""}
          ${student.format ? `<div class="cab-card-row"><span class="cab-row-label">Формат</span><span class="cab-row-value">${_esc(student.format)}</span></div>` : ""}
          ${student.duration ? `<div class="cab-card-row"><span class="cab-row-label">Длительность</span><span class="cab-row-value">${_esc(student.duration)}</span></div>` : ""}
          ${goal}
          ${parent}
        </article>

        ${_renderAbonementCard(student, { studentView: true })}

        ${_renderHomeworkCard(student)}

        ${_renderLessonsCard(student, { interactive: true })}
      </div>

    `;

    _wireHomeworkCheckboxes(container, student);
  }

  /* ---------- render: teacher (schedule grid + table) ---------- */

  const _DAY_MAP = {
    'понедельник': 1, 'пн': 1,
    'вторник': 2, 'вт': 2,
    'среда': 3, 'ср': 3,
    'четверг': 4, 'чт': 4,
    'пятница': 5, 'пт': 5,
    'суббота': 6, 'сб': 6,
    'воскресенье': 7, 'вс': 7,
  };
  const _DAY_SHORT = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс" };

  function _parseSchedule(scheduleStr) {
    if (!scheduleStr) return [];
    const out = [];
    const slots = scheduleStr.split(/[\/;,]/);
    for (const raw of slots) {
      const s = raw.trim().toLowerCase();
      if (!s) continue;
      // ВАЖНО: \b не работает с кириллицей в стандартных JS-регексах,
      // поэтому используем простой includes (порядок _DAY_MAP — длинные имена
      // первыми, чтобы "пн" не съел "понедельник").
      let dayNum = null;
      for (const [name, num] of Object.entries(_DAY_MAP)) {
        if (s.indexOf(name) !== -1) { dayNum = num; break; }
      }
      if (!dayNum) continue;
      const timeMatch = s.match(/(\d{1,2})[:.,](\d{2})/);
      let time = null;
      if (timeMatch) {
        time = String(parseInt(timeMatch[1], 10)).padStart(2, "0") + ":" + timeMatch[2];
      }
      out.push({ dayNum, time });
    }
    return out;
  }

  function _buildScheduleGrid(students) {
    // Each cell: { dayNum, time, studentName, studentId, level }
    const slots = [];
    students.forEach(s => {
      _parseSchedule(s.schedule).forEach(sl => {
        slots.push({ ...sl, studentName: s.name, studentId: s.id, level: s.level });
      });
    });
    // Group by day, sort by time within
    const byDay = {};
    for (let d = 1; d <= 7; d++) byDay[d] = [];
    slots.forEach(sl => byDay[sl.dayNum].push(sl));
    Object.values(byDay).forEach(arr => arr.sort((a, b) => (a.time || "ZZ").localeCompare(b.time || "ZZ")));
    return byDay;
  }

  function _computeNextLesson(students) {
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay(); // 1=Пн … 7=Вс
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let best = null;
    students.forEach(s => {
      _parseSchedule(s.schedule).forEach(sl => {
        if (!sl.time) return;
        const [h, m] = sl.time.split(":").map(Number);
        const slotMins = h * 60 + m;
        let dayDelta = (sl.dayNum - dow + 7) % 7;
        let deltaMins = dayDelta * 1440 + slotMins - nowMins;
        if (deltaMins < 0) deltaMins += 7 * 1440;
        if (!best || deltaMins < best.deltaMins) {
          best = { studentName: s.name, time: sl.time, dayNum: sl.dayNum, deltaMins };
        }
      });
    });
    return best;
  }

  function _humanDelta(mins) {
    if (mins < 60) return `через ${mins} мин`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h < 24) return `через ${h} ч${m ? " " + m + " мин" : ""}`;
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `через ${d} д${rh ? " " + rh + " ч" : ""}`;
  }

  function _currentMonthKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function _previousMonthKey() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  /* ---------- report state helpers ---------- */

  function _reportStateForStudent(studentId, currentMonth) {
    const state = getReportOrDraft(studentId, currentMonth);
    if (!state) return { kind: "none" };
    if (state.status === "sent") return { kind: "sent", report: state.report, source: state.source };
    if (state.source === "draft") return { kind: "local-draft", report: state.report };
    return { kind: "data-draft", report: state.report, dataStatus: state.report.status };
  }

  function _reportCellHtml(state, studentId) {
    if (state.kind === "none") {
      return '<button class="cab-report-cell cab-report-cell--none" type="button" '
        + 'data-action="open-report-modal" data-student-id="' + _esc(studentId) + '" '
        + 'title="Создать черновик отчёта">✏️ Сгенерировать</button>';
    }
    if (state.kind === "sent") {
      const date = state.report.sent_date || state.report.updated_at || "";
      const shortDate = date ? date.slice(0, 10) : "";
      return '<button class="cab-report-cell cab-report-cell--sent" type="button" '
        + 'data-action="preview-report" data-student-id="' + _esc(studentId) + '" '
        + 'title="Опубликован — клик чтобы посмотреть">✅ Опубликован'
        + (shortDate ? ' · ' + _esc(shortDate) : '') + '</button>';
    }
    if (state.kind === "local-draft") {
      return '<button class="cab-report-cell cab-report-cell--draft cab-report-cell--local" type="button" '
        + 'data-action="preview-report" data-student-id="' + _esc(studentId) + '" '
        + 'title="Локальный черновик — клик чтобы открыть/опубликовать">🟡 Черновик</button>';
    }
    // data-draft
    const sublabel = state.dataStatus === "ready to send"
      ? "готов к отправке"
      : (state.dataStatus === "source imported" ? "источник" : (state.dataStatus || "источник"));
    return '<button class="cab-report-cell cab-report-cell--draft cab-report-cell--source" type="button" '
      + 'data-action="preview-report" data-student-id="' + _esc(studentId) + '" '
      + 'title="Notion-черновик (' + _esc(sublabel) + ') — клик чтобы открыть/опубликовать">🟡 Черновик · ' + _esc(sublabel) + '</button>';
  }

  function _buildClaudeGeneratePrompt(student, currentMonth) {
    const monthLabel = _monthLabelFromISO(currentMonth);
    const lessons = (student.lessons || [])
      .filter(l => l.date && l.date.startsWith(currentMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
    let p = "📝 Запрос на генерацию отчёта за " + monthLabel + "\n\n";
    p += "Ученик: " + student.name + " (id: " + student.id + ")\n";
    p += "Уровень: " + (student.level || "—") + "\n";
    p += "Формат: " + (student.format || "—") + "\n";
    p += "Расписание: " + (student.schedule || "—") + "\n";
    p += "Цель: " + (student.goal || "—") + "\n";
    p += "Абонемент: " + (student.lessons_in_package || "—") + " уроков, проведено: " + (student.lessons_used_this_month || 0) + "\n";
    if (student.stability_note) p += "Контекст: " + student.stability_note + "\n";
    p += "\nКалендарь занятий за " + monthLabel + ":\n";
    lessons.forEach(l => {
      const ic = l.status === "completed" ? "✅" : l.status === "missed" ? "❌"
        : l.status === "cancelled" ? "⛔" : l.status === "rescheduled" ? "🔄" : "📅";
      p += "- " + l.date + " " + ic + " " + (l.topic || (l.status === "planned" ? "запланирован" : "—")) + "\n";
    });
    p += "\nЗадача: собери parent report за " + monthLabel + " для родителя (" + (student.parent_name || "родитель") + ").\n";
    p += "Формат: # Краткий вывод (3-4 предложения), # Календарь занятий (со статусами), # По прогрессу, # Зоны роста, # Следующая задача, # Майский абонемент (если есть цены).\n";
    p += "Тон — спокойный, методический, конкретный. Без воды. Маша посмотрит черновик ПЕРЕД публикацией и сможет править руками.\n";
    p += "После того как соберёшь — Маша вставит текст обратно в модалку «Сгенерировать отчёт» → «Полный текст».";
    return p;
  }

  function _buildPublishPrompt(report, student) {
    let p = "✅ Запрос на публикацию отчёта (status → \"sent\")\n\n";
    p += "Ученик: " + student.name + " (id: " + student.id + ")\n";
    p += "Месяц: " + report.month + " (" + (report.month_label || "") + ")\n";
    p += "Тип: " + (report.type || "parent report") + "\n";
    p += "Recipient: " + (report.recipient || "родитель") + "\n";
    p += "Title: " + (report.title || "") + "\n\n";
    p += "Short message:\n" + (report.short_message || "") + "\n\n";
    p += "Content (markdown):\n" + (report.content || "") + "\n\n";
    p += "Действия:\n";
    p += "1. Добавить/обновить запись в data.js (массив reports) с этими данными + status: \"sent\" + sent_date: \"" + new Date().toISOString().slice(0, 10) + "\"\n";
    p += "2. Bump-нуть data.js?v=N в cabinet/index.html, login.html, teacher.html, parent.html, student.html\n";
    p += "3. После того как Маша подтвердит публикацию — она в кабинете нажмёт «🗑 Удалить» на этом черновике (или ты скажешь ей сделать NGECabinet.deleteDraft(\"" + (report.id || "") + "\") в консоли).";
    return p;
  }

  function renderTeacher(container, students) {
    const grid = _buildScheduleGrid(students);
    const totalSlots = Object.values(grid).reduce((sum, day) => sum + day.length, 0);
    const reports = (window.NGE_DATA && window.NGE_DATA.reports) || [];
    const currentMonth = _currentMonthKey();

    // Состояние отчёта для каждого ученика (sent / draft / nothing)
    const reportStates = {};
    students.forEach(s => { reportStates[s.id] = _reportStateForStudent(s.id, currentMonth); });

    // Оповещалки
    const unpaid = students.filter(s => !s.payment_status || s.payment_status === "" || s.payment_status === "Не выставлено" || s.payment_status === "Ожидает");
    const noSentReport = students.filter(s => reportStates[s.id].kind !== "sent");
    const pendingDrafts = students.filter(s => reportStates[s.id].kind === "local-draft" || reportStates[s.id].kind === "data-draft");
    const nextLesson = _computeNextLesson(students);

    const unpaidHtml = unpaid.length
      ? `<div class="cab-alert-num">${unpaid.length}</div>
         <div class="cab-alert-list">${unpaid.slice(0, 5).map(s => `<span>${_esc(s.name)}</span>`).join(", ")}${unpaid.length > 5 ? " + ещё " + (unpaid.length - 5) : ""}</div>`
      : `<div class="cab-alert-num">✓</div><div class="cab-alert-list">все оплачено</div>`;

    const nextLessonHtml = nextLesson
      ? `<div class="cab-alert-num">${_esc(_DAY_SHORT[nextLesson.dayNum])} ${_esc(nextLesson.time)}</div>
         <div class="cab-alert-list">${_esc(nextLesson.studentName)} · ${_esc(_humanDelta(nextLesson.deltaMins))}</div>`
      : `<div class="cab-alert-num">—</div><div class="cab-alert-list">нет занятий с временем</div>`;

    const noReportHtml = noSentReport.length
      ? `<div class="cab-alert-num">${noSentReport.length}</div>
         <div class="cab-alert-list">${noSentReport.slice(0, 5).map(s => `<span>${_esc(s.name)}</span>`).join(", ")}${noSentReport.length > 5 ? " + ещё " + (noSentReport.length - 5) : ""}</div>`
      : `<div class="cab-alert-num">✓</div><div class="cab-alert-list">все отчёты опубликованы</div>`;

    const draftsHtml = pendingDrafts.length
      ? `<div class="cab-alert-num">${pendingDrafts.length}</div>
         <div class="cab-alert-list">${pendingDrafts.slice(0, 5).map(s => `<span>${_esc(s.name)}</span>`).join(", ")}${pendingDrafts.length > 5 ? " + ещё " + (pendingDrafts.length - 5) : ""}</div>`
      : `<div class="cab-alert-num">✓</div><div class="cab-alert-list">нет черновиков на проверке</div>`;

    const dayColumns = [1, 2, 3, 4, 5, 6, 7].map(d => {
      const slotsHtml = grid[d].length
        ? grid[d].map(sl => `
            <div class="cab-slot">
              <div class="cab-slot-time">${_esc(sl.time || "—")}</div>
              <div class="cab-slot-name">${_esc(sl.studentName)}</div>
              ${sl.level ? `<div class="cab-slot-level">${_esc(sl.level)}</div>` : ""}
            </div>
          `).join("")
        : `<div class="cab-slot cab-slot--empty">—</div>`;
      return `
        <div class="cab-day">
          <h4>${_esc(_DAY_SHORT[d])}</h4>
          ${slotsHtml}
        </div>
      `;
    }).join("");

    function _shortParent(name, isAdult) {
      if (!name) return isAdult ? "взрослый" : "—";
      // "Анатольева Галина Анатольевна" → "Анатольева Г.А."
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 3) return parts[0] + " " + parts[1].charAt(0) + "." + parts[2].charAt(0) + ".";
      if (parts.length === 2) return parts[0] + " " + parts[1].charAt(0) + ".";
      return name;
    }
    /* archived students (раз/слиты, оставлены для legacy-данных) — скрываем из таблицы учителя */
    students = (students || []).filter(s => !s.archived);

    const rows = students.map(s => {
      const vacationClass = s.summer_vacation ? " class=\"cab-table-row--vacation\"" : "";
      const vacationBadge = s.summer_vacation
        ? ` <span class="cab-vacation-badge" title="${_esc(s.summer_vacation_note || "На каникулах")}">☀ каникулы</span>`
        : "";
      return `
      <tr${vacationClass}>
        <td>${_esc(s.name)}${vacationBadge}</td>
        <td>${_esc(s.format || "—")}</td>
        <td>${_esc(s.schedule || "—")}</td>
        <td title="${_esc(s.parent_name || "")}">${_esc(_shortParent(s.parent_name, s.is_adult))}</td>
        <td>${s.price_per_lesson ? _esc(s.price_per_lesson) + " ₽" : "—"}</td>
        <td>${_esc(s.payment_status || "Не выставлено")}</td>
        <td>${_reportCellHtml(reportStates[s.id], s.id)}</td>
        <td><code>${_esc(s.pin)}</code></td>
        <td style="white-space: nowrap;">
          <a class="cab-preview-link" href="./student.html?student=${_esc(s.id)}" target="_blank" title="Открыть кабинет ученика">🎓</a>
          <a class="cab-preview-link" href="./parent.html?student=${_esc(s.id)}" target="_blank" title="Открыть кабинет родителя">👪</a>
          <button class="cab-preview-link cab-add-lesson-btn" type="button" data-student-id="${_esc(s.id)}" data-student-name="${_esc(s.name)}" data-lessons-used="${_esc(s.lessons_used_this_month || 0)}" title="Записать урок">➕</button>
        </td>
      </tr>`;
    }).join("");

    container.innerHTML = `
      <div class="cab-hero">
        <h1>Кабинет преподавателя</h1>
        <p class="cab-hero-sub">${students.length} активных учеников · ${totalSlots} занятий в неделю</p>
      </div>

      <div class="cab-quick-links">
        <a class="cab-link-chip cab-link-chip--accent" href="https://progressme.ru/" target="_blank" rel="noreferrer">ProgressMe ↗</a>
        <a class="cab-link-chip" href="https://www.notion.so/34d7364cba7980558eaecdd30712c27a" target="_blank" rel="noreferrer">Notion: Ученики</a>
        <a class="cab-link-chip" href="https://www.notion.so/a4dcecdb595144eab9badb752e1e7b81" target="_blank" rel="noreferrer">Notion: Договоры</a>
        <a class="cab-link-chip" href="https://www.notion.so/3627364cba7981ba94c1e261e7eec9f1" target="_blank" rel="noreferrer">Notion: Логины и PIN</a>
        <a class="cab-link-chip" href="https://t.me/MariaBurceva_English" target="_blank" rel="noreferrer">Telegram-канал</a>
      </div>

      <div class="cab-alerts">
        <article class="cab-alert cab-alert--unpaid">
          <div class="cab-alert-head"><span class="cab-alert-icon">💰</span><h4>Не оплачено</h4></div>
          ${unpaidHtml}
        </article>
        <article class="cab-alert cab-alert--next">
          <div class="cab-alert-head"><span class="cab-alert-icon">📅</span><h4>Следующий урок</h4></div>
          ${nextLessonHtml}
        </article>
        <article class="cab-alert cab-alert--drafts">
          <div class="cab-alert-head"><span class="cab-alert-icon">🟡</span><h4>Черновики ждут проверки</h4></div>
          ${draftsHtml}
        </article>
        <article class="cab-alert cab-alert--report">
          <div class="cab-alert-head"><span class="cab-alert-icon">📝</span><h4>Не опубликован отчёт за месяц</h4></div>
          ${noReportHtml}
        </article>
      </div>

      <article class="cab-card">
        <h3>Расписание недели</h3>
        <div class="cab-schedule-grid">
          ${dayColumns}
        </div>
      </article>

      <article class="cab-card" style="margin-top: 16px;">
        <h3>Ученики</h3>
        <div class="cab-table-wrap">
          <table class="cab-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Формат</th>
                <th>Расписание</th>
                <th>Родитель</th>
                <th>Цена</th>
                <th>Оплата</th>
                <th>Отчёт</th>
                <th>PIN</th>
                <th>Превью</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>

      <p class="cab-mvp-note">MVP-версия. ➕ — записать урок (генерит markdown → копирует в буфер → вставь в чат с Claude, я залью в Lesson Log).</p>

      <dialog id="lessonDialog" class="cab-lesson-dialog">
        <form method="dialog" id="lessonForm">
          <h3 class="cab-lesson-title">➕ Запись урока: <span id="lessonStudentName"></span></h3>
          <div class="cab-lesson-grid">
            <label>Дата <input type="date" name="date" id="lessonDate" required></label>
            <label>Статус
              <select name="status" id="lessonStatus">
                <option value="completed">✅ completed</option>
                <option value="planned">📅 planned</option>
                <option value="missed">❌ missed</option>
                <option value="rescheduled">🔄 rescheduled</option>
                <option value="cancelled">⛔ cancelled</option>
              </select>
            </label>
            <label class="cab-lesson-full">Тема <input type="text" name="topic" placeholder="Present Perfect отрицания + Question forms" required></label>
            <label class="cab-lesson-full">Активности (через запятую) <input type="text" name="activities" placeholder="grammar, speaking"></label>
            <label class="cab-lesson-full">Что прошли <textarea name="covered" rows="3" placeholder="Подробнее — что разбирали, что получилось"></textarea></label>
            <label class="cab-lesson-full">Домашка — текст <textarea name="homework" rows="2" placeholder="Что задано — текстом, для родителя/ученика"></textarea></label>
            <label class="cab-lesson-full">Lab-модуль <select name="labModule" id="lessonLabSelect"><option value="">— не назначен —</option></select></label>
            <label>№ в пакете <input type="number" name="lessonNum" min="1" step="1"></label>
            <label>Длительность мин <input type="number" name="duration" value="60" min="15" step="5"></label>
          </div>
          <div class="cab-lesson-actions">
            <button type="button" class="cab-action-btn cab-action-btn--primary" id="lessonCopyBtn">📋 Скопировать для Claude</button>
            <button type="button" class="cab-action-btn cab-action-btn--ghost" id="lessonCancelBtn">Отмена</button>
          </div>
          <p class="cab-lesson-hint" id="lessonHint" style="display:none;">✅ Скопировано! Открой Claude → вставь сообщение → я залью в Lesson Log + обновлю счётчик абонемента.</p>
        </form>
      </dialog>

      <dialog id="reportDialog" class="cab-report-dialog">
        <form method="dialog" id="reportForm">
          <h3 class="cab-lesson-title">
            <span id="reportModalIcon">✏️</span>
            <span id="reportModalAction">Сгенерировать отчёт</span> —
            <span id="reportStudentName"></span>
          </h3>
          <div class="cab-report-banner" id="reportModalBadge" style="display:none;">
            🟡 ЭТО ЧЕРНОВИК. Родитель его не видит — пока ты не нажмёшь «Опубликовать».
          </div>
          <div class="cab-lesson-grid">
            <label>Месяц <input type="month" name="month" id="reportMonth" required></label>
            <label>Тип
              <select name="type" id="reportType">
                <option value="parent report">Parent report (родителю)</option>
                <option value="student report">Student report (ученику)</option>
              </select>
            </label>
            <label class="cab-lesson-full">Получатель <input type="text" name="recipient" id="reportRecipient" placeholder="напр. Изотова Ольга Игоревна"></label>
            <label class="cab-lesson-full">Заголовок <input type="text" name="title" id="reportTitle" placeholder="2026-05 — Имя — parent report"></label>
            <label class="cab-lesson-full">Короткое сообщение (1-2 предложения, увидит родитель в карточке)
              <textarea name="short_message" id="reportShortMessage" rows="2" placeholder="Юля молодец — закончили блок по теме X, освоили Y..."></textarea>
            </label>
            <label class="cab-lesson-full">Полный текст отчёта (markdown — поддерживаются # ## - **жирный**)
              <textarea name="content" id="reportContent" rows="14" placeholder="# Краткий вывод&#10;&#10;...&#10;&#10;# Календарь занятий — месяц&#10;&#10;- 01.05 — тема&#10;&#10;# По прогрессу&#10;&#10;...&#10;&#10;# Зоны роста&#10;&#10;...&#10;&#10;# Следующая задача&#10;&#10;..."></textarea>
            </label>
          </div>
          <div class="cab-lesson-actions">
            <button type="button" class="cab-action-btn cab-action-btn--primary" id="reportAutoDraftBtn" style="background:#7c3aed;">🪄 Авто-черновик через AI Hub</button>
            <button type="button" class="cab-action-btn cab-action-btn--ghost" id="reportClaudePromptBtn">🤖 Промт в буфер (фоллбэк)</button>
            <button type="button" class="cab-action-btn cab-action-btn--primary" id="reportSaveBtn">💾 Сохранить черновик</button>
            <button type="button" class="cab-action-btn cab-action-btn--primary" id="reportPublishBtn" style="display:none; background: #2c8a4e;">✅ Опубликовать (через Claude)</button>
            <button type="button" class="cab-action-btn cab-action-btn--ghost" id="reportDeleteBtn" style="display:none; color:#b94d4d;">🗑 Удалить</button>
            <button type="button" class="cab-action-btn cab-action-btn--ghost" id="reportCancelBtn">Закрыть</button>
          </div>
          <p class="cab-lesson-hint" id="reportHint" style="display:none;"></p>
        </form>
      </dialog>
    `;

    // Wire up "Запись урока" buttons
    const dialog = container.querySelector("#lessonDialog");
    const nameEl = container.querySelector("#lessonStudentName");
    const dateEl = container.querySelector("#lessonDate");
    const lessonNumEl = container.querySelector("input[name='lessonNum']");
    const form = container.querySelector("#lessonForm");
    const hint = container.querySelector("#lessonHint");
    const labSelect = container.querySelector("#lessonLabSelect");

    // Populate Lab-module picker from window.NGE_DATA.labModules
    (function populateLabSelect() {
      if (!labSelect) return;
      const modules = (window.NGE_DATA && window.NGE_DATA.labModules) || [];
      const byLevel = {};
      modules.forEach(m => {
        if (!byLevel[m.level]) byLevel[m.level] = [];
        byLevel[m.level].push(m);
      });
      const order = ["Pre-A1", "A1", "A2", "B1", "B2+", "C1"];
      order.forEach(lvl => {
        if (!byLevel[lvl]) return;
        const og = document.createElement("optgroup");
        og.label = lvl;
        byLevel[lvl].forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.url;
          opt.textContent = m.title;
          opt.dataset.title = m.title;
          og.appendChild(opt);
        });
        labSelect.appendChild(og);
      });
    })();

    function todayISO() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    container.querySelectorAll(".cab-add-lesson-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sid = btn.dataset.studentId;
        const sname = btn.dataset.studentName;
        const used = parseInt(btn.dataset.lessonsUsed || "0", 10);
        nameEl.textContent = sname;
        dateEl.value = todayISO();
        lessonNumEl.value = used + 1;
        if (labSelect) labSelect.value = "";
        form.dataset.studentId = sid;
        form.dataset.studentName = sname;
        hint.style.display = "none";
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
      });
    });

    container.querySelector("#lessonCancelBtn").addEventListener("click", () => {
      dialog.close && dialog.close();
      dialog.removeAttribute("open");
    });

    container.querySelector("#lessonCopyBtn").addEventListener("click", async () => {
      const data = new FormData(form);
      const sname = form.dataset.studentName;
      const sid = form.dataset.studentId;
      // Lab-модуль: достаём URL и название из выбранного option
      let labUrl = "—";
      let labTitle = "—";
      if (labSelect && labSelect.value) {
        labUrl = labSelect.value;
        const opt = labSelect.options[labSelect.selectedIndex];
        labTitle = (opt && (opt.dataset.title || opt.textContent)) || labSelect.value;
      }
      const md =
        `📝 Запись урока (для Claude → Lesson Log):\n` +
        `- ученик: ${sname} (id: ${sid})\n` +
        `- дата: ${data.get("date")}\n` +
        `- статус: ${data.get("status")}\n` +
        `- тема: ${data.get("topic")}\n` +
        `- активности: ${data.get("activities") || "—"}\n` +
        `- что прошли: ${data.get("covered") || "—"}\n` +
        `- домашка (текст): ${data.get("homework") || "—"}\n` +
        `- домашка (Lab url): ${labUrl}\n` +
        `- домашка (Lab название): ${labTitle}\n` +
        `- № в пакете: ${data.get("lessonNum") || "—"}\n` +
        `- длительность: ${data.get("duration") || 60} мин`;
      try {
        await navigator.clipboard.writeText(md);
        hint.style.display = "block";
        hint.textContent = "✅ Скопировано! Открой Claude → вставь сообщение → я залью в Lesson Log + обновлю счётчик абонемента.";
      } catch (e) {
        hint.style.display = "block";
        hint.textContent = "⚠️ Не получилось скопировать автоматом. Текст ниже — скопируй руками:\n\n" + md;
        hint.style.whiteSpace = "pre-wrap";
      }
    });

    // ============ Report modal wire-up ============
    const reportDialog = container.querySelector("#reportDialog");
    const reportForm = container.querySelector("#reportForm");
    const reportNameEl = container.querySelector("#reportStudentName");
    const reportMonthEl = container.querySelector("#reportMonth");
    const reportTypeEl = container.querySelector("#reportType");
    const reportRecipientEl = container.querySelector("#reportRecipient");
    const reportTitleEl = container.querySelector("#reportTitle");
    const reportShortMsgEl = container.querySelector("#reportShortMessage");
    const reportContentEl = container.querySelector("#reportContent");
    const reportBadge = container.querySelector("#reportModalBadge");
    const reportAction = container.querySelector("#reportModalAction");
    const reportIcon = container.querySelector("#reportModalIcon");
    const reportPublishBtn = container.querySelector("#reportPublishBtn");
    const reportDeleteBtn = container.querySelector("#reportDeleteBtn");
    const reportClaudePromptBtn = container.querySelector("#reportClaudePromptBtn");
    const reportAutoDraftBtn = container.querySelector("#reportAutoDraftBtn");
    const reportSaveBtn = container.querySelector("#reportSaveBtn");
    const reportCancelBtn = container.querySelector("#reportCancelBtn");
    const reportHint = container.querySelector("#reportHint");

    const AI_HUB_URL = "http://127.0.0.1:8765";

    function openReportModal(studentId, mode) {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      const month = currentMonth;
      reportNameEl.textContent = student.name;
      reportForm.dataset.studentId = studentId;
      reportForm.dataset.studentName = student.name;
      reportForm.dataset.month = month;
      reportForm.dataset.mode = mode;
      reportMonthEl.value = month;
      reportHint.style.display = "none";
      reportHint.textContent = "";
      reportHint.style.whiteSpace = "";

      if (mode === "create") {
        reportIcon.textContent = "✏️";
        reportAction.textContent = "Сгенерировать отчёт";
        reportBadge.style.display = "none";
        reportTypeEl.value = "parent report";
        reportRecipientEl.value = student.parent_name || "родитель";
        reportTitleEl.value = month + " — " + student.name + " — parent report";
        reportShortMsgEl.value = "";
        reportContentEl.value = "";
        reportPublishBtn.style.display = "none";
        reportDeleteBtn.style.display = "none";
        delete reportForm.dataset.reportId;
        delete reportForm.dataset.source;
      } else {
        // edit / preview
        const state = getReportOrDraft(studentId, month);
        if (!state) { openReportModal(studentId, "create"); return; }
        const r = state.report;
        if (state.status === "sent") {
          reportIcon.textContent = "✅";
          reportAction.textContent = "Опубликованный отчёт";
          reportBadge.style.display = "none";
        } else {
          reportIcon.textContent = "🟡";
          reportAction.textContent = state.source === "draft" ? "Локальный черновик" : "Notion-черновик";
          reportBadge.style.display = "";
        }
        reportTypeEl.value = r.type || "parent report";
        reportRecipientEl.value = r.recipient || "";
        reportTitleEl.value = r.title || "";
        reportShortMsgEl.value = r.short_message || "";
        reportContentEl.value = r.content || "";
        reportForm.dataset.reportId = r.id || "";
        reportForm.dataset.source = state.source;
        reportPublishBtn.style.display = state.status === "sent" ? "none" : "";
        reportDeleteBtn.style.display = state.source === "draft" ? "" : "none";
      }

      if (typeof reportDialog.showModal === "function") reportDialog.showModal();
      else reportDialog.setAttribute("open", "");
    }

    function closeReportModal() {
      reportDialog.close && reportDialog.close();
      reportDialog.removeAttribute("open");
    }

    // Делегированный обработчик кликов по кнопкам в колонке «Отчёт»
    container.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const sid = btn.dataset.studentId;
      if (!sid) return;
      if (action === "open-report-modal") {
        openReportModal(sid, "create");
      } else if (action === "preview-report") {
        openReportModal(sid, "edit");
      }
    });

    reportCancelBtn.addEventListener("click", closeReportModal);

    function _collectDraftFromForm() {
      const studentId = reportForm.dataset.studentId;
      const monthVal = reportMonthEl.value;
      if (!studentId || !monthVal) return null;
      return {
        student_id: studentId,
        month: monthVal,
        month_label: _monthLabelFromISO(monthVal),
        type: reportTypeEl.value,
        recipient: reportRecipientEl.value,
        title: reportTitleEl.value,
        short_message: reportShortMsgEl.value,
        content: reportContentEl.value
      };
    }

    reportSaveBtn.addEventListener("click", function () {
      const draft = _collectDraftFromForm();
      if (!draft) return;
      try {
        saveDraft(draft);
        reportHint.style.display = "block";
        reportHint.textContent = "✅ Черновик сохранён локально. Закроем окно через 1.5 сек, и ты увидишь жёлтую плашку 🟡 в колонке «Отчёт».";
        setTimeout(function () {
          closeReportModal();
          renderTeacher(container, students);
        }, 1500);
      } catch (err) {
        reportHint.style.display = "block";
        reportHint.textContent = "⚠️ Ошибка: " + (err && err.message ? err.message : err);
      }
    });

    reportClaudePromptBtn.addEventListener("click", async function () {
      const studentId = reportForm.dataset.studentId;
      const monthVal = reportMonthEl.value;
      if (!studentId || !monthVal) return;
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      const prompt = _buildClaudeGeneratePrompt(student, monthVal);
      try {
        await navigator.clipboard.writeText(prompt);
        reportHint.style.display = "block";
        reportHint.textContent = "✅ Промт скопирован! Открой Claude → вставь → получи готовый markdown-текст → скопируй и вставь обратно сюда в поле «Полный текст отчёта» → нажми «Сохранить черновик».";
      } catch (e) {
        reportHint.style.display = "block";
        reportHint.style.whiteSpace = "pre-wrap";
        reportHint.textContent = "⚠️ Не получилось скопировать. Текст ниже:\n\n" + prompt;
      }
    });

    // 🪄 Авто-черновик через AI Hub — синхронный вызов Claude через локальный сервер.
    // Сервер должен быть запущен (start_hub.bat) и доступен на 127.0.0.1:8765.
    // Версия сервера должна быть >= 2026-05-19-cabinet-generate.
    reportAutoDraftBtn.addEventListener("click", async function () {
      const studentId = reportForm.dataset.studentId;
      const monthVal = reportMonthEl.value;
      if (!studentId || !monthVal) return;
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      const prompt = _buildClaudeGeneratePrompt(student, monthVal);

      // UI: lock buttons, show spinner-like hint
      const oldLabel = reportAutoDraftBtn.textContent;
      reportAutoDraftBtn.disabled = true;
      reportClaudePromptBtn.disabled = true;
      reportSaveBtn.disabled = true;
      reportAutoDraftBtn.textContent = "🌀 Claude думает…";
      reportHint.style.display = "block";
      reportHint.style.whiteSpace = "pre-wrap";
      reportHint.textContent = "Запрос ушёл в AI Hub. Claude собирает черновик — это займёт 30-120 сек. Не закрывай это окно.";

      const started = Date.now();
      try {
        const resp = await fetch(AI_HUB_URL + "/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt })
        });
        if (!resp.ok) {
          let errMsg = "HTTP " + resp.status;
          try { const j = await resp.json(); if (j && j.error) errMsg = j.error; } catch (_) {}
          throw new Error(errMsg);
        }
        const result = await resp.json();
        if (!result || !result.content) throw new Error("Пустой ответ от сервера");
        reportContentEl.value = result.content;
        const sec = Math.round((Date.now() - started) / 1000);
        reportHint.textContent = "✅ Черновик от Claude вставлен (" + sec + " сек). Проверь текст, поправь руками если нужно, → «💾 Сохранить черновик».";
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        reportHint.textContent = "⚠️ AI Hub не ответил: " + msg
          + "\n\nПроверь что сервер запущен (start_hub.bat в AI_Chat_Hub).\nЕсли сервер свежий, надо перезапустить — версия должна быть >= 2026-05-19-cabinet-generate.\n\nФоллбэк: жми «🤖 Промт в буфер» → вставь в Claude/Telegram руками.";
      } finally {
        reportAutoDraftBtn.disabled = false;
        reportClaudePromptBtn.disabled = false;
        reportSaveBtn.disabled = false;
        reportAutoDraftBtn.textContent = oldLabel;
      }
    });

    reportPublishBtn.addEventListener("click", async function () {
      const draft = _collectDraftFromForm();
      if (!draft) return;
      const student = students.find(s => s.id === draft.student_id);
      if (!student) return;
      // Сначала фиксируем текущие правки как локальный черновик
      let saved;
      try {
        saved = saveDraft(draft);
      } catch (err) {
        reportHint.style.display = "block";
        reportHint.textContent = "⚠️ Ошибка сохранения: " + (err && err.message ? err.message : err);
        return;
      }
      const prompt = _buildPublishPrompt(saved, student);
      try {
        await navigator.clipboard.writeText(prompt);
        reportHint.style.display = "block";
        reportHint.textContent = "✅ Промт публикации скопирован! Открой чат с Claude → вставь → Claude перенесёт черновик в data.js со status:\"sent\" + bump-нет ?v=. Пока окно не закрывай — после подтверждения Claude вернись сюда и нажми «🗑 Удалить» чтобы убрать локальный черновик.";
      } catch (e) {
        reportHint.style.display = "block";
        reportHint.style.whiteSpace = "pre-wrap";
        reportHint.textContent = "⚠️ Не скопировал автоматом. Текст ниже:\n\n" + prompt;
      }
    });

    reportDeleteBtn.addEventListener("click", function () {
      const reportId = reportForm.dataset.reportId;
      if (!reportId) return;
      if (!window.confirm("Удалить локальный черновик? Это действие необратимо (но если отчёт уже опубликован в data.js — он останется).")) return;
      deleteDraft(reportId);
      closeReportModal();
      renderTeacher(container, students);
    });
  }

  /* ---------- render: lessons table (shared by student & parent) ---------- */

  const _MONTH_NAMES_RU = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const _DOW_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

  function _todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function _currentMonthISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function _formatLessonDate(iso) {
    const [, m, day] = iso.split("-");
    const monIdx = parseInt(m, 10) - 1;
    return parseInt(day, 10) + " " + (_MONTH_NAMES_RU[monIdx] || "");
  }

  function _dowFromISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return _DOW_RU[new Date(y, m - 1, d).getDay()];
  }

  /* ---------- homework status (localStorage per studentId+date) ---------- */
  function _hwKey(studentId, date) {
    return "nge-hw-" + studentId + "-" + date;
  }

  function _getHwStatus(studentId, lesson) {
    if (!lesson || !lesson.homework) return null;
    try {
      const ls = localStorage.getItem(_hwKey(studentId, lesson.date));
      if (ls === "done" || ls === "pending") return ls;
    } catch (_) {}
    return (lesson.homework && lesson.homework.status) || "pending";
  }

  function _setHwStatus(studentId, date, status) {
    try { localStorage.setItem(_hwKey(studentId, date), status); } catch (_) {}
  }

  function _lessonStatusBadge(lesson, todayISO) {
    const d = lesson.date;
    const s = lesson.status;
    if (s === "missed") return { cls: "is-missed", label: "пропуск" };
    if (s === "cancelled") return { cls: "is-cancelled", label: "отменён" };
    if (s === "rescheduled") return { cls: "is-rescheduled", label: "перенесён" };
    if (s === "completed") return { cls: "is-completed", label: "✓ пройдено" };
    // planned
    if (d < todayISO) return { cls: "is-pending", label: "жду тему" };
    if (d === todayISO) return { cls: "is-today", label: "сегодня" };
    return { cls: "is-future", label: "запланирован" };
  }

  function _renderLessonsCard(student, opts) {
    opts = opts || {};
    const interactive = !!opts.interactive;
    const lessons = Array.isArray(student.lessons) ? student.lessons : [];
    if (!lessons.length) return "";

    const month = student.subscription_month || _currentMonthISO();
    const todayISO = _todayISO();
    const monthLessons = lessons
      .filter(l => l.date && l.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!monthLessons.length) return "";

    const rows = monthLessons.map(l => {
      const badge = _lessonStatusBadge(l, todayISO);
      const dateStr = _formatLessonDate(l.date);
      const dow = _dowFromISO(l.date);
      const num = l.num ? `<span class="cab-lesson-num">${_esc(l.num)}</span>` : "";
      const topicText = l.topic && l.topic.trim()
        ? `<span class="cab-lesson-topic">${_esc(l.topic)}</span>`
        : `<span class="cab-lesson-topic cab-lesson-topic--empty">—</span>`;
      const hw = l.homework;
      let hwChip = "";
      if (hw) {
        const hwStatus = _getHwStatus(student.id, l) || "pending";
        const isDone = hwStatus === "done";
        const chipDoneCls = isDone ? " is-done" : "";
        let chip = "";
        if (hw.module_url) {
          const title = hw.module_title || "Домашка";
          const tooltip = hw.text || "";
          chip = `<a class="cab-lesson-hw${chipDoneCls}" href="${_esc(hw.module_url)}" target="_blank" rel="noreferrer" title="${_esc(tooltip)}">→ ${_esc(title)}</a>`;
        } else if (hw.text) {
          chip = `<span class="cab-lesson-hw cab-lesson-hw--text${chipDoneCls}" title="${_esc(hw.text)}">📝 домашка</span>`;
        }
        const cbCls = "cab-hw-cb" + (isDone ? " is-done" : "") + (interactive ? "" : " is-readonly");
        const cbAttrs = interactive
          ? `role="checkbox" tabindex="0" aria-checked="${isDone}" data-action="toggle-hw" data-hw-date="${_esc(l.date)}" title="${isDone ? 'Сделано — клик чтобы отменить' : 'Отметить как сделанное'}"`
          : `role="img" aria-label="${isDone ? 'Домашка сделана' : 'Домашка ожидается'}" title="${isDone ? 'Домашка сделана' : 'Ожидается'}"`;
        const cbContent = isDone ? "✓" : "";
        hwChip = chip + `<span class="${cbCls}" ${cbAttrs}>${cbContent}</span>`;
      }
      return `
        <li class="cab-lesson-row ${badge.cls}">
          ${num}
          <span class="cab-lesson-date">${dateStr} · ${dow}</span>
          <span class="cab-lesson-topic-wrap">${topicText}${hwChip}</span>
          <span class="cab-lesson-badge">${badge.label}</span>
        </li>
      `;
    }).join("");

    return `
      <article class="cab-card cab-card--wide">
        <h3>Уроки · ${_esc(_monthLabelFromISO(month))}</h3>
        <ul class="cab-lessons-list">${rows}</ul>
      </article>
    `;
  }

  /* ---------- homework card (student view, 3rd module) ---------- */
  function _renderHomeworkCard(student) {
    const lessons = Array.isArray(student.lessons) ? student.lessons : [];
    const hwLessons = lessons.filter(l => l && l.homework);

    if (!hwLessons.length) {
      return `
        <article class="cab-card cab-card--homework">
          <h3>Домашка</h3>
          <div class="cab-hw-empty">
            <div class="cab-hw-empty-icon" aria-hidden="true">📭</div>
            <p class="cab-hw-empty-text">Сейчас ничего не задано. Когда учитель задаст — увидишь здесь.</p>
          </div>
        </article>
      `;
    }

    const enriched = hwLessons.map(l => ({
      lesson: l,
      isDone: _getHwStatus(student.id, l) === "done"
    }));
    enriched.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return b.lesson.date.localeCompare(a.lesson.date);
    });
    const pending = enriched.filter(e => !e.isDone);
    const done = enriched.filter(e => e.isDone);

    function _hwItem(e, compact) {
      const hw = e.lesson.homework || {};
      const dateStr = _formatLessonDate(e.lesson.date);
      const dow = _dowFromISO(e.lesson.date);
      const cbCls = "cab-hw-cb cab-hw-cb--big" + (e.isDone ? " is-done" : "");
      const cb = '<span class="' + cbCls + '" role="checkbox" tabindex="0"'
        + ' aria-checked="' + e.isDone + '"'
        + ' data-action="toggle-hw" data-hw-date="' + _esc(e.lesson.date) + '"'
        + ' title="' + (e.isDone ? 'Сделано — клик чтобы отменить' : 'Отметить как сделанное') + '">'
        + (e.isDone ? '✓' : '') + '</span>';
      const titleHtml = hw.module_title
        ? '<span class="cab-hw-title">' + _esc(hw.module_title) + '</span>'
        : '';
      const textHtml = !compact && hw.text
        ? '<p class="cab-hw-task">' + _esc(hw.text) + '</p>'
        : '';
      const btnLabel = hw.module_title || "Открыть в Лаборатории";
      const btnHtml = !compact && hw.module_url
        ? '<a class="cab-action-btn cab-action-btn--primary cab-hw-link"'
          + ' href="' + _esc(hw.module_url) + '" target="_blank" rel="noreferrer">'
          + '🚀 ' + _esc(btnLabel) + '</a>'
        : '';
      return '<div class="cab-hw-item' + (e.isDone ? ' is-done' : '')
        + (compact ? ' cab-hw-item--compact' : '') + '">'
        + '<div class="cab-hw-head">'
        + '<div class="cab-hw-info">'
        + '<span class="cab-hw-date">' + dateStr + ' · ' + dow + '</span>'
        + titleHtml
        + '</div>'
        + cb
        + '</div>'
        + textHtml
        + btnHtml
        + '</div>';
    }

    const pendingHtml = pending.length
      ? pending.slice(0, 3).map(e => _hwItem(e, false)).join("")
      : '<p class="cab-hw-allgreen">🎉 Все домашки сделаны — молодец!</p>';

    const doneHtml = done.length
      ? '<details class="cab-hw-done-list">'
        + '<summary>Раньше сделано · ' + done.length + '</summary>'
        + done.slice(0, 5).map(e => _hwItem(e, true)).join("")
        + '</details>'
      : "";

    const badge = pending.length
      ? ' <span class="cab-hw-badge">' + pending.length + '</span>'
      : '';

    return `
      <article class="cab-card cab-card--homework">
        <h3>Домашка${badge}</h3>
        ${pendingHtml}
        ${doneHtml}
      </article>
    `;
  }

  /* ---------- homework checkbox wireup ---------- */
  function _wireHomeworkCheckboxes(container, student) {
    if (!container || !student) return;
    container.querySelectorAll('[data-action="toggle-hw"]').forEach(el => {
      const toggle = () => {
        const date = el.dataset.hwDate;
        if (!date) return;
        const current = _getHwStatus(student.id, { date, homework: { status: "pending" } });
        const next = current === "done" ? "pending" : "done";
        _setHwStatus(student.id, date, next);
        const isDone = next === "done";
        el.classList.toggle("is-done", isDone);
        el.setAttribute("aria-checked", String(isDone));
        el.textContent = isDone ? "✓" : "";
        el.setAttribute("title", isDone ? "Сделано — клик чтобы отменить" : "Отметить как сделанное");
        const row = el.closest(".cab-lesson-row");
        const chip = row && row.querySelector(".cab-lesson-hw");
        if (chip) chip.classList.toggle("is-done", isDone);
      };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); toggle(); }
      });
    });
  }

  /* ---------- render: parent view ---------- */

  function _renderAbonementCard(student, opts) {
    opts = opts || {};
    const studentView = !!opts.studentView; // в кабинете ребёнка — скрываем цены и статус оплаты
    const total = student.lessons_in_package;
    const used = student.lessons_used_this_month || 0;
    const remaining = total ? Math.max(total - used, 0) : null;
    const month = student.subscription_month || _currentMonthLabel();
    const pkg = student.monthly_package;
    const pricePer = student.price_per_lesson;

    if (!total && !pkg && !pricePer) return "";

    const progressPct = total ? Math.min(Math.round((used / total) * 100), 100) : 0;

    return `
      <article class="cab-card cab-abonement">
        <h3>Абонемент · ${_esc(month)}</h3>
        ${total ? `
          <div class="cab-abonement-progress">
            <div class="cab-abonement-bar">
              <div class="cab-abonement-fill" style="width: ${progressPct}%;"></div>
            </div>
            <div class="cab-abonement-count">
              <span class="cab-abonement-used">${_esc(used)}</span>
              <span class="cab-abonement-of">из</span>
              <span class="cab-abonement-total">${_esc(total)}</span>
              <span class="cab-abonement-label">уроков</span>
            </div>
          </div>
          ${remaining !== null ? `<div class="cab-card-row"><span class="cab-row-label">Осталось</span><span class="cab-row-value"><b>${remaining}</b> ${remaining === 1 ? "урок" : (remaining < 5 && remaining > 1 ? "урока" : "уроков")}</span></div>` : ""}
        ` : ""}
        ${!studentView && pricePer ? `<div class="cab-card-row"><span class="cab-row-label">Цена занятия</span><span class="cab-row-value">${_esc(pricePer)} ₽</span></div>` : ""}
        ${!studentView && pkg ? `<div class="cab-card-row"><span class="cab-row-label">Стоимость пакета</span><span class="cab-row-value"><b>${_esc(pkg)} ₽</b></span></div>` : ""}
        <div class="cab-card-row"><span class="cab-row-label">Расписание</span><span class="cab-row-value">${_esc(student.schedule || "—")}</span></div>
        ${!studentView && student.payment_status ? `<div class="cab-card-row"><span class="cab-row-label">Статус</span><span class="cab-row-value">${_esc(student.payment_status)}</span></div>` : ""}
      </article>
    `;
  }

  function _prettifyContractFilename(filename) {
    // "01_договор_стр1.jpeg" → "Договор · стр.1"
    return filename
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/^\d+_/, "")
      .replace(/_/g, " ")
      .replace(/\bстр(\d+)\b/g, "стр.$1")
      .replace(/\bПД\b/g, "ПД")
      .replace(/^[а-яё]/i, c => c.toUpperCase());
  }

  function _renderContractFiles(data) {
    const items = (data.files || []).map(f => {
      const url = `./${data.folder}/${f}`;
      const label = _prettifyContractFilename(f);
      const ext = (f.split(".").pop() || "").toLowerCase();
      const isImg = ["jpg", "jpeg", "png", "webp", "gif"].indexOf(ext) >= 0;
      if (isImg) {
        return `<a href="${_esc(url)}" target="_blank" rel="noreferrer" class="cab-contract-thumb"><img src="${_esc(url)}" alt="${_esc(label)}" loading="lazy"><span>${_esc(label)}</span></a>`;
      }
      return `<a href="${_esc(url)}" target="_blank" rel="noreferrer" class="cab-contract-link">📄 ${_esc(label)}</a>`;
    }).join("");
    return `<div class="cab-contract-files">${items}</div>`;
  }

  function _renderContractsCard(student) {
    const allContracts = (window.NGE_DATA && window.NGE_DATA.contracts) || {};
    const contracts = allContracts[student.id];
    if (!contracts) return "";

    if (contracts.byParent) {
      // Pair: render section per parent (each mom sees her own + partner's)
      let inner = "";
      Object.keys(contracts.byParent).forEach(parentName => {
        const data = contracts.byParent[parentName];
        const child = data.child ? ` · ${data.child}` : "";
        inner += `<div class="cab-contract-section"><div class="cab-contract-parent">${_esc(parentName)}${_esc(child)}</div>${_renderContractFiles(data)}</div>`;
      });
      return `<article class="cab-card"><h3>📄 Договоры</h3><p class="cab-card-note">Подписанные документы хранятся для прозрачности. Клик по странице — открыть в полный размер.</p>${inner}</article>`;
    }

    const noteHtml = contracts.note ? `<p class="cab-card-note">${_esc(contracts.note)}</p>` : "";
    return `<article class="cab-card"><h3>📄 Договор</h3><p class="cab-card-note">Подписанные документы хранятся для прозрачности. Клик по странице — открыть в полный размер.</p>${noteHtml}${_renderContractFiles(contracts)}</article>`;
  }

  function renderParent(container, student) {
    if (!student) {
      container.innerHTML = "<p>Данные не найдены.</p>";
      return;
    }
    const payment = (window.NGE_DATA && window.NGE_DATA.payment) || {};
    const currentMonth = _currentMonthLabel();

    container.innerHTML = `
      <div class="cab-hero">
        <h1>${_esc(_greetingForParent(student))}</h1>
        <p class="cab-hero-sub">Кабинет родителя · обзор обучения ${_esc(student.name)}</p>
      </div>

      <div class="cab-grid">
        <article class="cab-card">
          <h3>Ученик</h3>
          <div class="cab-card-row"><span class="cab-row-label">Имя</span><span class="cab-row-value">${_esc(student.name)}</span></div>
          ${student.level ? `<div class="cab-card-row"><span class="cab-row-label">Уровень</span><span class="cab-row-value">${_esc(student.level)}</span></div>` : ""}
          ${student.format ? `<div class="cab-card-row"><span class="cab-row-label">Формат</span><span class="cab-row-value">${_esc(student.format)}</span></div>` : ""}
          ${student.goal ? `<div class="cab-card-row"><span class="cab-row-label">Цель</span><span class="cab-row-value">${_esc(student.goal)}</span></div>` : ""}
        </article>

        ${_renderAbonementCard(student)}

        ${_renderReportsCard(student, (window.NGE_DATA && window.NGE_DATA.reports) || [], payment)}

        <article class="cab-card">
          <h3>Оплата</h3>
          ${student.price_per_lesson ? `<div class="cab-card-row"><span class="cab-row-label">Цена занятия</span><span class="cab-row-value">${_esc(student.price_per_lesson)} ₽</span></div>` : ""}
          ${student.weekly_revenue ? `<div class="cab-card-row"><span class="cab-row-label">В неделю</span><span class="cab-row-value">${_esc(student.weekly_revenue)} ₽</span></div>` : ""}
          ${student.payment_status ? `<div class="cab-card-row"><span class="cab-row-label">Статус</span><span class="cab-row-value">${_esc(student.payment_status)}</span></div>` : ""}
          <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
            ${payment.tinkoffQuickPay ? `<a class="cab-action-btn cab-action-btn--primary" href="${_esc(payment.tinkoffQuickPay)}" target="_blank" rel="noreferrer">Оплатить через Т-Банк</a>` : ""}
            ${payment.telegram ? `<a class="cab-action-btn cab-action-btn--ghost" href="${_esc(payment.telegram)}" target="_blank" rel="noreferrer">Я оплатил(а) — написать Марии</a>` : ""}
            <button class="cab-action-btn cab-action-btn--text" type="button" data-action="toggle-bank-details">Перевод по реквизитам ▾</button>
          </div>
          <div class="cab-bank-details" style="display:none;">
            ${payment.recipient ? `<div class="cab-card-row"><span class="cab-row-label">Получатель</span><span class="cab-row-value">${_esc(payment.recipient)}</span></div>` : ""}
            ${payment.bank ? `<div class="cab-card-row"><span class="cab-row-label">Банк</span><span class="cab-row-value">${_esc(payment.bank)}</span></div>` : ""}
            ${payment.account ? `<div class="cab-card-row"><span class="cab-row-label">Счёт</span><span class="cab-row-value"><code>${_esc(payment.account)}</code></span></div>` : ""}
            ${payment.bik ? `<div class="cab-card-row"><span class="cab-row-label">БИК</span><span class="cab-row-value"><code>${_esc(payment.bik)}</code></span></div>` : ""}
            ${payment.inn ? `<div class="cab-card-row"><span class="cab-row-label">ИНН</span><span class="cab-row-value"><code>${_esc(payment.inn)}</code></span></div>` : ""}
            ${payment.phone ? `<div class="cab-card-row"><span class="cab-row-label">Телефон СБП</span><span class="cab-row-value"><code>${_esc(payment.phone)}</code></span></div>` : ""}
            ${payment.purpose ? `<div class="cab-card-row"><span class="cab-row-label">Назначение</span><span class="cab-row-value" style="font-size:11px;line-height:1.45;">${_esc(payment.purpose)}</span></div>` : ""}
          </div>
        </article>

        ${_renderContractsCard(student)}

        ${_renderLessonsCard(student, { interactive: false })}
      </div>

      <p class="cab-mvp-note">
        После оплаты обязательно напишите Марии в Telegram — она подтвердит и обновит остаток занятий.
      </p>
    `;

    // Wire up the dynamic buttons
    container.querySelectorAll('[data-action="open-report"]').forEach(btn => {
      btn.addEventListener("click", () => openPrintableReport(btn.dataset.student, btn.dataset.report));
    });
    container.querySelectorAll('[data-action="toggle-bank-details"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const details = container.querySelector(".cab-bank-details");
        if (!details) return;
        const isOpen = details.style.display !== "none";
        details.style.display = isOpen ? "none" : "block";
        btn.textContent = isOpen ? "Перевод по реквизитам ▾" : "Перевод по реквизитам ▴";
      });
    });
  }

  /* ---------- printable report ---------- */

  function _currentMonthLabel() {
    const months = ["январь", "февраль", "март", "апрель", "май", "июнь",
                    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
    const d = new Date();
    return months[d.getMonth()] + " " + d.getFullYear();
  }

  function _monthLabelFromISO(monthISO) {
    if (!monthISO) return _currentMonthLabel();
    const months = ["январь", "февраль", "март", "апрель", "май", "июнь",
                    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
    const [y, m] = monthISO.split("-");
    const idx = parseInt(m, 10) - 1;
    return (months[idx] || "") + " " + y;
  }

  // Inline markdown: **bold** → <strong>. Run AFTER _esc — input is already HTML-safe.
  function _inlineBold(text) {
    return text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  // Very small markdown → HTML (headings, bullets, paragraphs, inline bold)
  function _mdToHtml(md) {
    if (!md) return "";
    const lines = md.split(/\r?\n/);
    let html = "";
    let inList = false;
    for (let raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (inList) { html += "</ul>"; inList = false; }
        continue;
      }
      if (line.startsWith("# ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h3>${_inlineBold(_esc(line.slice(2)))}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h4>${_inlineBold(_esc(line.slice(3)))}</h4>`;
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${_inlineBold(_esc(line.slice(2)))}</li>`;
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<p>${_inlineBold(_esc(line))}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function _renderReportsCard(student, reports, payment) {
    /* Родителю показываем ТОЛЬКО отчёты со статусом "sent".
       Драфты ("ready to send", "source imported", "draft") видит только учитель в Notion. */
    const studentReports = reports.filter(r =>
      r.student_id === student.id &&
      (r.status === "sent" || r.report_status === "sent")
    );
    const currentMonth = _currentMonthLabel();

    if (studentReports.length === 0) {
      return `
        <article class="cab-card">
          <h3>Отчёты</h3>
          <div class="cab-card-row"><span class="cab-row-label">${_esc(currentMonth)}</span><span class="cab-row-value">в работе</span></div>
          <p style="margin: 12px 0 14px; font-size: 12px; line-height: 1.55; color: var(--text-3);">
            Методический отчёт за ${_esc(currentMonth)} готовит преподаватель. Когда он будет готов — здесь появится кнопка «📄 Скачать отчёт». Уведомление придёт в Telegram.
          </p>
          <a class="cab-action-btn cab-action-btn--ghost" href="${_esc(payment.telegram || "")}" target="_blank" rel="noreferrer">💬 Написать Марии</a>
        </article>
      `;
    }

    const rows = studentReports.map(r => `
      <div class="cab-report-row">
        <div>
          <div class="cab-report-title">${_esc(r.title || r.type)}</div>
          <div class="cab-report-meta">${_esc(r.month_label || r.month || "")} · ${_esc(r.type || "")}</div>
        </div>
        <button class="cab-action-btn cab-action-btn--primary" type="button" data-action="open-report" data-student="${_esc(student.id)}" data-report="${_esc(r.id)}">📄 Скачать отчёт</button>
      </div>
    `).join("");

    return `
      <article class="cab-card">
        <h3>Отчёты</h3>
        ${rows}
        <p style="margin-top: 12px; font-size: 11.5px; color: var(--text-3); line-height: 1.55;">
          Кнопка откроет отчёт в новом окне в формате PDF. Для сохранения: <kbd>Ctrl/⌘ + P</kbd> → «Сохранить как PDF».
        </p>
      </article>
    `;
  }

  async function openPrintableReport(studentId, reportId) {
    const student = await getStudentById(studentId);
    if (!student) return;
    const teacher = (window.NGE_DATA && window.NGE_DATA.teacher && window.NGE_DATA.teacher.name) || "Мария Витальевна Бурцева";
    const date = new Date().toLocaleDateString("ru-RU");
    const allReports = (window.NGE_DATA && window.NGE_DATA.reports) || [];
    const report = reportId ? allReports.find(r => r.id === reportId) : null;
    const monthLabel = (report && (report.month_label || report.month)) || _currentMonthLabel();

    const reportBody = report ? _mdToHtml(report.content || "") : `
      <p><em>Методический отчёт за ${_esc(monthLabel)} ещё в работе. Это техническая выгрузка профиля.</em></p>
    `;

    const reportType = report && report.type === "student report" ? "Student" : "Parent";
    const kicker = "Monthly Report · " + reportType;
    const heroTitle = student.name;
    const heroSub = report
      ? `Отчёт о занятиях за ${_esc(monthLabel)}`
      : `Профиль · ${_esc(monthLabel)}`;

    const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<title>${_esc(report ? report.title : "Отчёт")} — ${_esc(student.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:#f4f1ec; --paper:#fff; --paper-2:#faf8f4;
    --line:rgba(26,22,18,0.10);
    --text:#1a1612; --text-2:#6b6560; --text-3:#9c948b;
    --accent:#FF5A1F; --accent-2:#FFC145;
    --display:"Unbounded","Manrope",system-ui,sans-serif;
    --body:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;
    --mono:"JetBrains Mono",ui-monospace,monospace;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{font-family:var(--body);background:var(--bg);color:var(--text);line-height:1.65;font-size:14px;-webkit-font-smoothing:antialiased;}
  .doc{background:var(--paper);max-width:760px;margin:48px auto;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.10);overflow:hidden;}
  .doc-hero{background:var(--paper-2);padding:36px 56px 28px;border-bottom:1px solid var(--line);position:relative;}
  .doc-hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--accent) 0%,var(--accent) 60%,var(--accent-2) 100%);}
  .brand-strip{display:flex;align-items:center;gap:14px;margin-bottom:24px;}
  .brand-mark{width:38px;height:38px;display:grid;place-items:center;background:var(--accent);color:#0b0b0c;font-family:var(--display);font-weight:800;font-size:20px;border-radius:9px;border-top-right-radius:0;letter-spacing:-0.04em;position:relative;overflow:hidden;}
  .brand-mark::after{content:"";position:absolute;right:0;top:0;width:14px;height:14px;background:#fff;clip-path:polygon(100% 0, 0 0, 100% 100%);}
  .brand-copy{display:grid;gap:2px;min-width:0;}
  .brand-name{font-family:var(--display);font-weight:800;font-size:14px;letter-spacing:-0.005em;line-height:1;}
  .brand-tag{font-family:var(--mono);font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-2);}
  .doc-kicker{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:var(--accent);margin:0 0 8px;font-weight:700;}
  .doc-title{font-family:var(--display);font-weight:800;font-size:30px;line-height:1.15;letter-spacing:-0.02em;margin:0 0 6px;color:var(--text);}
  .doc-sub{color:var(--text-2);font-size:13.5px;margin:0;}
  .doc-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px 22px;padding:22px 56px;border-bottom:1px solid var(--line);background:var(--paper);font-size:12px;}
  .meta-item{display:flex;flex-direction:column;gap:3px;}
  .meta-label{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:var(--text-3);font-weight:600;}
  .meta-value{color:var(--text);font-weight:500;font-size:13px;}
  .doc-body{padding:36px 56px 40px;}
  .doc-body>p:first-child{font-size:15px;margin-top:0;}
  .doc-body p{margin:10px 0;}
  .doc-body h3{font-family:var(--display);font-weight:700;font-size:16px;letter-spacing:-0.01em;margin:30px 0 12px;padding-left:14px;border-left:3px solid var(--accent);line-height:1.3;}
  .doc-body h4{font-family:var(--display);font-weight:600;font-size:14px;margin:20px 0 8px;color:var(--text-2);}
  .doc-body ul{margin:8px 0 16px 0;padding:0;list-style:none;}
  .doc-body li{position:relative;padding:4px 0 4px 22px;font-size:14px;line-height:1.6;}
  .doc-body li::before{content:"";position:absolute;left:4px;top:14px;width:6px;height:6px;background:var(--accent);border-radius:50%;}
  .doc-body strong{color:var(--text);font-weight:700;}
  .doc-body em{color:var(--text-2);font-style:italic;}
  .doc-footer{background:var(--paper-2);padding:22px 56px 26px;border-top:1px solid var(--line);font-size:12px;color:var(--text-2);}
  .doc-sig{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
  .doc-sig-mark{width:26px;height:26px;display:grid;place-items:center;background:var(--accent);color:#0b0b0c;font-family:var(--display);font-weight:800;font-size:14px;border-radius:6px;border-top-right-radius:0;letter-spacing:-0.04em;}
  .doc-sig-name{font-family:var(--display);font-weight:700;color:var(--text);font-size:13px;}
  .doc-footer-note{margin:0;font-size:11px;color:var(--text-3);line-height:1.6;}
  @media print{body{background:#fff;}.doc{box-shadow:none;margin:0;max-width:none;}.doc-hero,.doc-meta,.doc-body,.doc-footer{padding-left:14mm;padding-right:14mm;}}
</style>
</head><body>
<div class="doc">
  <div class="doc-hero">
    <div class="brand-strip">
      <div class="brand-mark">N</div>
      <div class="brand-copy">
        <div class="brand-name">NEW GENERATION ENGLISH</div>
        <div class="brand-tag">Maria · Personal Tutor</div>
      </div>
    </div>
    <div class="doc-kicker">${_esc(kicker)}</div>
    <h1 class="doc-title">${_esc(heroTitle)}</h1>
    <p class="doc-sub">${heroSub}</p>
  </div>

  <div class="doc-meta">
    ${report ? `<div class="meta-item"><span class="meta-label">Месяц</span><span class="meta-value">${_esc(monthLabel)}</span></div>` : ""}
    ${student.level ? `<div class="meta-item"><span class="meta-label">Уровень</span><span class="meta-value">${_esc(student.level)}</span></div>` : ""}
    ${student.format ? `<div class="meta-item"><span class="meta-label">Формат</span><span class="meta-value">${_esc(student.format)}</span></div>` : ""}
    ${student.schedule ? `<div class="meta-item"><span class="meta-label">Расписание</span><span class="meta-value">${_esc(student.schedule)}</span></div>` : ""}
    ${report && report.recipient ? `<div class="meta-item"><span class="meta-label">Кому</span><span class="meta-value">${_esc(report.recipient)}</span></div>` : ""}
  </div>

  <div class="doc-body">${reportBody}</div>

  <div class="doc-footer">
    <div class="doc-sig">
      <div class="doc-sig-mark">N</div>
      <div class="doc-sig-name">${_esc(teacher)}</div>
    </div>
    <p class="doc-footer-note">New Generation English · Личный кабинет · Источник — Notion (Monthly Reports). Готово к печати: Ctrl/⌘ + P → «Сохранить как PDF». ${_esc(date)}</p>
  </div>
</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  /* ---------- topbar helpers ---------- */

  function wireSignOutButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) btn.addEventListener("click", signOut);
  }

  /* ---------- expose ---------- */

  window.NGECabinet = {
    loadData,
    getSession,
    setSession,
    clearSession,
    signOut,
    tryLogin,
    requireSession,
    requireStudentViewSession,
    getStudentById,
    getAllStudents,
    getReportsForStudent,
    getDrafts,
    getDraftForStudent,
    saveDraft,
    deleteDraft,
    getReportOrDraft,
    renderStudent,
    renderTeacher,
    renderParent,
    wireSignOutButton,
  };
})();
