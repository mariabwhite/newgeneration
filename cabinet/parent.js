import {
  formatDateTime,
  getProgress,
  getStudentMeta,
  getUser,
  listLessonsForStudent,
  listPaymentsForStudent,
  listPendingNotificationsForUser,
  listStudentItems,
  loadState,
} from "./core.js";

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
  select.innerHTML = options || `<option value="">${escapeHtml(t("Нет привязанных учеников", "No linked students"))}</option>`;
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
          <td class="muted">${escapeHtml((l.homework || "").slice(0, 110) || "—")}</td>
        </tr>`;
    })
    .join("");

  const table = byId("parentLessonsTable");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr>
          <th>${escapeHtml(t("Дата", "Date"))}</th>
          <th>${escapeHtml(t("Домашка", "Homework"))}</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="2" class="muted">${escapeHtml(t("Нет уроков", "No lessons"))}</td></tr>`}</tbody>
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
    : `<div class="muted">${escapeHtml(t("Пока нет домашки", "No homework yet"))}</div>`;

  const materials = listStudentItems(state, studentId, "material").slice(0, 6);
  const materialsHtml = materials.length
    ? `
      <div style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px;">
        <div class="panel-kicker">${escapeHtml(t("Материалы ученика", "Student materials"))}</div>
        ${materials
          .map((m) => {
            const link = m.url
              ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                  m.url
                )}" target="_blank" rel="noopener noreferrer">↗</a>`
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

  const html = `${homeworkHtml}${materialsHtml}`;
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
        <div><span class="panel-kicker">${escapeHtml(t("Уровень", "Level"))}</span><div><strong>${escapeHtml(prog.level)}</strong></div></div>
        <div><span class="panel-kicker">${escapeHtml(t("Цели", "Goals"))}</span><div class="muted">${escapeHtml(prog.goals)}</div></div>
        <div><span class="panel-kicker">${escapeHtml(t("Комментарий преподавателя", "Teacher comment"))}</span><div class="muted">${escapeHtml(prog.comments)}</div></div>
      </div>`
    : `<div class="muted">${escapeHtml(t("Пока нет данных", "No data yet"))}</div>`;
}

function buildTeacherSavedReportText(state, report) {
  const student = getUser(state, report.studentId);
  const progress = getProgress(state, report.studentId) || {};
  const meta = getStudentMeta(state, report.studentId) || {};
  return [
    "Отчёт преподавателя New Generation English",
    `Дата: ${formatDateTime(report.createdAt)}`,
    `Ученик: ${student?.name || "—"}`,
    `Уровень: ${progress.level || "—"}`,
    `Абонемент: ${meta.tariff || "—"}`,
    "",
    report.title || "Отчёт",
    "",
    report.body || "",
    "",
    "Комментарий преподавателя",
    progress.comments || "—",
  ].join("\n");
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
        <div class="panel-kicker">${escapeHtml(t("Отчёты", "Reports"))}</div>
        <div class="muted">${escapeHtml(t("Отчётов преподавателя пока нет", "No teacher reports yet"))}</div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="border-top:1px solid var(--line); padding-top:12px;">
      <div class="panel-kicker">${escapeHtml(t("Отчёты", "Reports"))}</div>
      ${reports.map((report) => `
        <div class="student-item-row">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(report.createdAt))}</div>
            <div><strong>${escapeHtml(report.title || t("Отчёт", "Report"))}</strong></div>
            <div class="muted">${escapeHtml((report.body || "").slice(0, 120))}</div>
          </div>
          <div class="student-item-actions">
            <button class="btn-mini" type="button" data-parent-report="${escapeHtml(report.id)}">${escapeHtml(t("Скачать", "Download"))}</button>
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
      const blob = new Blob([buildTeacherSavedReportText(fresh, report)], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nge-teacher-report-${safeName}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  });
}

function renderPayments(state, studentId) {
  const payments = listPaymentsForStudent(state, studentId).slice(0, 10);
  const html = payments.length
    ? payments
        .map((p) => {
          return `<div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(p.date))}</div>
              <div class="muted">${escapeHtml(p.comment || "")}</div>
            </div>
            <div class="mono"><strong>${escapeHtml(String(p.amount))} ₽</strong> · ${pill(p.status)}</div>
          </div>`;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Пока нет оплат", "No payments yet"))}</div>`;
  const el = byId("parentPaymentsList");
  if (el) el.innerHTML = html;
}

function renderNotifications(state, parentId) {
  const items = listPendingNotificationsForUser(state, parentId);
  const el = byId("parentNotifList");
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div class="muted">${escapeHtml(t("Пока нет уведомлений", "No notifications yet"))}</div>`;
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
            <button class="btn-mini" type="button" data-copy="${escapeHtml(payload)}">${escapeHtml(t("Копировать", "Copy"))}</button>
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
        btn.textContent = t("Скопировано", "Copied");
        setTimeout(() => (btn.textContent = t("Копировать", "Copy")), 1200);
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

  const lines = [
    "Отчёт об успеваемости New Generation English",
    `Дата выгрузки: ${formatDateTime(new Date().toISOString())}`,
    `Родитель: ${parentUser.name || "—"}`,
    `Ученик: ${student?.name || "—"}`,
    "",
    "Профиль",
    `Уровень: ${progress.level || "—"}`,
    `Абонемент: ${meta.tariff || "—"}`,
    `План занятий: ${meta.plan || "—"}`,
    "",
    "Цели и комментарии преподавателя",
    `Цели: ${progress.goals || "—"}`,
    `Комментарий: ${progress.comments || "—"}`,
    "",
    "Посещаемость",
    `Запланировано: ${lessons.filter((l) => l.status === "planned").length}`,
    `Проведено: ${lessons.filter((l) => l.status === "done").length}`,
    `Пропуски: ${lessons.filter((l) => l.status === "missed").length}`,
    "",
    "Уроки",
    ...(lessons.length
      ? lessons.slice(-12).reverse().map((l) => `- ${formatDateTime(l.date)} · ${l.status} · ${l.homework || "без домашки"}`)
      : ["- уроков пока нет"]),
    "",
    "Материалы",
    ...(materials.length
      ? materials.map((m) => `- ${m.done ? "[x]" : "[ ]"} ${m.title}${m.details ? ` — ${m.details}` : ""}`)
      : ["- материалов пока нет"]),
    "",
    "Практика и тренажёры",
    ...(practice.length
      ? practice.map((p) => `- ${p.done ? "[x]" : "[ ]"} ${p.title}${p.minutes ? ` · ${p.minutes} мин` : ""}${p.details ? ` — ${p.details}` : ""}`)
      : ["- практики пока нет"]),
    "",
    "Итоги",
    `Выполнено заданий: ${doneItems.length}`,
    `Минут практики: ${practiceMinutes}`,
    "",
    "Оплаты",
    ...(payments.length
      ? payments.map((p) => `- ${formatDateTime(p.date)} · ${p.amount} ₽ · ${p.status}${p.comment ? ` · ${p.comment}` : ""}`)
      : ["- оплат пока нет"]),
  ];

  return lines.join("\n");
}

function downloadProgressReport(state, parentUser, studentId) {
  const student = getUser(state, studentId);
  const report = buildProgressReport(state, parentUser, studentId);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = (student?.name || "student").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
  const a = document.createElement("a");
  a.href = url;
  a.download = `nge-progress-${safeName}.txt`;
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
  actions.innerHTML = `<button class="btn-mini" id="downloadParentReportBtn" type="button" data-primary>Скачать отчёт</button>`;
  host.appendChild(actions);
  byId("downloadParentReportBtn")?.addEventListener("click", () => {
    const studentId = getStudentId();
    if (!studentId) return;
    downloadProgressReport(loadState(), parentUser, studentId);
  });
}

export function initParentCabinet(ctx) {
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
