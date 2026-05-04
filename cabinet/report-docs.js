(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusLabel(status) {
    const map = {
      done: "проведено",
      planned: "запланировано",
      missed: "пропуск",
      paid: "оплачено",
      pending: "ожидает оплаты",
      overdue: "просрочено",
    };
    return map[status] || status || "—";
  }

  const yuliaLinks = [
    ["What's Your Name? featuring The Super Simple...", "https://www.youtube.com/watch?v=yqlbn_nI2w8", "Приветствие, знакомство, фразы My name is... / What is your name? / Nice to meet you."],
    ["Let's Go To The Zoo | Animal Song for Kids", "https://youtu.be/OwRmivbNgQk?feature=shared", "Животные, движение, повторение слов через песню и действия."],
    ["Five Little Bats / Ghosts / Vampires", "https://youtu.be/TPWKnbC6SA8?feature=shared", "Счёт, игровые персонажи, короткие реакции на видео."],
    ["Five Little Ghosts", "https://youtu.be/ToeaHKxqKWA?feature=shared", "Повторение счёта и коротких реакций на песню."],
    ["Five Little Vampires", "https://youtu.be/mfGU4QSjx_M?feature=shared", "Повторение счёта и игровых персонажей."],
  ];

  const yuliaTopics = [
    ["1", "Приветствие и знакомство", "Hello; hi; My name is...; What is your name?; Nice to meet you."],
    ["2", "Classroom-фразы", "This is my classroom; show me; point to; look; listen; repeat."],
    ["3", "Части тела и лица", "nose, eyes, ears, mouth, hands, arms, legs, feet; This is my nose."],
    ["4", "Местоимения", "I / you / he / she / it / we / they через картинки, детей, игрушки и животных."],
    ["5", "Have / has", "I have; he has; she has; it has; we have; they have."],
    ["6", "Цвета + тело", "red, blue, green, yellow, pink; My nose is red; My hands are blue."],
    ["7", "Эмоции", "happy, sad, angry, tired; I am happy; He is sad; She is angry."],
    ["8", "Животные", "It has a nose; It has two eyes; It has four legs."],
    ["9", "Семья", "mum, dad, family; This is my mum; This is my dad."],
    ["10", "Действия и команды", "jump; clap; touch your nose; show me your hands; sit down; stand up."],
  ];

  function paragraphBlock(text, emptyText) {
    const value = String(text || "").trim();
    if (!value) return `<p class="muted">${escapeHtml(emptyText || "Пока не заполнено.")}</p>`;
    return value.split(/\n{2,}/).map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
  }

  function richReportBody(text) {
    const value = String(text || "").trim();
    if (!value) return `<p class="muted">Комментарий преподавателя пока не добавлен.</p>`;
    const headings = new Set([
      "Краткий вывод", "Сводная таблица прогресса", "Следующий шаг", "Фокус", "Темы, пройденные с января",
      "Методика работы", "Что закрепляем дальше", "Видео-ресурсы", "Абонемент на май 2026",
      "Текст отчёта для родителя", "Комментарий преподавателя"
    ]);
    return value.split(/\n+/).map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (headings.has(trimmed)) return `<h3>${escapeHtml(trimmed)}</h3>`;
      if (/^[-•]/.test(trimmed)) return `<p class="bullet">${escapeHtml(trimmed.replace(/^[-•]\s*/, ""))}</p>`;
      return `<p>${escapeHtml(trimmed)}</p>`;
    }).join("");
  }

  function renderTable(headers, rows) {
    if (!rows || !rows.length) return "";
    return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function buildReportDocument(data) {
    const title = data.title || "Отчёт о прогрессе";
    const student = data.studentName || "Ученик";
    const lessons = data.lessons || [];
    const materials = data.materials || [];
    const practice = data.practice || [];
    const payments = data.payments || [];
    const doneItems = [...materials, ...practice].filter((x) => x.done).length;
    const completedLessons = lessons.filter((x) => x.status === "done").length;
    const topicRows = lessons.length
      ? lessons.map((l, i) => [String(i + 1), l.topic || "Урок английского", l.homework || l.notes || statusLabel(l.status)])
      : yuliaTopics;
    const videoRows = (data.videoLinks && data.videoLinks.length ? data.videoLinks : yuliaLinks).map((x) => [x[0], x[2] || "", x[1] || ""]);
    const progressRows = data.progressRows || [
      ["Понимание", "Реагирует на знакомые фразы, инструкции и учебные ситуации", "Стабильно", "Сначала ребёнок понимает, показывает и действует."],
      ["Лексика", data.focus || data.goals || "Закрепляем базовую лексику через повторение", "В процессе", "Слова возвращаются в разных играх и заданиях."],
      ["Короткие фразы", "Повторяет и постепенно собирает самостоятельные ответы", "В процессе", "Цель — уверенное повторение и мягкий переход к своей речи."],
      ["Включённость", "Работает через картинки, движение, персонажей и материалы", "Хорошо", "Формат сохраняет контакт и снижает давление."],
    ];

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · ${escapeHtml(student)} · New Generation English</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; background:#edf3f6; color:#15242b; font-family: Inter, Arial, sans-serif; padding:20px; }
    .sheet { max-width:1040px; margin:0 auto; background:#fff; border-radius:24px; overflow:hidden; box-shadow:0 24px 55px rgba(20,40,55,.12); }
    .hero { padding:28px 30px 24px; background:linear-gradient(135deg,#f7fbfd,#ffffff 55%,#edf8fb); border-bottom:1px solid #e4eef3; }
    .brand { text-transform:uppercase; letter-spacing:.16em; font-size:11px; color:#5b7480; font-weight:800; }
    h1 { margin:12px 0 8px; font-size:34px; line-height:1.05; color:#163645; }
    .subtitle { color:#4f6976; font-size:15px; line-height:1.5; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    .chip { border:1px solid #dce8ee; background:#f7fbfd; border-radius:999px; padding:7px 12px; color:#476472; font-size:12px; font-weight:700; }
    .summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; padding:20px 30px; border-bottom:1px solid #edf2f5; }
    .stat { background:#f8fbfd; border:1px solid #e6eef3; border-radius:16px; padding:14px; }
    .label { text-transform:uppercase; color:#7b929d; font-size:10px; letter-spacing:.12em; font-weight:800; }
    .value { margin-top:7px; font-size:18px; color:#1d4656; font-weight:800; }
    section { padding:22px 30px; border-bottom:1px solid #edf2f5; }
    h2 { margin:0 0 13px; color:#234c5d; font-size:18px; }
    h3 { margin:18px 0 8px; color:#2c6173; font-size:14px; text-transform:uppercase; letter-spacing:.08em; }
    p { margin:0 0 10px; color:#385865; line-height:1.58; font-size:14px; }
    .bullet::before { content:"• "; color:#23a7c0; font-weight:900; }
    table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid #dfeaf0; border-radius:14px; font-size:12px; }
    th { background:#eaf5f8; color:#245466; text-align:left; padding:10px; }
    td { padding:10px; vertical-align:top; border-top:1px solid #e7eff4; color:#365662; line-height:1.45; }
    .link-list { display:grid; gap:10px; }
    .link-item { border:1px solid #e5eef3; border-radius:14px; padding:12px; background:#fbfdfe; }
    .link-item a { color:#147f98; font-weight:800; text-decoration:none; overflow-wrap:anywhere; }
    .two { display:grid; grid-template-columns:1fr 1fr; gap:0; }
    .two section { border-bottom:0; }
    .footer { padding:16px 30px 24px; color:#77909b; font-size:11px; text-align:center; background:#f8fbfd; }
    @media (max-width:760px){ body{padding:8px}.sheet{border-radius:16px}.summary,.two{grid-template-columns:1fr} section,.hero,.summary{padding:18px} h1{font-size:26px} }
    @media print { @page{size:A4;margin:10mm} body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0}.hero{padding:8mm}.summary{padding:6mm 8mm}section{padding:6mm 8mm;break-inside:avoid} p,td{font-size:9pt;line-height:1.35} h1{font-size:20pt} }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="hero">
      <div class="brand">New Generation English · progress report</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(data.subtitle || `${student} · ${data.period || "индивидуальный маршрут"}`)}</div>
      <div class="chips">
        <span class="chip">Ученик: ${escapeHtml(student)}</span>
        ${data.age ? `<span class="chip">Возраст: ${escapeHtml(data.age)}</span>` : ""}
        <span class="chip">Формат: ${escapeHtml(data.subscription || "индивидуально")}</span>
        <span class="chip">Уровень: ${escapeHtml(data.level || "—")}</span>
        <span class="chip">Дата: ${escapeHtml(data.generatedLabel || new Date().toLocaleDateString("ru-RU"))}</span>
      </div>
    </header>

    <div class="summary">
      <div class="stat"><div class="label">Цель отчёта</div><div class="value">Прогресс</div></div>
      <div class="stat"><div class="label">Проведено</div><div class="value">${escapeHtml(completedLessons || data.completedLessons || "—")}</div></div>
      <div class="stat"><div class="label">Осталось</div><div class="value">${escapeHtml(data.lessonsLeft ?? "—")}</div></div>
      <div class="stat"><div class="label">Заданий</div><div class="value">${escapeHtml(doneItems)}</div></div>
    </div>

    <section>
      <h2>Краткий вывод</h2>
      ${richReportBody(data.body || data.teacherComment || data.focus)}
    </section>

    <section>
      <h2>Сводная таблица прогресса</h2>
      ${renderTable(["Зона", "Что уже получается", "Статус", "Комментарий"], progressRows)}
    </section>

    <div class="two">
      <section>
        <h2>Следующий шаг</h2>
        ${paragraphBlock(data.nextStep || data.plan || data.goals, "Следующий шаг преподаватель добавит в отчёт.")}
      </section>
      <section>
        <h2>Что закрепляем дальше</h2>
        ${paragraphBlock(data.homework || data.nextHomework || "This is... · I have... · He has... · She has... · It has...", "Фокус закрепления пока не добавлен.")}
      </section>
    </div>

    <section>
      <h2>Темы, пройденные в работе</h2>
      ${renderTable(["Блок", "Темы", "Фразы / навык"], topicRows)}
    </section>

    <section>
      <h2>Видео-ресурсы и материалы</h2>
      <div class="link-list">${videoRows.map((row) => `<div class="link-item"><a href="${escapeHtml(row[2])}" target="_blank" rel="noopener">${escapeHtml(row[0])}</a><p>${escapeHtml(row[1])}</p></div>`).join("")}</div>
    </section>

    ${payments.length ? `<section><h2>Оплаты и абонемент</h2>${renderTable(["Дата", "Сумма", "Статус", "Комментарий"], payments.map((p) => [p.date || "—", `${p.amount || "—"} ₽`, statusLabel(p.status), p.comment || ""]))}</section>` : ""}

    <section>
      <h2>Комментарий преподавателя</h2>
      ${paragraphBlock(data.teacherComment || "Ученик двигается в своём темпе. Важно сохранять регулярный контакт с английским, повторение и спокойную поддержку между занятиями.")}
    </section>

    <footer class="footer">New Generation English · отчёт по образцу Юлии Лушиной · данные формируются из кабинета преподавателя</footer>
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
    const printableHtml = html.replace("</body>", `<script>window.addEventListener("load",()=>{document.title=${JSON.stringify(filename.replace(/\.pdf$/i, ""))};setTimeout(()=>window.print(),250);});<\/script></body>`);
    const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) downloadHtml(filename.replace(/\.pdf$/i, ".html"), printableHtml);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function getYuliaSampleBody() {
    return `Краткий вывод
Юля занимается в игровом формате, потому что в 5,5 лет эффективнее всего работает не школьное объяснение, а движение, картинки, персонажи, игрушки и короткие повторяющиеся фразы. Сейчас основная задача — мягко вводить базовую речь и закреплять связь между английской фразой, действием и картинкой.

Главный прогресс Юли — она привыкает слышать английский в понятных игровых ситуациях, реагировать на команды, показывать предметы и повторять короткие фразы. Для этого возраста это правильная траектория: сначала узнавание и реакция, затем повторение, и только после этого самостоятельная речь.

Следующий шаг
Переводить узнавание слов в маленькую самостоятельную речь.

Фокус
Закрепляем This is..., I have..., He has..., She has..., It has... через мини-истории.

Методика работы
Работа идёт через игру, картинки, персонажей, игрушки, движение и короткие речевые модели. Основная схема занятия: teacher says → child points / touches / repeats / chooses / shows toy / answers with one short phrase.

Что закрепляем дальше
Body and face: hands, arms, legs, feet, nose, eyes, ears, mouth.
Basic grammar chunks: This is my..., These are my..., I have..., He has..., She has..., It has....
Feelings: happy, sad, angry, tired через мимику, движение и мини-истории.
Animals + have: It has a nose; It has two eyes; It has four legs.
Actions: jump, clap, touch your nose, show me your hands, stand up, sit down.

Текст отчёта для родителя
С января Юля занимается в игровом формате, потому что в 5,5 лет эффективнее всего работает не школьное объяснение, а движение, картинки, персонажи, игрушки и короткие повторяющиеся фразы. Мы мягко вводили базовую речь: приветствие, имя, простые вопросы, classroom-фразы, части тела, цвета, эмоции, животных, семью и действия.

Комментарий преподавателя
Юля двигается в правильном темпе для своего возраста. На этом этапе не нужно требовать от ребёнка взрослой логики или школьной дисциплины в языке: важнее регулярный контакт с английским, игровые повторения и спокойная реакция на простые инструкции. Именно так формируется база для дальнейшей речи.`;
  }

  window.NGEReportDocs = { buildReportDocument, openPdfPrint, downloadHtml, getYuliaSampleBody };
})();
