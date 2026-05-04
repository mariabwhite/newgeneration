function getLabThemeParam() {
  return document.body.classList.contains("light") ? "lite" : "dark";
}

function withLabTheme(href) {
  if (!href || !href.includes("lingua-boost-lab")) return href;
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const body = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const clean = body.replace(/([?&])theme=[^&#]*&?/i, "$1").replace(/[?&]$/, "");
  const sep = clean.includes("?") ? "&" : "?";
  return `${clean}${sep}theme=${getLabThemeParam()}${hash}`;
}

function syncLabLinks() {
  document.querySelectorAll('a[href*="lingua-boost-lab"]').forEach((a) => {
    const raw = a.getAttribute("href") || "";
    a.setAttribute("href", withLabTheme(raw));
  });
}
import {
  addStudentItem,
  deleteStudentItem,
  formatDateTime,
  getISOForLocalDateTime,
  getProgress,
  listLessonsForStudent,
  listStudentItems,
  loadState,
  saveState,
  updateStudentItem,
  upsertProgress,
} from "./core.js";
import { LAB_MODULES } from "../lingua-boost-lab/assets/lab-manifest.js";

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
  };
  const v = map[status] || { tone: "", ru: status, en: status };
  return `<span class="pill" data-tone="${escapeHtml(v.tone)}">${escapeHtml(getLang() === "ru" ? v.ru : v.en)}</span>`;
}

function dateDistanceLabel(iso) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target - start) / 86400000);
  if (days === 0) return t("сегодня", "today");
  if (days === 1) return t("завтра", "tomorrow");
  if (days > 1) return t(`через ${days} дн.`, `in ${days} days`);
  if (days === -1) return t("вчера", "yesterday");
  return t(`${Math.abs(days)} дн. назад`, `${Math.abs(days)} days ago`);
}

function renderScheduleTimeline(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId)
    .filter((l) => new Date(l.date).getTime() >= Date.now() - 86400000)
    .slice(0, 5);
  const events = listStudentItems(state, studentId, "schedule").slice(0, 5);
  const items = [
    ...lessons.map((l) => ({
      type: "lesson",
      title: t("Урок с преподавателем", "Lesson with teacher"),
      at: l.date,
      details: l.homework || t("Домашка появится после урока.", "Homework will appear after the lesson."),
      status: l.status,
      url: l.progressMeUrl || "",
    })),
    ...events.map((x) => ({
      type: "event",
      title: x.title,
      at: x.at || x.createdAt,
      details: x.details || "",
      status: "planned",
      url: x.url || "",
    })),
  ]
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .slice(0, 6);

  const el = byId("scheduleTimeline");
  if (!el) return;
  el.innerHTML = items.length
    ? items
        .map((x, index) => {
          const link = x.url
            ? `<a class="btn-mini timeline-open" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть", "Open"))}</a>`
            : "";
          return `
            <article class="timeline-item" style="--i:${index}">
              <div class="timeline-dot"></div>
              <div class="timeline-body">
                <div class="timeline-meta">${escapeHtml(formatDateTime(x.at))} · ${escapeHtml(dateDistanceLabel(x.at))}</div>
                <div class="timeline-title">${escapeHtml(x.title)}</div>
                ${x.details ? `<div class="timeline-text">${escapeHtml(x.details)}</div>` : ""}
                <div class="timeline-actions">${pill(x.status)}${link}</div>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Ближайших событий пока нет.", "No upcoming events yet."))}</div>`;
}

function renderLessonsTable(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId).slice(-12).reverse();
  const rows = lessons
    .map((l) => {
      const link = l.progressMeUrl
        ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
            l.progressMeUrl
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Урок", "Lesson"))} ↗</a>`
        : `<span class="muted">—</span>`;
      return `
        <tr>
          <td><div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div><strong>${escapeHtml(l.status)}</strong></td>
          <td class="muted">${escapeHtml((l.homework || "").slice(0, 90) || "—")}</td>
          <td>${link}</td>
        </tr>`;
    })
    .join("");

  const table = byId("studentLessonsTable");
  if (!table) return;
  table.innerHTML = `
    <thead>
      <tr>
        <th>${escapeHtml(t("Дата", "Date"))}</th>
        <th>${escapeHtml(t("Домашка", "Homework"))}</th>
        <th>${escapeHtml(t("ProgressMe", "ProgressMe"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="3" class="muted">${escapeHtml(t("Нет уроков", "No lessons"))}</td></tr>`}</tbody>
  `;
}

function renderHomeworkFromLessons(state, studentId) {
  const lessons = listLessonsForStudent(state, studentId)
    .slice()
    .reverse()
    .filter((l) => (l.homework || "").trim())
    .slice(0, 6);
  const html = lessons.length
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
    : `<div class="muted">${escapeHtml(t("Пока нет домашки от преподавателя", "No teacher homework yet"))}</div>`;
  const el = byId("homeworkList");
  if (el) el.innerHTML = html;
}

function renderStudentItems(state, studentId) {
  const events = listStudentItems(state, studentId, "schedule");
  const materials = listStudentItems(state, studentId, "material");
  const practice = listStudentItems(state, studentId, "practice");

  const eventsHtml = events.length
    ? events
        .map((x) => {
          const when = x.at ? formatDateTime(x.at) : "—";
          const link = x.url
            ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">↗</a>`
            : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div>
                <div class="panel-kicker">${escapeHtml(when)}</div>
                <div><strong>${escapeHtml(x.title)}</strong></div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-event="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Событий пока нет", "No events yet"))}</div>`;
  const eventsEl = byId("eventsList");
  if (eventsEl) eventsEl.innerHTML = eventsHtml;

  const materialsHtml = materials.length
    ? materials
        .map((x) => {
          const link = x.url
            ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">↗</a>`
            : "";
          const done = x.done ? ` style="opacity:.7; text-decoration: line-through;"` : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div${done}>
                <div><strong>${escapeHtml(x.title)}</strong></div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-toggle-material="${escapeHtml(
                  x.id
                )}">${escapeHtml(x.done ? "↺" : "✓")}</button>
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-material="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Материалов пока нет", "No materials yet"))}</div>`;
  const matEl = byId("materialsList");
  if (matEl) matEl.innerHTML = materialsHtml;

  const practiceHtml = practice.length
    ? practice
        .map((x) => {
          const when = x.at ? formatDateTime(x.at) : "—";
          const mins = x.minutes ? `${x.minutes}m` : "";
          const done = x.done ? ` style="opacity:.7; text-decoration: line-through;"` : "";
          const source = x.source === "linguaboost" ? `<span class="pill" data-tone="warn">${escapeHtml(x.level || "LAB")}</span>` : "";
          const link = x.url
            ? `<a class="btn-mini" style="min-height:32px; padding: 0 10px;" href="${escapeHtml(
                x.url
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть", "Open"))}</a>`
            : "";
          return `
            <div style="display:flex; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
              <div${done}>
                <div class="panel-kicker">${escapeHtml([when, mins].filter(Boolean).join(" · "))}</div>
                <div><strong>${escapeHtml(x.title)}</strong> ${source}</div>
                ${x.details ? `<div class="muted" style="margin-top:4px;">${escapeHtml(x.details)}</div>` : ""}
              </div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                ${link}
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-toggle-practice="${escapeHtml(
                  x.id
                )}">${escapeHtml(x.done ? "↺" : "✓")}</button>
                <button class="btn-mini" style="min-height:32px; padding: 0 10px;" type="button" data-del-practice="${escapeHtml(
                  x.id
                )}">×</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted">${escapeHtml(t("Практики пока нет", "No practice yet"))}</div>`;
  const prEl = byId("practiceList");
  if (prEl) prEl.innerHTML = practiceHtml;

  eventsEl?.querySelectorAll("[data-del-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-event") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  matEl?.querySelectorAll("[data-del-material]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-material") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  matEl?.querySelectorAll("[data-toggle-material]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-material") || "";
      const s = loadState();
      const cur = s.studentItems.find((x) => x.id === id);
      if (!cur) return;
      updateStudentItem(s, id, { done: !cur.done });
      renderStudentItems(loadState(), studentId);
    });
  });
  prEl?.querySelectorAll("[data-del-practice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-practice") || "";
      const s = loadState();
      deleteStudentItem(s, id);
      renderStudentItems(loadState(), studentId);
    });
  });
  prEl?.querySelectorAll("[data-toggle-practice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-practice") || "";
      const s = loadState();
      const cur = s.studentItems.find((x) => x.id === id);
      if (!cur) return;
      updateStudentItem(s, id, { done: !cur.done });
      renderStudentItems(loadState(), studentId);
    });
  });
}

function renderProgressBox(state, studentId) {
  const p = getProgress(state, studentId);
  const el = byId("progressBox");
  if (!el) return;
  if (!p) {
    el.innerHTML = `<div class="muted">${escapeHtml(t("Пока нет данных", "No data yet"))}</div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid; gap: 10px;">
      <div><span class="panel-kicker">${escapeHtml(t("Уровень", "Level"))}</span><div><strong>${escapeHtml(p.level)}</strong></div></div>
      <div><span class="panel-kicker">${escapeHtml(t("Цели (от преподавателя)", "Goals (teacher)"))}</span><div class="muted">${escapeHtml(
        p.goals
      )}</div></div>
      <div><span class="panel-kicker">${escapeHtml(t("Комментарий (от преподавателя)", "Comment (teacher)"))}</span><div class="muted">${escapeHtml(
        p.comments
      )}</div></div>

      <div style="padding-top: 8px; border-top: 1px solid var(--line);">
        <span class="panel-kicker">${escapeHtml(t("Мои цели", "My goals"))}</span>
        <textarea id="studentGoals" placeholder="${escapeHtml(t("Например: 2×/нед speaking…", "e.g. 2×/week speaking…"))}">${escapeHtml(
          p.studentGoals || ""
        )}</textarea>
      </div>
      <div>
        <span class="panel-kicker">${escapeHtml(t("Мои заметки", "My notes"))}</span>
        <textarea id="studentNotes" placeholder="${escapeHtml(t("Что получается / что сложно…", "What works / what’s hard…"))}">${escapeHtml(
          p.studentNotes || ""
        )}</textarea>
      </div>
    </div>
  `;
}

function renderEventCreator(open) {
  const el = byId("eventCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 140px 120px;">
      <label>${escapeHtml(t("Событие", "Event"))}
        <input id="evTitle" placeholder="${escapeHtml(t("Название…", "Title…"))}">
      </label>
      <label>${escapeHtml(t("Дата", "Date"))}
        <input id="evDate" type="date" value="${escapeHtml(today)}">
      </label>
      <label>${escapeHtml(t("Время", "Time"))}
        <input id="evTime" type="time" value="12:00">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Ссылка (опционально)", "Link (optional)"))}
        <input id="evLink" placeholder="https://...">
      </label>
      <label>${escapeHtml(t("Комментарий (опционально)", "Note (optional)"))}
        <textarea id="evDetails" placeholder="${escapeHtml(t("Коротко…", "Short…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="evSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="evCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderMaterialCreator(open) {
  const el = byId("materialCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 1fr;">
      <label>${escapeHtml(t("Материал", "Material"))}
        <input id="matTitle" placeholder="${escapeHtml(t("Название…", "Title…"))}">
      </label>
      <label>${escapeHtml(t("Ссылка", "Link"))}
        <input id="matUrl" placeholder="https://...">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Комментарий", "Note"))}
        <textarea id="matDetails" placeholder="${escapeHtml(t("Что это и зачем…", "What is it and why…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="matSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="matCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderPracticeCreator(open) {
  const el = byId("practiceCreator");
  if (!el) return;
  el.style.display = open ? "block" : "none";
  if (!open) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="form-row" style="grid-template-columns: 1fr 120px 140px;">
      <label>${escapeHtml(t("Практика", "Practice"))}
        <input id="prTitle" placeholder="${escapeHtml(t("Например: Listening…", "e.g. Listening…"))}">
      </label>
      <label>${escapeHtml(t("Минут", "Minutes"))}
        <input id="prMinutes" type="number" min="1" value="10">
      </label>
      <label>${escapeHtml(t("Дата", "Date"))}
        <input id="prDate" type="date" value="${escapeHtml(today)}">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Комментарий", "Note"))}
        <textarea id="prDetails" placeholder="${escapeHtml(t("Что делали…", "What did you do…"))}"></textarea>
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" id="prSaveBtn" type="button" data-primary>${escapeHtml(t("Добавить", "Add"))}</button>
      <button class="btn-mini" id="prCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
    </div>
  `;
}

function renderLabPicker() {
  const el = byId("labPicker");
  if (!el) return;
  const levels = Array.from(new Set(LAB_MODULES.map((m) => m.level)));
  el.innerHTML = `
    <div class="lab-picker">
      <div class="form-row lab-picker-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <select id="labLevelSelect">
            <option value="">${escapeHtml(t("Все уровни", "All levels"))}</option>
            ${levels.map((level) => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`).join("")}
          </select>
        </label>
        <label>${escapeHtml(t("Тренажёр", "Trainer"))}
          <select id="labModuleSelect"></select>
        </label>
        <label>${escapeHtml(t("Когда сделать", "Due date"))}
          <input id="labDueDate" type="date" value="${escapeHtml(new Date().toISOString().slice(0, 10))}">
        </label>
      </div>
      <div id="labModulePreview" class="lab-module-preview"></div>
      <div class="actions">
        <button class="btn-mini" id="addLabModuleBtn" type="button" data-primary>${escapeHtml(t("Добавить в домашку", "Add to homework"))}</button>
        <a class="btn-mini" href="../lingua-boost-lab/index.html" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть лабораторию", "Open lab"))}</a>
      </div>
    </div>
  `;

  const levelSelect = /** @type {HTMLSelectElement|null} */ (byId("labLevelSelect"));
  const moduleSelect = /** @type {HTMLSelectElement|null} */ (byId("labModuleSelect"));
  const preview = byId("labModulePreview");

  function filteredModules() {
    const level = levelSelect?.value || "";
    return LAB_MODULES.filter((m) => !level || m.level === level);
  }

  function syncModuleOptions() {
    if (!moduleSelect) return;
    moduleSelect.innerHTML = filteredModules()
      .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.title)}</option>`)
      .join("");
    syncPreview();
  }

  function syncPreview() {
    if (!preview || !moduleSelect) return;
    const module = LAB_MODULES.find((m) => m.id === moduleSelect.value) || filteredModules()[0];
    if (!module) {
      preview.innerHTML = `<div class="muted">${escapeHtml(t("В лаборатории пока нет модулей.", "No modules yet."))}</div>`;
      return;
    }
    preview.innerHTML = `
      <div class="lab-card">
        <div class="panel-kicker">${escapeHtml(module.level)} · ${escapeHtml(module.topic)}</div>
        <strong>${escapeHtml(module.title)}</strong>
        <p class="muted">${escapeHtml(module.description)}</p>
        <div class="lab-card-meta">
          <span class="pill">${escapeHtml(module.audience)}</span>
          <span class="pill">${escapeHtml(module.minutes)} ${escapeHtml(t("мин", "min"))}</span>
        </div>
      </div>
    `;
  }

  levelSelect?.addEventListener("change", syncModuleOptions);
  moduleSelect?.addEventListener("change", syncPreview);
  syncModuleOptions(); syncLabLinks();
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildStudentReport(state, studentId, studentName) {
  const lessons = listLessonsForStudent(state, studentId).slice(-8).reverse();
  const practice = listStudentItems(state, studentId, "practice");
  const materials = listStudentItems(state, studentId, "material");
  const events = listStudentItems(state, studentId, "schedule");
  const progress = getProgress(state, studentId);
  const donePractice = practice.filter((x) => x.done).length;
  const totalMinutes = practice.reduce((sum, x) => sum + (Number(x.minutes) || 0), 0);

  const line = (label, value = "") => `${label}: ${value}`.trim();
  return [
    "New Generation English",
    `Отчёт ученика: ${studentName}`,
    `Дата выгрузки: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
    "",
    "Прогресс",
    line("Уровень", progress?.level || "—"),
    line("Цели преподавателя", progress?.goals || "—"),
    line("Комментарий преподавателя", progress?.comments || "—"),
    line("Мои цели", progress?.studentGoals || "—"),
    line("Мои заметки", progress?.studentNotes || "—"),
    "",
    "Сводка",
    line("Ближайших/последних уроков", String(lessons.length)),
    line("Материалов", String(materials.length)),
    line("Практик и тренажёров", String(practice.length)),
    line("Готово практик", String(donePractice)),
    line("Минут практики", String(totalMinutes)),
    line("Личных событий", String(events.length)),
    "",
    "Уроки",
    ...(lessons.length
      ? lessons.map((l) => `- ${formatDateTime(l.date)} · ${l.status} · ${l.homework || "без домашки"}`)
      : ["- пока нет уроков"]),
    "",
    "Домашние материалы",
    ...(materials.length
      ? materials.map((x) => `- ${x.done ? "[готово]" : "[в работе]"} ${x.title}${x.url ? ` · ${x.url}` : ""}`)
      : ["- пока нет материалов"]),
    "",
    "Тренажёры и практика",
    ...(practice.length
      ? practice.map((x) => `- ${x.done ? "[готово]" : "[в работе]"} ${x.title}${x.level ? ` · ${x.level}` : ""}${x.url ? ` · ${x.url}` : ""}`)
      : ["- пока нет практики"]),
    "",
  ].join("\n");
}

export function initStudentCabinet(ctx) {
  const { me } = ctx;

  function renderAll() {
    const state = loadState();
    renderScheduleTimeline(state, me.id);
    renderLessonsTable(state, me.id);
    renderHomeworkFromLessons(state, me.id);
    renderStudentItems(state, me.id);
    renderProgressBox(state, me.id);
  }

  renderAll();
  renderLabPicker();

  let eventOpen = false;
  let materialOpen = false;
  let practiceOpen = false;

  renderEventCreator(false);
  renderMaterialCreator(false);
  renderPracticeCreator(false);

  byId("addEventBtn")?.addEventListener("click", () => {
    eventOpen = !eventOpen;
    renderEventCreator(eventOpen);
    if (eventOpen) {
      byId("evCancelBtn")?.addEventListener("click", () => {
        eventOpen = false;
        renderEventCreator(false);
      });
      byId("evSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("evTitle"))?.value?.trim() || "";
        const date = /** @type {HTMLInputElement|null} */ (byId("evDate"))?.value || "";
        const time = /** @type {HTMLInputElement|null} */ (byId("evTime"))?.value || "12:00";
        const url = /** @type {HTMLInputElement|null} */ (byId("evLink"))?.value?.trim() || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("evDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, { studentId: me.id, kind: "schedule", title, details, url, at: getISOForLocalDateTime(date, time) });
        eventOpen = false;
        renderEventCreator(false);
        renderAll();
      });
    }
  });

  byId("addMaterialBtn")?.addEventListener("click", () => {
    materialOpen = !materialOpen;
    renderMaterialCreator(materialOpen);
    if (materialOpen) {
      byId("matCancelBtn")?.addEventListener("click", () => {
        materialOpen = false;
        renderMaterialCreator(false);
      });
      byId("matSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("matTitle"))?.value?.trim() || "";
        const url = /** @type {HTMLInputElement|null} */ (byId("matUrl"))?.value?.trim() || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("matDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, { studentId: me.id, kind: "material", title, details, url, done: false });
        materialOpen = false;
        renderMaterialCreator(false);
        renderAll();
      });
    }
  });

  byId("addPracticeBtn")?.addEventListener("click", () => {
    practiceOpen = !practiceOpen;
    renderPracticeCreator(practiceOpen);
    if (practiceOpen) {
      byId("prCancelBtn")?.addEventListener("click", () => {
        practiceOpen = false;
        renderPracticeCreator(false);
      });
      byId("prSaveBtn")?.addEventListener("click", () => {
        const title = /** @type {HTMLInputElement|null} */ (byId("prTitle"))?.value?.trim() || "";
        const minutes = Number((/** @type {HTMLInputElement|null} */ (byId("prMinutes"))?.value || "0").trim());
        const date = /** @type {HTMLInputElement|null} */ (byId("prDate"))?.value || "";
        const details = /** @type {HTMLTextAreaElement|null} */ (byId("prDetails"))?.value?.trim() || "";
        if (!title) return;
        const state = loadState();
        addStudentItem(state, {
          studentId: me.id,
          kind: "practice",
          title,
          details,
          minutes: Number.isFinite(minutes) ? Math.max(1, minutes) : 10,
          at: getISOForLocalDateTime(date, "12:00"),
          done: false,
        });
        practiceOpen = false;
        renderPracticeCreator(false);
        renderAll();
      });
    }
  });

  byId("addLabModuleBtn")?.addEventListener("click", () => {
    const moduleId = /** @type {HTMLSelectElement|null} */ (byId("labModuleSelect"))?.value || "";
    const due = /** @type {HTMLInputElement|null} */ (byId("labDueDate"))?.value || "";
    const module = LAB_MODULES.find((m) => m.id === moduleId);
    if (!module) return;
    const state = loadState();
    addStudentItem(state, {
      studentId: me.id,
      kind: "practice",
      title: module.title,
      details: `${module.description} ${t("Добавлено из LinguaBoost Лаб.", "Added from LinguaBoost Lab.")}`,
      url: withLabTheme(module.href),
      minutes: module.minutes,
      at: getISOForLocalDateTime(due, "12:00"),
      done: false,
      source: "linguaboost",
      moduleId: module.id,
      level: module.level,
    });
    renderAll();
  });

  byId("saveStudentNotesBtn")?.addEventListener("click", () => {
    const goals = /** @type {HTMLTextAreaElement|null} */ (byId("studentGoals"))?.value || "";
    const notes = /** @type {HTMLTextAreaElement|null} */ (byId("studentNotes"))?.value || "";
    const state = loadState();
    upsertProgress(state, me.id, { studentGoals: goals.trim(), studentNotes: notes.trim() });
    saveState(state);
    renderAll();
  });

  byId("downloadProgressBtn")?.addEventListener("click", () => {
    const state = loadState();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`nge-student-progress-${stamp}.txt`, buildStudentReport(state, me.id, me.name));
  });

  const langBtn = byId("langBtn");
  langBtn?.addEventListener("click", () => {
    renderAll();
    renderLabPicker();
  });
}
