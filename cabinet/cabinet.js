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

  /* ---------- render: student view ---------- */

  function _esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
        <h1>Привет, ${_esc(student.name.split(" ")[0])}</h1>
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

        <article class="cab-card">
          <h3>Расписание</h3>
          <div class="cab-card-row"><span class="cab-row-label">Дни и время</span><span class="cab-row-value">${_esc(student.schedule || "—")}</span></div>
          ${student.lessons_per_week ? `<div class="cab-card-row"><span class="cab-row-label">Раз в неделю</span><span class="cab-row-value">${_esc(student.lessons_per_week)}</span></div>` : ""}
        </article>

        ${_renderLessonsCard(student, { interactive: true })}
      </div>

      <p class="cab-mvp-note">Это MVP-версия кабинета. Расширенные функции (домашка, отчёты, тренажёры) добавляются постепенно.</p>
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

  function renderTeacher(container, students) {
    const grid = _buildScheduleGrid(students);
    const totalSlots = Object.values(grid).reduce((sum, day) => sum + day.length, 0);
    const reports = (window.NGE_DATA && window.NGE_DATA.reports) || [];
    const currentMonth = _currentMonthKey();

    // Оповещалки
    const unpaid = students.filter(s => !s.payment_status || s.payment_status === "" || s.payment_status === "Не выставлено" || s.payment_status === "Ожидает");
    const noReport = students.filter(s => !reports.some(r => r.student_id === s.id && r.month === currentMonth));
    const nextLesson = _computeNextLesson(students);

    const unpaidHtml = unpaid.length
      ? `<div class="cab-alert-num">${unpaid.length}</div>
         <div class="cab-alert-list">${unpaid.slice(0, 5).map(s => `<span>${_esc(s.name)}</span>`).join(", ")}${unpaid.length > 5 ? " + ещё " + (unpaid.length - 5) : ""}</div>`
      : `<div class="cab-alert-num">✓</div><div class="cab-alert-list">все оплачено</div>`;

    const nextLessonHtml = nextLesson
      ? `<div class="cab-alert-num">${_esc(_DAY_SHORT[nextLesson.dayNum])} ${_esc(nextLesson.time)}</div>
         <div class="cab-alert-list">${_esc(nextLesson.studentName)} · ${_esc(_humanDelta(nextLesson.deltaMins))}</div>`
      : `<div class="cab-alert-num">—</div><div class="cab-alert-list">нет занятий с временем</div>`;

    const noReportHtml = noReport.length
      ? `<div class="cab-alert-num">${noReport.length}</div>
         <div class="cab-alert-list">${noReport.slice(0, 5).map(s => `<span>${_esc(s.name)}</span>`).join(", ")}${noReport.length > 5 ? " + ещё " + (noReport.length - 5) : ""}</div>`
      : `<div class="cab-alert-num">✓</div><div class="cab-alert-list">все отчёты есть</div>`;

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

    const rows = students.map(s => `
      <tr>
        <td>${_esc(s.name)}</td>
        <td>${_esc(s.level || "—")}</td>
        <td>${_esc(s.format || "—")}</td>
        <td>${_esc(s.schedule || "—")}</td>
        <td>${_esc(s.parent_name || (s.is_adult ? "взрослый" : "—"))}</td>
        <td>${s.price_per_lesson ? _esc(s.price_per_lesson) + " ₽" : "—"}</td>
        <td>${_esc(s.payment_status || "Не выставлено")}</td>
        <td><code>${_esc(s.pin)}</code></td>
        <td style="white-space: nowrap;">
          <a class="cab-preview-link" href="./student.html?student=${_esc(s.id)}" target="_blank" title="Открыть кабинет ученика">🎓</a>
          <a class="cab-preview-link" href="./parent.html?student=${_esc(s.id)}" target="_blank" title="Открыть кабинет родителя">👪</a>
          <button class="cab-preview-link cab-add-lesson-btn" type="button" data-student-id="${_esc(s.id)}" data-student-name="${_esc(s.name)}" data-lessons-used="${_esc(s.lessons_used_this_month || 0)}" title="Записать урок">➕</button>
        </td>
      </tr>
    `).join("");

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
        <article class="cab-alert cab-alert--report">
          <div class="cab-alert-head"><span class="cab-alert-icon">📝</span><h4>Нет отчёта за этот месяц</h4></div>
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
                <th>Уровень</th>
                <th>Формат</th>
                <th>Расписание</th>
                <th>Родитель</th>
                <th>Цена</th>
                <th>Оплата</th>
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
            <label class="cab-lesson-full">Lab-модуль (ссылка) <input type="text" name="hwUrl" placeholder="../lingua-boost-lab/b1/word-building-prefixes-and-suffixes.html"></label>
            <label class="cab-lesson-full">Lab-модуль (название) <input type="text" name="hwTitle" placeholder="Word Building"></label>
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
    `;

    // Wire up "Запись урока" buttons
    const dialog = container.querySelector("#lessonDialog");
    const nameEl = container.querySelector("#lessonStudentName");
    const dateEl = container.querySelector("#lessonDate");
    const lessonNumEl = container.querySelector("input[name='lessonNum']");
    const form = container.querySelector("#lessonForm");
    const hint = container.querySelector("#lessonHint");

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
      const md =
        `📝 Запись урока (для Claude → Lesson Log):\n` +
        `- ученик: ${sname} (id: ${sid})\n` +
        `- дата: ${data.get("date")}\n` +
        `- статус: ${data.get("status")}\n` +
        `- тема: ${data.get("topic")}\n` +
        `- активности: ${data.get("activities") || "—"}\n` +
        `- что прошли: ${data.get("covered") || "—"}\n` +
        `- домашка (текст): ${data.get("homework") || "—"}\n` +
        `- домашка (Lab url): ${data.get("hwUrl") || "—"}\n` +
        `- домашка (Lab название): ${data.get("hwTitle") || "—"}\n` +
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

  function _renderAbonementCard(student) {
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
        ${pricePer ? `<div class="cab-card-row"><span class="cab-row-label">Цена занятия</span><span class="cab-row-value">${_esc(pricePer)} ₽</span></div>` : ""}
        ${pkg ? `<div class="cab-card-row"><span class="cab-row-label">Стоимость пакета</span><span class="cab-row-value"><b>${_esc(pkg)} ₽</b></span></div>` : ""}
        <div class="cab-card-row"><span class="cab-row-label">Расписание</span><span class="cab-row-value">${_esc(student.schedule || "—")}</span></div>
        ${student.payment_status ? `<div class="cab-card-row"><span class="cab-row-label">Статус</span><span class="cab-row-value">${_esc(student.payment_status)}</span></div>` : ""}
      </article>
    `;
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
        <h1>Кабинет родителя</h1>
        <p class="cab-hero-sub">Обзор обучения · ${_esc(student.name)}</p>
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

        ${_renderLessonsCard(student, { interactive: false })}
      </div>

      <p class="cab-mvp-note">
        После оплаты обязательно напишите Марии в Telegram — она подтвердит и обновит остаток занятий.
        <br><br>
        Это MVP-версия. Автоматическое подтверждение оплаты, история чеков и расширенные PDF-отчёты — в следующих версиях.
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
          <div class="cab-card-row"><span class="cab-row-label">${_esc(currentMonth)}</span><span class="cab-row-value">отчёт пока не загружен</span></div>
          <p style="margin: 12px 0 14px; font-size: 12px; line-height: 1.55; color: var(--text-3);">
            Методический отчёт за ${_esc(currentMonth)} ещё в работе. Напишите Марии, чтобы получить его быстрее.
          </p>
          <a class="cab-action-btn cab-action-btn--ghost" href="${_esc(payment.telegram || "")}" target="_blank" rel="noreferrer">Запросить отчёт у Марии</a>
        </article>
      `;
    }

    const rows = studentReports.map(r => `
      <div class="cab-report-row">
        <div>
          <div class="cab-report-title">${_esc(r.title || r.type)}</div>
          <div class="cab-report-meta">${_esc(r.month_label || r.month || "")} · ${_esc(r.type || "")}</div>
        </div>
        <button class="cab-action-btn" type="button" data-action="open-report" data-student="${_esc(student.id)}" data-report="${_esc(r.id)}">Открыть</button>
      </div>
    `).join("");

    return `
      <article class="cab-card">
        <h3>Отчёты</h3>
        ${rows}
        <p style="margin-top: 12px; font-size: 11.5px; color: var(--text-3); line-height: 1.55;">
          Откроется страница, готовая к печати: <kbd>Ctrl/⌘ + P</kbd> → «Сохранить как PDF».
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
      <h3>Отчёт пока не загружен</h3>
      <p>Методический отчёт за ${_esc(monthLabel)} ещё в работе. Это техническая выгрузка профиля.</p>
    `;

    const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<title>${_esc(report ? report.title : "Отчёт")} — ${_esc(student.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Manrope, Arial, sans-serif;
    margin: 40px auto; max-width: 720px; padding: 0 24px; color: #1a1612; line-height: 1.65; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #6b6560; margin-bottom: 28px; font-size: 13px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em;
    color: #FF5A1F; margin: 24px 0 8px; }
  h3 { font-size: 17px; margin: 22px 0 10px; color: #1a1612; }
  h4 { font-size: 14px; margin: 16px 0 8px; color: #1a1612; }
  p  { margin: 8px 0; font-size: 14px; }
  ul { margin: 6px 0 12px 20px; padding: 0; }
  li { margin: 4px 0; font-size: 14px; }
  .meta { display: flex; flex-wrap: wrap; gap: 14px; padding: 12px 0;
    border-top: 1px solid rgba(0,0,0,0.08); border-bottom: 1px solid rgba(0,0,0,0.08);
    margin: 0 0 24px; font-size: 12px; color: #6b6560; }
  .meta b { color: #1a1612; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.08);
    color: #6b6560; font-size: 12px; line-height: 1.7; }
  .footer .sig { font-weight: 600; color: #1a1612; margin-top: 6px; }
  @media print { body { margin: 18mm; padding: 0; max-width: none; } }
</style>
</head><body>
<h1>${_esc(report ? report.title : "Отчёт")}</h1>
<div class="sub">New Generation English · ${_esc(student.name)}${student.level ? " · " + _esc(student.level) : ""}</div>

<div class="meta">
  <span><b>Ученик:</b> ${_esc(student.name)}</span>
  ${student.format ? `<span><b>Формат:</b> ${_esc(student.format)}</span>` : ""}
  ${student.schedule ? `<span><b>Расписание:</b> ${_esc(student.schedule)}</span>` : ""}
  ${report ? `<span><b>Месяц:</b> ${_esc(monthLabel)}</span>` : ""}
  ${report && report.recipient ? `<span><b>Кому:</b> ${_esc(report.recipient)}</span>` : ""}
</div>

${reportBody}

<div class="footer">
  <p>Выгрузка из кабинета на ${_esc(date)}. Источник — рабочая база Notion (Monthly Reports).</p>
  <p class="sig">${_esc(teacher)}</p>
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
    renderStudent,
    renderTeacher,
    renderParent,
    wireSignOutButton,
  };
})();
