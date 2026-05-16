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
          <div class="cab-card-row"><span class="cab-row-label">Расписание</span><span class="cab-row-value">${_esc(student.schedule || "—")}</span></div>
        </article>

        <article class="cab-card">
          <h3>Отчёты</h3>
          <div class="cab-card-row"><span class="cab-row-label">${_esc(currentMonth)}</span><span class="cab-row-value">${_esc(student.payment_status || "в работе")}</span></div>
          <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
            <button class="cab-action-btn" type="button" data-action="open-report" data-student="${_esc(student.id)}">Открыть отчёт за ${_esc(currentMonth)}</button>
            <a class="cab-action-btn cab-action-btn--ghost" href="${_esc(payment.telegram || "")}" target="_blank" rel="noreferrer">Запросить расширенный отчёт у Марии</a>
          </div>
          <p style="margin-top: 12px; font-size: 11.5px; color: var(--text-3); line-height: 1.55;">
            «Открыть отчёт» сформирует страницу, готовую к печати: распечатайте или сохраните как PDF через диалог браузера (⌘P / Ctrl+P → «Сохранить как PDF»).
          </p>
        </article>

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
      </div>

      <p class="cab-mvp-note">
        После оплаты обязательно напишите Марии в Telegram — она подтвердит и обновит остаток занятий.
        <br><br>
        Это MVP-версия. Автоматическое подтверждение оплаты, история чеков и расширенные PDF-отчёты — в следующих версиях.
      </p>
    `;

    // Wire up the dynamic buttons
    container.querySelectorAll('[data-action="open-report"]').forEach(btn => {
      btn.addEventListener("click", () => openPrintableReport(btn.dataset.student));
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

  async function openPrintableReport(studentId) {
    const student = await getStudentById(studentId);
    if (!student) return;
    const month = _currentMonthLabel();
    const teacher = (window.NGE_DATA && window.NGE_DATA.teacher && window.NGE_DATA.teacher.name) || "Мария Витальевна Бурцева";
    const date = new Date().toLocaleDateString("ru-RU");

    const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<title>Отчёт — ${_esc(student.name)} — ${_esc(month)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Manrope, Arial, sans-serif;
    margin: 40px auto; max-width: 720px; padding: 0 24px; color: #1a1612; line-height: 1.55; }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #6b6560; margin-bottom: 32px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.14em;
    color: #FF5A1F; margin: 28px 0 12px; }
  .row { display: flex; justify-content: space-between; gap: 14px;
    padding: 8px 0; border-top: 1px solid rgba(0,0,0,0.08); font-size: 14px; }
  .row:first-of-type { border-top: none; }
  .row .label { color: #6b6560; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.1em; padding-top: 2px; }
  .row .value { text-align: right; }
  .footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid rgba(0,0,0,0.08);
    color: #6b6560; font-size: 12px; line-height: 1.7; }
  .footer .sig { font-weight: 600; color: #1a1612; }
  @media print { body { margin: 20mm; padding: 0; } }
</style>
</head><body>
<h1>Отчёт за ${_esc(month)}</h1>
<div class="sub">New Generation English · кабинет ${_esc(student.name)}</div>

<h2>Ученик</h2>
<div class="row"><span class="label">Имя</span><span class="value">${_esc(student.name)}</span></div>
${student.level ? `<div class="row"><span class="label">Уровень</span><span class="value">${_esc(student.level)}</span></div>` : ""}
${student.format ? `<div class="row"><span class="label">Формат</span><span class="value">${_esc(student.format)}</span></div>` : ""}
${student.duration ? `<div class="row"><span class="label">Длительность</span><span class="value">${_esc(student.duration)}</span></div>` : ""}
${student.lessons_per_week ? `<div class="row"><span class="label">Раз в неделю</span><span class="value">${_esc(student.lessons_per_week)}</span></div>` : ""}
${student.schedule ? `<div class="row"><span class="label">Расписание</span><span class="value">${_esc(student.schedule)}</span></div>` : ""}
${student.goal ? `<div class="row"><span class="label">Цель</span><span class="value">${_esc(student.goal)}</span></div>` : ""}

<h2>Оплата</h2>
${student.price_per_lesson ? `<div class="row"><span class="label">Цена занятия</span><span class="value">${_esc(student.price_per_lesson)} ₽</span></div>` : ""}
${student.weekly_revenue ? `<div class="row"><span class="label">В неделю</span><span class="value">${_esc(student.weekly_revenue)} ₽</span></div>` : ""}
<div class="row"><span class="label">Статус</span><span class="value">${_esc(student.payment_status || "—")}</span></div>

<div class="footer">
  <p>
    Это краткая выгрузка из кабинета на ${_esc(date)}.<br>
    Полный методический отчёт за месяц (сильные стороны, провалы, домашние задания, прогресс)
    готовится индивидуально и присылается отдельно в Telegram.
  </p>
  <p class="sig">${_esc(teacher)}</p>
  <p>New Generation English · ${_esc(month)}</p>
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
