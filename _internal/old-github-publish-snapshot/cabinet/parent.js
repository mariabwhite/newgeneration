import {
  formatDateTime,
  getStudentMeta,
  getProgress,
  getStudentMeta,
  getUser,
  listLessonsForStudent,
  listPaymentsForStudent,
  listPendingNotificationsForUser,
  listStudentItems,
  loadState,
  PAYMENT_DETAILS,
  updatePayment,
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

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = t("Скопировано", "Copied");
    setTimeout(() => (btn.textContent = btn.dataset.label || t("Копировать", "Copy")), 1200);
  } catch {
    btn.textContent = t("Не скопировалось", "Copy failed");
  }
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

function renderPayments(state, studentId) {
  const meta = getStudentMeta(state, studentId);
  const student = getUser(state, studentId);
  const payments = listPaymentsForStudent(state, studentId).slice(0, 10);
  const paymentGuide = `
    <div class="payment-guide">
      <div>
        <div class="panel-kicker">${escapeHtml(t("Оплата", "Payment"))}</div>
        <strong>${escapeHtml(PAYMENT_DETAILS.method)} · ${escapeHtml(PAYMENT_DETAILS.recipient)}</strong>
        <div class="muted">${escapeHtml(t("Телефон для перевода", "Transfer phone"))}: ${escapeHtml(PAYMENT_DETAILS.phone)}</div>
        <div class="muted">${escapeHtml(t("Назначение", "Purpose"))}: ${escapeHtml(PAYMENT_DETAILS.purpose)}</div>
      </div>
      <div class="payment-guide-actions">
        <a class="btn-mini" data-primary href="${escapeHtml(PAYMENT_DETAILS.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть оплату", "Open payment"))}</a>
        <button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.phone)}" data-label="${escapeHtml(t("Скопировать телефон", "Copy phone"))}">${escapeHtml(t("Скопировать телефон", "Copy phone"))}</button>
        <button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.url)}" data-label="${escapeHtml(t("Скопировать ссылку", "Copy link"))}">${escapeHtml(t("Скопировать ссылку", "Copy link"))}</button>
      </div>
    </div>
    <details class="payment-details">
      <summary>${escapeHtml(t("Реквизиты для перевода", "Bank details"))}</summary>
      <div class="payment-details-grid">
        <span>${escapeHtml(t("Получатель", "Recipient"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.recipient)}" data-label="${escapeHtml(PAYMENT_DETAILS.recipient)}">${escapeHtml(PAYMENT_DETAILS.recipient)}</button>
        <span>${escapeHtml(t("Счёт", "Account"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.account)}" data-label="${escapeHtml(PAYMENT_DETAILS.account)}">${escapeHtml(PAYMENT_DETAILS.account)}</button>
        <span>${escapeHtml(t("Банк", "Bank"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.bank)}" data-label="${escapeHtml(PAYMENT_DETAILS.bank)}">${escapeHtml(PAYMENT_DETAILS.bank)}</button>
        <span>${escapeHtml(t("БИК", "BIK"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.bik)}" data-label="${escapeHtml(PAYMENT_DETAILS.bik)}">${escapeHtml(PAYMENT_DETAILS.bik)}</button>
        <span>${escapeHtml(t("Корр. счёт", "Corr. account"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.correspondentAccount)}" data-label="${escapeHtml(PAYMENT_DETAILS.correspondentAccount)}">${escapeHtml(PAYMENT_DETAILS.correspondentAccount)}</button>
        <span>${escapeHtml(t("ИНН", "INN"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.inn)}" data-label="${escapeHtml(PAYMENT_DETAILS.inn)}">${escapeHtml(PAYMENT_DETAILS.inn)}</button>
        <span>${escapeHtml(t("КПП", "KPP"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.kpp)}" data-label="${escapeHtml(PAYMENT_DETAILS.kpp)}">${escapeHtml(PAYMENT_DETAILS.kpp)}</button>
        <span>${escapeHtml(t("Назначение", "Purpose"))}</span><button class="btn-mini" type="button" data-copy-pay="${escapeHtml(PAYMENT_DETAILS.purpose)}" data-label="${escapeHtml(t("Скопировать назначение", "Copy purpose"))}">${escapeHtml(t("Скопировать назначение", "Copy purpose"))}</button>
      </div>
    </details>
    <div class="payment-balance">
      <span>${escapeHtml(t("Остаток занятий", "Lessons left"))}</span>
      <strong>${escapeHtml(String(meta?.remainingLessons ?? 0))}</strong>
    </div>
  `;
  const html = payments.length
    ? payments
        .map((p) => {
          const receiptReady = p.receiptUrl || p.receiptNumber || p.receiptIssuedAt;
          const canReport = p.status !== "paid" && !p.paidReportedAt;
          const notifyText = [
            "Мария Витальевна, здравствуйте!",
            "Я оплатил(а) абонемент.",
            `Ученик: ${student?.name || ""}`,
            `Сумма: ${p.amount} руб.`,
            `Дата оплаты: ${new Date().toLocaleDateString("ru-RU")}`,
            `Назначение: ${PAYMENT_DETAILS.purpose}`,
          ].join("\n");
          return `<div class="payment-row">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(p.date))}</div>
              <div class="muted">${escapeHtml(p.comment || "")}</div>
              ${p.paidReportedAt ? `<div class="muted">${escapeHtml(t("Вы отметили оплату", "Payment reported"))}: ${escapeHtml(formatDateTime(p.paidReportedAt))}</div>` : ""}
              ${
                receiptReady
                  ? `<div class="muted">${escapeHtml(t("Чек", "Receipt"))}: ${escapeHtml(p.receiptNumber || t("выдан", "issued"))}</div>`
                  : `<div class="muted">${escapeHtml(t("Чек появится после подтверждения оплаты", "Receipt appears after confirmation"))}</div>`
              }
              <div class="actions">
                ${canReport ? `<button class="btn-mini" type="button" data-report-pay="${escapeHtml(p.id)}">${escapeHtml(t("Я оплатил(а)", "I paid"))}</button>` : ""}
                ${canReport ? `<button class="btn-mini" type="button" data-telegram-pay="${escapeHtml(notifyText)}" data-label="${escapeHtml(t("Сообщить Марии", "Message Maria"))}">${escapeHtml(t("Сообщить Марии", "Message Maria"))}</button>` : ""}
                ${p.receiptUrl ? `<a class="btn-mini" href="${escapeHtml(p.receiptUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть чек", "Open receipt"))}</a>` : ""}
              </div>
            </div>
            <div class="mono"><strong>${escapeHtml(String(p.amount))} ₽</strong> · ${pill(p.status)}</div>
          </div>`;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Пока нет оплат", "No payments yet"))}</div>`;
  const el = byId("parentPaymentsList");
  if (!el) return;
  el.innerHTML = `${paymentGuide}${html}`;

  el.querySelectorAll("[data-copy-pay]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy-pay") || "", btn));
  });

  el.querySelectorAll("[data-report-pay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-report-pay");
      if (!id) return;
      const fresh = loadState();
      updatePayment(fresh, id, { paidReportedAt: new Date().toISOString() });
      renderPayments(loadState(), studentId);
    });
  });

  el.querySelectorAll("[data-telegram-pay]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await copyText(btn.getAttribute("data-telegram-pay") || "", btn);
      window.open(PAYMENT_DETAILS.telegramUrl, "_blank", "noopener,noreferrer");
    });
  });
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
