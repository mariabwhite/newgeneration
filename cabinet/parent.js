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
  queueNotification,
  saveState,
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
