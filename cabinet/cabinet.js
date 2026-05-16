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
  const DATA_URL = "./data.json";

  let _dataCache = null;

  async function loadData() {
    if (_dataCache) return _dataCache;
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Не удалось загрузить data.json");
    _dataCache = await res.json();
    return _dataCache;
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

  function signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
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

    // 4-digit PIN → student or parent
    if (/^\d{4}$/.test(trimmed)) {
      const student = data.students.find(s => s.pin === trimmed);
      if (student) {
        return { role: "student", studentId: student.id, name: student.name };
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

        <article class="cab-card">
          <h3>Оплата</h3>
          ${student.price_per_lesson ? `<div class="cab-card-row"><span class="cab-row-label">Стоимость занятия</span><span class="cab-row-value">${_esc(student.price_per_lesson)} ₽</span></div>` : ""}
          ${student.weekly_revenue ? `<div class="cab-card-row"><span class="cab-row-label">В неделю</span><span class="cab-row-value">${_esc(student.weekly_revenue)} ₽</span></div>` : ""}
          ${student.payment_status ? `<div class="cab-card-row"><span class="cab-row-label">Статус</span><span class="cab-row-value">${_esc(student.payment_status)}</span></div>` : ""}
        </article>
      </div>

      <p class="cab-mvp-note">Это MVP-версия кабинета. Расширенные функции (история уроков, домашка, отчёты, тренажёры) добавляются постепенно.</p>
    `;
  }

  /* ---------- render: teacher table ---------- */

  function renderTeacher(container, students) {
    const rows = students.map(s => `
      <tr>
        <td>${_esc(s.name)}</td>
        <td>${_esc(s.level || "—")}</td>
        <td>${_esc(s.format || "—")}</td>
        <td>${_esc(s.schedule || "—")}</td>
        <td>${s.price_per_lesson ? _esc(s.price_per_lesson) + " ₽" : "—"}</td>
        <td>${_esc(s.payment_status || "—")}</td>
        <td><code>${_esc(s.pin)}</code></td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="cab-hero">
        <h1>Кабинет преподавателя</h1>
        <p class="cab-hero-sub">${students.length} активных учеников</p>
      </div>

      <article class="cab-card">
        <h3>Ученики</h3>
        <div class="cab-table-wrap">
          <table class="cab-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Уровень</th>
                <th>Формат</th>
                <th>Расписание</th>
                <th>Цена</th>
                <th>Оплата</th>
                <th>PIN</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>

      <p class="cab-mvp-note">MVP-версия. Колонка PIN — для передачи ученику/родителю в Telegram (не показывать им на этой странице на людях). Редактирование данных — в Notion; этот кабинет читает snapshot.</p>
    `;
  }

  /* ---------- render: parent view ---------- */

  function renderParent(container, student) {
    if (!student) {
      container.innerHTML = "<p>Данные не найдены.</p>";
      return;
    }
    container.innerHTML = `
      <div class="cab-hero">
        <h1>Кабинет родителя</h1>
        <p class="cab-hero-sub">Краткий обзор обучения</p>
      </div>

      <div class="cab-grid">
        <article class="cab-card">
          <h3>Ученик</h3>
          <div class="cab-card-row"><span class="cab-row-label">Имя</span><span class="cab-row-value">${_esc(student.name)}</span></div>
          ${student.level ? `<div class="cab-card-row"><span class="cab-row-label">Уровень</span><span class="cab-row-value">${_esc(student.level)}</span></div>` : ""}
          ${student.goal ? `<div class="cab-card-row"><span class="cab-row-label">Цель</span><span class="cab-row-value">${_esc(student.goal)}</span></div>` : ""}
        </article>

        <article class="cab-card">
          <h3>Расписание</h3>
          <div class="cab-card-row"><span class="cab-row-label">Когда</span><span class="cab-row-value">${_esc(student.schedule || "—")}</span></div>
          ${student.format ? `<div class="cab-card-row"><span class="cab-row-label">Формат</span><span class="cab-row-value">${_esc(student.format)}</span></div>` : ""}
        </article>

        <article class="cab-card">
          <h3>Оплата</h3>
          ${student.price_per_lesson ? `<div class="cab-card-row"><span class="cab-row-label">Стоимость занятия</span><span class="cab-row-value">${_esc(student.price_per_lesson)} ₽</span></div>` : ""}
          ${student.payment_status ? `<div class="cab-card-row"><span class="cab-row-label">Статус</span><span class="cab-row-value">${_esc(student.payment_status)}</span></div>` : ""}
          <div class="cab-card-row"><span class="cab-row-label">Связаться</span><span class="cab-row-value"><a href="https://t.me/MariaBurceva_English" target="_blank" rel="noreferrer">@MariaBurceva_English</a></span></div>
        </article>
      </div>

      <p class="cab-mvp-note">MVP-версия. Расширенные функции (отчёты, PDF, история оплат) — в следующих версиях.</p>
    `;
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
    signOut,
    tryLogin,
    requireSession,
    getStudentById,
    getAllStudents,
    getReportsForStudent,
    renderStudent,
    renderTeacher,
    renderParent,
    wireSignOutButton,
  };
})();
