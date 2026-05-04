(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeName(value) {
    return String(value || "student")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "student";
  }

  function statusLabel(status) {
    const map = {
      done: "Проведено",
      planned: "Запланировано",
      missed: "Пропущено",
      paid: "Оплачено",
      pending: "Ждём оплату",
      overdue: "Просрочено",
      Completed: "Проведено",
      Planned: "Запланировано",
      Missed: "Пропущено",
    };
    return map[status] || status || "—";
  }

  function toneForStatus(status) {
    if (["done", "paid", "Completed"].includes(status)) return "ok";
    if (["missed", "overdue", "Missed"].includes(status)) return "bad";
    return "warn";
  }

  function list(items, emptyText, render) {
    if (!items || !items.length) return `<p class="empty">${escapeHtml(emptyText)}</p>`;
    return `<div class="item-list">${items.map(render).join("")}</div>`;
  }

  function textBlock(text, emptyText) {
    const value = String(text || "").trim();
    if (!value) return `<p class="empty">${escapeHtml(emptyText || "Пока не заполнено.")}</p>`;
    return `<p>${escapeHtml(value).replace(/\n/g, "<br>")}</p>`;
  }

  function buildReportDocument(data) {
    const now = data.generatedAt || new Date().toISOString();
    const title = data.title || "Отчёт об успеваемости";
    const student = data.studentName || "Ученик";
    const lessons = data.lessons || [];
    const materials = data.materials || [];
    const practice = data.practice || [];
    const payments = data.payments || [];
    const doneItems = [...materials, ...practice].filter((x) => x.done).length;
    const completedLessons = lessons.filter((x) => x.status === "done" || x.status === "Completed").length;
    const totalLessons = data.totalLessons || lessons.length || "—";
    const leftLessons = data.lessonsLeft;

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · ${escapeHtml(student)} · New Generation English</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f5;
      color: #1a2a2f;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 20px 16px;
    }
    .sheet {
      width: min(1100px, 100%);
      margin: 0 auto;
      background: #ffffff;
      border-radius: 32px;
      overflow: hidden;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.05);
    }
    .hero {
      padding: 24px 24px 20px;
      background: #ffffff;
      border-bottom: 1px solid #e9edf2;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 16px;
    }
    .report-logo {
      display: grid;
      grid-template-columns: 54px auto;
      align-items: center;
      gap: 12px;
      color: #0b1115;
    }
    .logo-mark {
      position: relative;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background:
        linear-gradient(145deg, transparent 18%, #25aeca 19% 30%, transparent 31% 42%, #0b6478 43% 52%, transparent 53%),
        radial-gradient(circle at 55% 45%, #eef7fa 0 35%, transparent 36%),
        linear-gradient(135deg, #0e4d5b, #2db7d3);
      box-shadow: inset 0 0 0 1px rgba(20, 86, 99, 0.12);
    }
    .logo-mark::before,
    .logo-mark::after {
      content: "";
      position: absolute;
      right: -7px;
      width: 25px;
      height: 11px;
      border-top: 7px solid #2aaec9;
      border-right: 7px solid #2aaec9;
      transform: skewX(-20deg) rotate(-10deg);
    }
    .logo-mark::before { top: 13px; }
    .logo-mark::after {
      top: 29px;
      right: -12px;
      width: 32px;
      border-color: #229bb8;
    }
    .logo-wordmark {
      line-height: 0.9;
      text-transform: uppercase;
    }
    .logo-wordmark span {
      display: block;
      color: #111820;
      font-weight: 850;
      letter-spacing: 0;
    }
    .logo-wordmark .logo-small {
      font-size: 18px;
    }
    .logo-wordmark .logo-big {
      margin-top: 2px;
      font-size: 32px;
      letter-spacing: -0.02em;
    }
    .logo-tagline {
      margin-top: 6px;
      color: #34414a;
      font-size: 9px;
      letter-spacing: 0.05em;
    }
    .brand {
      font-size: 0.7rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #7c8b9c;
      font-weight: 600;
    }
    h1 {
      margin: 0;
      max-width: 720px;
      font-size: clamp(1.55rem, 3.2vw, 2.25rem);
      font-weight: 600;
      line-height: 1.08;
      color: #1f3b4a;
      letter-spacing: 0;
    }
    .subhead {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 12px;
      color: #5f6f80;
      font-size: 0.9rem;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 12px;
      border-radius: 40px;
      background: #f4f7fa;
      color: #526578;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .content { padding: 0; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      padding: 24px;
      border-bottom: 1px solid #eff2f6;
    }
    .stat, .section {
      background: #fafdff;
      border: 1px solid #eef2f8;
      border-radius: 24px;
    }
    .stat { padding: 16px; }
    .label {
      color: #7f95ab;
      font-size: 0.65rem;
      line-height: 1.35;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .value {
      margin-top: 6px;
      color: #1f3b4a;
      font-size: 1.6rem;
      line-height: 1.15;
      font-weight: 600;
    }
    .section {
      margin: 0;
      padding: 24px;
      border-width: 0 0 1px;
      border-color: #eff2f6;
      border-radius: 0;
      background: #ffffff;
    }
    .section-inner,
    .section .item-list,
    .section p {
      max-width: 860px;
    }
    h2 {
      margin: 0 0 18px;
      color: #4d6272;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    p {
      margin: 0;
      color: #375f70;
      line-height: 1.62;
      font-size: 0.92rem;
    }
    .empty { color: #8fa3b3; }
    .item-list { display: grid; gap: 10px; }
    .item {
      display: grid;
      grid-template-columns: minmax(105px, 150px) 1fr auto;
      gap: 12px;
      align-items: start;
      padding: 12px;
      border-radius: 18px;
      background: #fafdff;
      border: 1px solid #eef2f8;
    }
    .item-main strong { display: block; color: #2e5a6e; margin-bottom: 4px; }
    .item-main span, .item-date { color: #5f7788; font-size: 0.82rem; line-height: 1.45; }
    .badge {
      white-space: nowrap;
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 0.7rem;
      font-weight: 600;
      border: 1px solid;
    }
    .badge[data-tone="ok"] { color: #1e6f3f; background: #e0f2e9; border-color: #c0e0d0; }
    .badge[data-tone="warn"] { color: #6b7f8e; background: #f0f2f5; border-color: #e2e6ea; }
    .badge[data-tone="bad"] { color: #bc4e2c; background: #ffe6e5; border-color: #f3cfc5; }
    .two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0;
    }
    .two-col .section { border-right: 1px solid #eff2f6; }
    .two-col .section:last-child { border-right: 0; }
    .footer {
      padding: 14px 28px 22px;
      color: #8ca3b5;
      font-size: 0.65rem;
      text-align: center;
      border-top: 1px solid #eef2f6;
      background: #fafcfe;
    }
    @media (max-width: 760px) {
      body { padding: 10px; }
      .sheet { border-radius: 18px; }
      .hero, .summary, .section { padding: 20px 16px; }
      .summary, .two-col { grid-template-columns: 1fr; }
      .two-col .section { border-right: 0; }
      .item { grid-template-columns: 1fr; }
      .badge { width: fit-content; }
    }
    @media print {
      @page { size: A4; margin: 9mm; }
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border-radius: 0; border: 0; width: 100%; }
      .hero { padding: 10mm 10mm 7mm; }
      .summary { padding: 7mm 10mm; gap: 7px; }
      .section { padding: 6mm 10mm; }
      h1 { font-size: 20pt; }
      .logo-mark { width: 40px; height: 40px; }
      .logo-mark::before { top: 10px; right: -5px; width: 18px; height: 8px; border-top-width: 5px; border-right-width: 5px; }
      .logo-mark::after { top: 23px; right: -8px; width: 24px; height: 8px; border-top-width: 5px; border-right-width: 5px; }
      .report-logo { grid-template-columns: 40px auto; gap: 9px; }
      .logo-wordmark .logo-small { font-size: 11pt; }
      .logo-wordmark .logo-big { font-size: 20pt; }
      .logo-tagline { font-size: 6pt; }
      .stat { padding: 9px; }
      .value { font-size: 15pt; }
      .section { break-inside: avoid; }
      h2 { font-size: 12pt; margin-bottom: 7px; }
      p, .item-main span, .item-date { font-size: 9pt; line-height: 1.35; }
      .item { padding: 7px; gap: 8px; }
      .footer { padding: 8px 10mm; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="hero">
      <div class="brand-row">
        <div class="report-logo" aria-label="New Generation English">
          <div class="logo-mark" aria-hidden="true"></div>
          <div class="logo-wordmark">
            <span class="logo-small">New Generation</span>
            <span class="logo-big">English</span>
            <div class="logo-tagline">Explore the world through English</div>
          </div>
        </div>
        <div class="brand">Progress report</div>
      </div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subhead">
        <span class="tag">${escapeHtml(student)}</span>
        ${data.parentName ? `<span class="tag">Для родителя: ${escapeHtml(data.parentName)}</span>` : ""}
        ${data.period ? `<span class="tag">${escapeHtml(data.period)}</span>` : ""}
        <span class="tag">Сформировано: ${escapeHtml(data.generatedLabel || now)}</span>
      </div>
    </header>
    <main class="content">
      <section class="summary">
        <div class="stat"><div class="label">Уровень</div><div class="value">${escapeHtml(data.level || "—")}</div></div>
        <div class="stat"><div class="label">Формат</div><div class="value">${escapeHtml(data.subscription || "—")}</div></div>
        <div class="stat"><div class="label">Проведено</div><div class="value">${escapeHtml(completedLessons)} / ${escapeHtml(totalLessons)}</div></div>
        <div class="stat"><div class="label">Осталось</div><div class="value">${escapeHtml(leftLessons ?? "—")}</div></div>
      </section>

      <section class="section">
        <h2>Краткий вывод</h2>
        ${textBlock(data.body || data.teacherComment, "Комментарий пока не добавлен.")}
      </section>

      <section class="section">
        <h2>Следующий шаг</h2>
        ${textBlock(data.nextStep || data.plan || data.focus || data.goals, "Следующий шаг преподаватель добавит в отчёт.")}
      </section>

      <section class="two-col">
        <div class="section">
          <h2>Домашнее задание</h2>
          ${textBlock(data.homework || data.nextHomework, "Домашка появится после урока.")}
        </div>
        <div class="section">
          <h2>Фокус занятий</h2>
          ${textBlock(data.focus || data.goals || data.teacherComment, "Фокус появится после комментария преподавателя.")}
        </div>
      </section>

      <section class="section">
        <h2>Темы и занятия</h2>
        ${list(lessons, "Уроков пока нет.", (lesson) => `
          <div class="item">
            <div class="item-date">${escapeHtml(lesson.date || "—")}</div>
            <div class="item-main">
              <strong>${escapeHtml(lesson.topic || "Урок английского")}</strong>
              <span>${escapeHtml(lesson.homework || lesson.notes || "Без дополнительных заметок.")}</span>
            </div>
            <span class="badge" data-tone="${escapeHtml(toneForStatus(lesson.status))}">${escapeHtml(statusLabel(lesson.status))}</span>
          </div>`)}
      </section>

      <section class="two-col">
        <div class="section">
          <h2>Материалы</h2>
          ${list(materials, "Материалы пока не назначены.", (item) => `
            <div class="item">
              <div class="item-date">${escapeHtml(item.date || "")}</div>
              <div class="item-main">
                <strong>${escapeHtml(item.title || "Материал")}</strong>
                <span>${escapeHtml(item.details || item.url || "")}</span>
              </div>
              <span class="badge" data-tone="${item.done ? "ok" : "warn"}">${item.done ? "Готово" : "В работе"}</span>
            </div>`)}
        </div>
        <div class="section">
          <h2>Практика и тренажёры</h2>
          ${list(practice, "Практика пока не назначена.", (item) => `
            <div class="item">
              <div class="item-date">${escapeHtml(item.minutes ? `${item.minutes} мин` : "")}</div>
              <div class="item-main">
                <strong>${escapeHtml(item.title || "Практика")}</strong>
                <span>${escapeHtml(item.details || item.level || item.url || "")}</span>
              </div>
              <span class="badge" data-tone="${item.done ? "ok" : "warn"}">${item.done ? "Готово" : "В работе"}</span>
            </div>`)}
        </div>
      </section>

      ${payments.length ? `<section class="section">
        <h2>Оплаты и абонемент</h2>
        ${list(payments, "Оплат пока нет.", (payment) => `
          <div class="item">
            <div class="item-date">${escapeHtml(payment.date || "—")}</div>
            <div class="item-main">
              <strong>${escapeHtml(payment.amount || "—")} ₽</strong>
              <span>${escapeHtml(payment.comment || payment.remindAt || "")}</span>
            </div>
            <span class="badge" data-tone="${escapeHtml(toneForStatus(payment.status))}">${escapeHtml(statusLabel(payment.status))}</span>
          </div>`)}
      </section>` : ""}

      <section class="section">
        <h2>Итог</h2>
        <p>В отчёте видно ${escapeHtml(completedLessons)} проведённых занятий, ${escapeHtml(doneItems)} выполненных материалов или тренировок и текущий учебный фокус. Это рабочая картина прогресса: что уже получается, что закрепляем и куда идём дальше.</p>
      </section>
    </main>
    <footer class="footer">New Generation English · индивидуальный трекинг прогресса</footer>
  </article>
</body>
</html>`;
  }

  function downloadHtml(filename, html) {
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

  function openPdfPrint(filename, html) {
    const printableHtml = html.replace(
      "</body>",
      `<script>
        window.addEventListener("load", () => {
          document.title = ${JSON.stringify(filename.replace(/\.pdf$/i, ""))};
          setTimeout(() => window.print(), 250);
        });
      <\/script></body>`
    );
    const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      downloadHtml(filename.replace(/\.pdf$/i, ".html"), printableHtml);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  window.NGEReportDocs = {
    buildReportDocument,
    downloadHtml,
    openPdfPrint,
    safeName,
  };
})();
