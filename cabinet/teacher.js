import {
  addLesson,
  addPayment,
  addStudentItem,
  addTeacherTask,
  deleteStudentItem,
  deleteTeacherTask,
  formatDateTime,
  getStudentMeta,
  getISOForLocalDateTime,
  getProgress,
  getUser,
  listLessonsForTeacher,
  listPaymentsForStudent,
  listParentsForStudent,
  listPendingNotifications,
  listStudentItems,
  listTeacherTasks,
  listStudents,
  loadState,
  PAYMENT_DETAILS,
  queueNotification,
  saveState,
  updateTeacherTask,
  upsertProgress,
  upsertStudentMeta,
  updateLesson,
  updatePayment,
} from "./core.js";

function isoAtNoon(dateStr) {
  const safeDate = dateStr || new Date().toISOString().slice(0, 10);
  const [yy, mm, dd] = safeDate.split("-").map((x) => Number(x));
  const local = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0);
  return local.toISOString();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
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
  return `<span class="pill" data-tone="${v.tone}">${escapeHtml(v.ru)}</span>`;
}

function byId(id) {
  return /** @type {HTMLElement|null} */ (document.getElementById(id));
}

function setHTML(id, html) {
  const el = byId(id);
  if (el) el.innerHTML = html;
}

function getLang() {
  return document.documentElement.getAttribute("lang") || "ru";
}

function t(ru, en) {
  return getLang() === "ru" ? ru : en;
}

function applyLessonsAfterPayment(state, payment) {
  const lessonsToAdd = Number(payment.lessonsAdded || 0);
  if (!lessonsToAdd || payment.lessonsAppliedAt) return;
  const meta = getStudentMeta(state, payment.studentId) || { studentId: payment.studentId, tariff: "", plan: "", remainingLessons: 0 };
  upsertStudentMeta(state, payment.studentId, {
    ...meta,
    remainingLessons: Number(meta.remainingLessons || 0) + lessonsToAdd,
  });
  updatePayment(state, payment.id, { lessonsAppliedAt: new Date().toISOString() });
}

function computeKPIs(state, teacherId) {
  const lessons = listLessonsForTeacher(state, teacherId);
  const planned = lessons.filter((l) => l.status === "planned");
  const done = lessons.filter((l) => l.status === "done");
  const missed = lessons.filter((l) => l.status === "missed");

  const payments = state.payments;
  const pendingPays = payments.filter((p) => p.status !== "paid");

  return [
    { k: t("ПЛАН", "PLANNED"), v: planned.length },
    { k: t("ГОТОВО", "DONE"), v: done.length },
    { k: t("ПРОПУСК", "MISSED"), v: missed.length },
    { k: t("ОПЛАТЫ", "PAYMENTS"), v: pendingPays.length },
  ];
}

function renderKpis(state, teacherId) {
  const kpis = computeKPIs(state, teacherId);
  const html = kpis
    .map(
      (x) => `
      <div class="kv">
        <div class="k">${escapeHtml(x.k)}</div>
        <div class="v">${escapeHtml(String(x.v))}</div>
      </div>`
    )
    .join("");
  setHTML("kpiGrid", html);
}

function teacherUid(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function ensureTeacherCollections(state) {
  if (!Array.isArray(state.reports)) state.reports = [];
  return state;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeICS(text) {
  return String(text || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function toICSDate(iso) {
  return new Date(iso).toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function downloadGoogleCalendarICS(state, teacherId) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//New Generation English//Teacher Cabinet//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  listLessonsForTeacher(state, teacherId).forEach((lesson) => {
    const start = new Date(lesson.date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    const student = usersById.get(lesson.studentId);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${lesson.id}@new-generation-english`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(start.toISOString())}`,
      `DTEND:${toICSDate(end.toISOString())}`,
      `SUMMARY:${escapeICS(`Урок английского · ${student?.name || "ученик"}`)}`,
      `DESCRIPTION:${escapeICS(`Статус: ${lesson.status}\nДомашка: ${lesson.homework || "—"}\nЗаметки: ${lesson.notes || "—"}${lesson.progressMeUrl ? `\nProgressMe: ${lesson.progressMeUrl}` : ""}`)}`,
      lesson.progressMeUrl ? `URL:${escapeICS(lesson.progressMeUrl)}` : "",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  downloadTextFile("nge-google-calendar.ics", lines.filter(Boolean).join("\r\n"));
}

function renderStudentCreator(state, teacherId) {
  const el = byId("studentCreator");
  const editor = byId("studentEditor");
  if (editor) editor.style.display = "none";
  if (!el) return;

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding:14px; border-radius:16px; border-color:var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новый ученик", "New student"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("Имя ученика", "Student name"))}
          <input id="newStudentName" placeholder="${escapeHtml(t("Напр.: Анна", "e.g. Anna"))}">
        </label>
        <label>${escapeHtml(t("Email ученика", "Student email"))}
          <input id="newStudentEmail" placeholder="student@example.com">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Имя родителя", "Parent name"))}
          <input id="newParentName" placeholder="${escapeHtml(t("Можно оставить пустым", "Optional"))}">
        </label>
        <label>${escapeHtml(t("Email родителя", "Parent email"))}
          <input id="newParentEmail" placeholder="parent@example.com">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <input id="newStudentLevel" placeholder="A1/A2/B1">
        </label>
        <label>${escapeHtml(t("Абонемент", "Subscription"))}
          <input id="newStudentTariff" placeholder="${escapeHtml(t("Индивидуально · 3500 ₽", "1:1 · 3500 ₽"))}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("План", "Plan"))}
          <input id="newStudentPlan" placeholder="${escapeHtml(t("1×/нед, вторник 14:00", "1×/week, Tue 14:00"))}">
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="createStudentBtn" type="button">${escapeHtml(t("Создать ученика", "Create student"))}</button>
        <button class="btn-mini" id="cancelStudentBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelStudentBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("createStudentBtn")?.addEventListener("click", () => {
    const name = /** @type {HTMLInputElement|null} */ (byId("newStudentName"))?.value.trim() || "";
    if (!name) return;
    const email = /** @type {HTMLInputElement|null} */ (byId("newStudentEmail"))?.value.trim() || `${teacherUid("student")}@example.com`;
    const parentName = /** @type {HTMLInputElement|null} */ (byId("newParentName"))?.value.trim() || "";
    const parentEmail = /** @type {HTMLInputElement|null} */ (byId("newParentEmail"))?.value.trim() || "";
    const level = /** @type {HTMLInputElement|null} */ (byId("newStudentLevel"))?.value.trim() || "";
    const tariff = /** @type {HTMLInputElement|null} */ (byId("newStudentTariff"))?.value.trim() || "";
    const plan = /** @type {HTMLInputElement|null} */ (byId("newStudentPlan"))?.value.trim() || "";

    const fresh = ensureTeacherCollections(loadState());
    const studentId = teacherUid("u_student");
    fresh.users.push({ id: studentId, role: "student", name, email });
    if (parentName || parentEmail) {
      fresh.users.push({
        id: teacherUid("u_parent"),
        role: "parent",
        name: parentName || "Родитель",
        email: parentEmail || `${teacherUid("parent")}@example.com`,
        linkedStudents: [studentId],
      });
    }
    upsertProgress(fresh, studentId, { level, goals: "", comments: "" });
    upsertStudentMeta(fresh, studentId, { tariff, plan });
    saveState(fresh);
    el.style.display = "none";
    renderStudents(loadState());
    renderKpis(loadState(), teacherId);
  });
}

function ensureTeacherControlNotice() {
  if (byId("teacherControlNotice")) return;
  const scopePanel = document.querySelector("#kpiGrid")?.closest("section")?.previousElementSibling?.querySelector(".panel");
  if (!scopePanel) return;
  const notice = document.createElement("div");
  notice.id = "teacherControlNotice";
  notice.className = "panel-sub";
  notice.style.cssText = "margin-top:12px; border-top:1px solid var(--line); padding-top:12px;";
  notice.textContent = t(
    "Важно: кабинет преподавателя должен полностью управлять двумя другими кабинетами. Всё, что назначено или изменено здесь, должно быть видно ученику и родителю: расписание, домашка, материалы, практика, прогресс, оплаты, уведомления и отчёты.",
    "Important: the teacher cabinet must fully control the other two cabinets. Everything assigned or changed here must be visible to the student and parent: schedule, homework, materials, practice, progress, payments, notifications, and reports."
  );
  scopePanel.appendChild(notice);
}

function renderStudents(state) {
  const students = listStudents(state);
  const rows = students
    .map((s) => {
      const p = getProgress(state, s.id);
      const meta = getStudentMeta(state, s.id);
      return `
        <tr data-student-row="1" data-id="${escapeHtml(s.id)}">
          <td><strong>${escapeHtml(s.name)}</strong><div class="panel-kicker">${escapeHtml(s.email)}</div></td>
          <td>${escapeHtml(p?.level || "—")}</td>
          <td class="muted">${escapeHtml((p?.goals || "").slice(0, 42) || "—")}</td>
          <td class="muted mono">${escapeHtml((meta?.tariff || "—").slice(0, 28))}</td>
        </tr>`;
    })
    .join("");

  setHTML(
    "studentsTable",
    `
    <thead>
      <tr>
        <th>${escapeHtml(t("Ученик", "Student"))}</th>
        <th>${escapeHtml(t("Уровень", "Level"))}</th>
        <th>${escapeHtml(t("Цели", "Goals"))}</th>
        <th>${escapeHtml(t("Тариф", "Tariff"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">${escapeHtml(t("Нет данных", "No data"))}</td></tr>`}</tbody>
  `
  );

  const table = byId("studentsTable");
  table?.querySelectorAll("[data-student-row]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.getAttribute("data-id");
      if (!id) return;
      renderStudentEditor(loadState(), id);
    });
  });
}

function renderStudentControlBridge(state, studentId) {
  const el = byId("studentControlBridge");
  if (!el) return;
  const items = listStudentItems(state, studentId).slice(0, 8);
  const rows = items.length
    ? items
        .map(
          (item) => `
          <div class="student-item-row">
            <div>
              <div><strong>${escapeHtml(item.title)}</strong></div>
              <div class="muted">${escapeHtml(item.kind)}${item.done ? " · выполнено" : ""}${item.details ? ` · ${escapeHtml(item.details)}` : ""}</div>
            </div>
            <div class="student-item-actions">
              <button class="btn-mini" type="button" data-remove-student-item="${escapeHtml(item.id)}">${escapeHtml(t("Убрать", "Remove"))}</button>
            </div>
          </div>`
        )
        .join("")
    : `<div class="muted">${escapeHtml(t("Пока нет назначений в кабинеты ученика и родителя.", "No assignments in student and parent cabinets yet."))}</div>`;

  el.innerHTML = `
    <div class="panel-kicker">${escapeHtml(t("Контроль кабинетов", "Cabinet control"))}</div>
    <p class="panel-sub" style="margin-bottom:10px;">${escapeHtml(
      t(
        "Преподаватель управляет тем, что увидят ученик и родитель: материалы, практика, тренажёры, статусы, прогресс, оплаты и уведомления.",
        "The teacher controls what the student and parent see: materials, practice, trainers, statuses, progress, payments, and notifications."
      )
    )}</p>
    ${rows}
    <div class="form-row" style="margin-top: 12px;">
      <label>${escapeHtml(t("Тип", "Type"))}
        <select id="teacherItemKind">
          <option value="material">${escapeHtml(t("Материал / домашка", "Material / homework"))}</option>
          <option value="practice">${escapeHtml(t("Практика / тренажёр", "Practice / trainer"))}</option>
        </select>
      </label>
      <label>${escapeHtml(t("Минуты", "Minutes"))}
        <input id="teacherItemMinutes" type="number" min="0" step="5" placeholder="15">
      </label>
    </div>
    <div class="form-row" style="grid-template-columns: 1fr;">
      <label>${escapeHtml(t("Название", "Title"))}
        <input id="teacherItemTitle" placeholder="${escapeHtml(t("Напр.: LinguaBoost · Travel verbs", "e.g. LinguaBoost · Travel verbs"))}">
      </label>
      <label>${escapeHtml(t("Комментарий", "Comment"))}
        <textarea id="teacherItemDetails" placeholder="${escapeHtml(t("Что сделать, на что обратить внимание…", "What to do, what to notice…"))}"></textarea>
      </label>
      <label>${escapeHtml(t("Ссылка", "Link"))}
        <input id="teacherItemUrl" placeholder="https://...">
      </label>
    </div>
    <div class="actions">
      <button class="btn-mini" data-primary id="teacherAssignItemBtn" type="button">${escapeHtml(t("Назначить в оба кабинета", "Assign to both cabinets"))}</button>
    </div>
  `;

  el.querySelectorAll("[data-remove-student-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-student-item");
      if (!id) return;
      const fresh = loadState();
      deleteStudentItem(fresh, id);
      saveState(fresh);
      renderStudentControlBridge(loadState(), studentId);
    });
  });

  byId("teacherAssignItemBtn")?.addEventListener("click", () => {
    const kind = /** @type {HTMLSelectElement|null} */ (byId("teacherItemKind"))?.value || "material";
    const title = /** @type {HTMLInputElement|null} */ (byId("teacherItemTitle"))?.value.trim() || "";
    const details = /** @type {HTMLTextAreaElement|null} */ (byId("teacherItemDetails"))?.value.trim() || "";
    const url = /** @type {HTMLInputElement|null} */ (byId("teacherItemUrl"))?.value.trim() || "";
    const minutesRaw = Number(/** @type {HTMLInputElement|null} */ (byId("teacherItemMinutes"))?.value || 0);
    if (!title) return;
    const fresh = loadState();
    addStudentItem(fresh, {
      studentId,
      kind,
      title,
      details,
      url,
      minutes: Number.isFinite(minutesRaw) ? minutesRaw : 0,
      done: false,
      at: new Date().toISOString(),
    });
    const student = getUser(fresh, studentId);
    listParentsForStudent(fresh, studentId).forEach((parent) => {
      queueNotification(fresh, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новое назначение",
          text: `${student?.name || "Ученик"} получил новое задание: ${title}${details ? `\n${details}` : ""}`,
          link: url || undefined,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(fresh);
    renderStudentControlBridge(loadState(), studentId);
    renderNotifications(loadState());
  });
}

function renderStudentEditor(state, studentId) {
  const el = byId("studentEditor");
  if (!el) return;
  const student = getUser(state, studentId);
  if (!student) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  const p = getProgress(state, studentId) || { studentId, level: "", goals: "", comments: "" };
  const meta = getStudentMeta(state, studentId) || { studentId, tariff: "—", plan: "" };

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Профиль ученика", "Student profile"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(student.name)}</h3>
        </div>
        <div class="actions">
          <button class="btn-mini" id="closeStudentBtn" type="button">${escapeHtml(t("Свернуть", "Collapse"))}</button>
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Уровень", "Level"))}
          <input id="studentLevel" value="${escapeHtml(p.level || "")}" placeholder="A1/A2/B1/B2...">
        </label>
        <label>${escapeHtml(t("Email", "Email"))}
          <input value="${escapeHtml(student.email)}" disabled>
        </label>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Тариф", "Tariff"))}
          <input id="studentTariff" value="${escapeHtml(meta.tariff || "")}" placeholder="${escapeHtml(t("Напр.: Индивидуально · 3500 ₽", "e.g. 1:1 · 3500 ₽"))}">
        </label>
        <label>${escapeHtml(t("План", "Plan"))}
          <input id="studentPlan" value="${escapeHtml(meta.plan || "")}" placeholder="${escapeHtml(t("Напр.: 2×/нед", "e.g. 2×/week"))}">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Цели", "Goals"))}
          <textarea id="studentGoals" placeholder="${escapeHtml(t("Коротко: что делаем и зачем…", "Short: goals and why…"))}">${escapeHtml(
            p.goals || ""
          )}</textarea>
        </label>
        <label>${escapeHtml(t("Комментарии", "Comments"))}
          <textarea id="studentComments" placeholder="${escapeHtml(t("Наблюдения и договорённости…", "Observations and agreements…"))}">${escapeHtml(
            p.comments || ""
          )}</textarea>
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="saveStudentBtn" type="button">${escapeHtml(t("Сохранить", "Save"))}</button>
      </div>

      <div id="studentControlBridge" style="margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px;"></div>
    </div>
  `;

  renderStudentControlBridge(state, studentId);

  byId("closeStudentBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("saveStudentBtn")?.addEventListener("click", () => {
    const level = /** @type {HTMLInputElement|null} */ (byId("studentLevel"))?.value || "";
    const tariff = /** @type {HTMLInputElement|null} */ (byId("studentTariff"))?.value || "";
    const plan = /** @type {HTMLInputElement|null} */ (byId("studentPlan"))?.value || "";
    const goals = /** @type {HTMLTextAreaElement|null} */ (byId("studentGoals"))?.value || "";
    const comments = /** @type {HTMLTextAreaElement|null} */ (byId("studentComments"))?.value || "";
    upsertProgress(state, studentId, { level: level.trim(), goals, comments });
    upsertStudentMeta(state, studentId, { tariff: tariff.trim(), plan: plan.trim() });
    saveState(state);
    renderStudents(loadState());
    renderNotifications(loadState());
  });
}

function renderLessons(state, teacherId, selectedLessonId = null) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const lessons = listLessonsForTeacher(state, teacherId);

  const rows = lessons
    .map((l) => {
      const student = usersById.get(l.studentId);
      const active = selectedLessonId && l.id === selectedLessonId ? ` style="background: color-mix(in srgb, var(--accent) 10%, transparent);"` : "";
      const link = l.progressMeUrl
        ? `<a class="footer-link" style="padding:4px 10px; border-radius:10px;" href="${escapeHtml(
            l.progressMeUrl
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Урок", "Lesson"))} ↗</a>`
        : `<span class="muted">${escapeHtml(t("—", "—"))}</span>`;

      return `
      <tr data-lesson-row="1" data-id="${escapeHtml(l.id)}"${active}>
        <td><div class="panel-kicker">${escapeHtml(formatDateTime(l.date))}</div><strong>${escapeHtml(student?.name || "—")}</strong></td>
        <td>${pill(l.status)}</td>
        <td class="muted">${escapeHtml((l.homework || "").slice(0, 54) || "—")}</td>
        <td>${link}</td>
      </tr>`;
    })
    .join("");

  setHTML(
    "lessonsTable",
    `
    <thead>
      <tr>
        <th>${escapeHtml(t("Дата", "Date"))}</th>
        <th>${escapeHtml(t("Статус", "Status"))}</th>
        <th>${escapeHtml(t("Домашка", "Homework"))}</th>
        <th>${escapeHtml(t("ProgressMe", "ProgressMe"))}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">${escapeHtml(t("Нет уроков", "No lessons"))}</td></tr>`}</tbody>
  `
  );

  const table = byId("lessonsTable");
  if (!table) return;
  table.querySelectorAll("[data-lesson-row]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.getAttribute("data-id");
      if (!id) return;
      renderLessons(loadState(), teacherId, id);
      renderLessonEditor(loadState(), teacherId, id);
    });
  });
}

function renderLessonEditor(state, teacherId, lessonId) {
  const lesson = state.lessons.find((l) => l.id === lessonId);
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const student = lesson ? usersById.get(lesson.studentId) : null;
  const el = byId("lessonEditor");
  const creator = byId("lessonCreator");
  if (creator) creator.style.display = "none";
  if (!el) return;
  if (!lesson) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  el.style.display = "block";

  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Редактор урока", "Lesson editor"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(student?.name || "—")} · ${escapeHtml(
    formatDateTime(lesson.date)
  )}</h3>
        </div>
        <div class="actions">
          ${
            lesson.progressMeUrl
              ? `<a class="btn-mini" href="${escapeHtml(lesson.progressMeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  t("Перейти", "Open")
                )} ↗</a>`
              : ""
          }
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="lessonStatus">
            <option value="planned"${lesson.status === "planned" ? " selected" : ""}>planned</option>
            <option value="done"${lesson.status === "done" ? " selected" : ""}>done</option>
            <option value="missed"${lesson.status === "missed" ? " selected" : ""}>missed</option>
          </select>
        </label>
        <label>${escapeHtml(t("ProgressMe URL", "ProgressMe URL"))}
          <input id="lessonProgressMe" value="${escapeHtml(lesson.progressMeUrl || "")}" placeholder="https://...">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Домашнее задание", "Homework"))}
          <textarea id="lessonHomework" placeholder="${escapeHtml(t("Текст домашки…", "Homework text…"))}">${escapeHtml(lesson.homework || "")}</textarea>
        </label>
        <label>${escapeHtml(t("Заметки преподавателя", "Teacher notes"))}
          <textarea id="lessonNotes" placeholder="${escapeHtml(t("Кратко: что было/что дальше…", "Short: what happened / next steps…"))}">${escapeHtml(
    lesson.notes || ""
  )}</textarea>
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="saveLessonBtn" type="button">${escapeHtml(t("Сохранить", "Save"))}</button>
        <button class="btn-mini" id="cancelLessonBtn" type="button">${escapeHtml(t("Свернуть", "Collapse"))}</button>
      </div>
    </div>
  `;

  const saveBtn = byId("saveLessonBtn");
  const cancelBtn = byId("cancelLessonBtn");
  const statusEl = /** @type {HTMLSelectElement|null} */ (byId("lessonStatus"));
  const hwEl = /** @type {HTMLTextAreaElement|null} */ (byId("lessonHomework"));
  const notesEl = /** @type {HTMLTextAreaElement|null} */ (byId("lessonNotes"));
  const urlEl = /** @type {HTMLInputElement|null} */ (byId("lessonProgressMe"));

  cancelBtn?.addEventListener("click", () => {
    if (el) el.style.display = "none";
  });

  saveBtn?.addEventListener("click", () => {
    const nextStatus = statusEl?.value || lesson.status;
    const prevStatus = lesson.status;
    const patched = updateLesson(state, lesson.id, {
      status: nextStatus,
      homework: hwEl?.value || "",
      notes: notesEl?.value || "",
      progressMeUrl: urlEl?.value?.trim() || "",
    });
    if (!patched) return;

    if (prevStatus !== "done" && nextStatus === "done") {
      const parents = listParentsForStudent(state, lesson.studentId);
      const link = urlEl?.value?.trim() || undefined;
      const hw = (hwEl?.value || "").trim();
      parents.forEach((p) => {
        queueNotification(state, {
          userId: p.id,
          channel: "telegram",
          payload: {
            title: "Урок проведён",
            text: `Урок с ${student?.name || "учеником"} отмечен как DONE.${hw ? `\n\nДомашка:\n${hw}` : ""}`,
            link,
          },
          sendAt: new Date().toISOString(),
        });
      });
      saveState(state);
    }

    renderKpis(loadState(), teacherId);
    renderLessons(loadState(), teacherId, lesson.id);
    renderNotifications(loadState());
  });
}

function renderLessonCreator(state, teacherId) {
  const el = byId("lessonCreator");
  const editor = byId("lessonEditor");
  if (editor) editor.style.display = "none";
  if (!el) return;

  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  const nowDate = new Date().toISOString().slice(0, 10);

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-head" style="margin-bottom: 10px;">
        <div>
          <div class="panel-kicker">${escapeHtml(t("Создать урок", "Create lesson"))}</div>
          <h3 class="panel-title" style="font-size: 15px; margin:0;">${escapeHtml(t("Новый урок", "New lesson"))}</h3>
        </div>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="newLessonStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="newLessonStatus">
            <option value="planned" selected>planned</option>
            <option value="done">done</option>
            <option value="missed">missed</option>
          </select>
        </label>
      </div>

      <div class="form-row">
        <label>${escapeHtml(t("Дата", "Date"))}
          <input id="newLessonDate" type="date" value="${escapeHtml(nowDate)}">
        </label>
        <label>${escapeHtml(t("Время", "Time"))}
          <input id="newLessonTime" type="time" value="12:00">
        </label>
      </div>

      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Домашка (черновик)", "Homework (draft)"))}
          <textarea id="newLessonHomework" placeholder="${escapeHtml(t("Что задать…", "What to assign…"))}"></textarea>
        </label>
        <label>${escapeHtml(t("ProgressMe URL (опционально)", "ProgressMe URL (optional)"))}
          <input id="newLessonProgressMe" placeholder="https://...">
        </label>
      </div>

      <div class="actions">
        <button class="btn-mini" data-primary id="createLessonBtn" type="button">${escapeHtml(t("Создать", "Create"))}</button>
        <button class="btn-mini" id="cancelCreateLessonBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelCreateLessonBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("createLessonBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("newLessonStudent"))?.value;
    const status = /** @type {HTMLSelectElement|null} */ (byId("newLessonStatus"))?.value || "planned";
    const date = /** @type {HTMLInputElement|null} */ (byId("newLessonDate"))?.value;
    const time = /** @type {HTMLInputElement|null} */ (byId("newLessonTime"))?.value;
    const homework = /** @type {HTMLTextAreaElement|null} */ (byId("newLessonHomework"))?.value || "";
    const progressMeUrl = /** @type {HTMLInputElement|null} */ (byId("newLessonProgressMe"))?.value?.trim() || "";

    if (!studentId) return;
    addLesson(state, {
      studentId,
      teacherId,
      date: getISOForLocalDateTime(date, time),
      status,
      homework,
      notes: "",
      progressMeUrl,
    });
    saveState(state);
    el.style.display = "none";

    renderKpis(loadState(), teacherId);
    renderLessons(loadState(), teacherId);
  });
}

function renderPayments(state) {
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const paymentGuide = `
    <div class="payment-guide">
      <div>
        <div class="panel-kicker">${escapeHtml(t("Ссылка для родителей", "Parent payment link"))}</div>
        <strong>${escapeHtml(PAYMENT_DETAILS.method)} · ${escapeHtml(PAYMENT_DETAILS.recipient)}</strong>
        <div class="muted">${escapeHtml(t("Телефон", "Phone"))}: ${escapeHtml(PAYMENT_DETAILS.phone)}</div>
        <div class="muted">${escapeHtml(t("Назначение", "Purpose"))}: ${escapeHtml(PAYMENT_DETAILS.purpose)}</div>
      </div>
      <div class="payment-guide-actions">
        <a class="btn-mini" data-primary href="${escapeHtml(PAYMENT_DETAILS.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("Открыть", "Open"))}</a>
      </div>
    </div>
  `;

  const items = paymentGuide + state.payments
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .map((p) => {
      const student = usersById.get(p.studentId);
      return `
        <div class="payment-card" data-payment-card="${escapeHtml(p.id)}">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(p.date))}</div>
            ${p.paidReportedAt ? `<div class="muted">${escapeHtml(t("Родитель отметил оплату", "Parent reported payment"))}: ${escapeHtml(formatDateTime(p.paidReportedAt))}</div>` : ""}
            ${p.confirmedAt ? `<div class="muted">${escapeHtml(t("Подтверждено", "Confirmed"))}: ${escapeHtml(formatDateTime(p.confirmedAt))}</div>` : ""}
            ${p.receiptIssuedAt ? `<div class="muted">${escapeHtml(t("Чек выдан", "Receipt issued"))}: ${escapeHtml(formatDateTime(p.receiptIssuedAt))}</div>` : ""}
            <div><strong>${escapeHtml(student?.name || "—")}</strong> · <span class="muted">${escapeHtml(p.comment || "")}</span></div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="mono"><strong>${escapeHtml(String(p.amount))} ₽</strong></span>
            ${pill(p.status)}
            <button class="btn-mini" type="button" data-pay-id="${escapeHtml(p.id)}">${escapeHtml(t("Статус", "Status"))}</button>
          </div>
          <div class="payment-edit">
            <label>${escapeHtml(t("Занятий добавить", "Lessons to add"))}
              <input type="number" min="0" step="1" value="${escapeHtml(String(p.lessonsAdded || 0))}" data-lessons-added="${escapeHtml(p.id)}">
            </label>
            <label>${escapeHtml(t("Номер чека", "Receipt number"))}
              <input value="${escapeHtml(p.receiptNumber || "")}" placeholder="${escapeHtml(t("по желанию", "optional"))}" data-receipt-number="${escapeHtml(p.id)}">
            </label>
            <label>${escapeHtml(t("Ссылка на чек", "Receipt link"))}
              <input value="${escapeHtml(p.receiptUrl || "")}" placeholder="https://..." data-receipt-url="${escapeHtml(p.id)}">
            </label>
          </div>
          <div class="actions">
            <button class="btn-mini" data-primary type="button" data-confirm-pay="${escapeHtml(p.id)}">${escapeHtml(t("Подтвердить оплату", "Confirm payment"))}</button>
            <button class="btn-mini" type="button" data-save-receipt="${escapeHtml(p.id)}">${escapeHtml(t("Сохранить чек", "Save receipt"))}</button>
          </div>
        </div>`;
    })
    .join("");

  setHTML("paymentsList", items || `<div class="muted">${escapeHtml(t("Пока нет оплат", "No payments yet"))}</div>`);

  byId("paymentsList")?.querySelectorAll("[data-pay-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pay-id");
      if (!id) return;
      const p = state.payments.find((x) => x.id === id);
      if (!p) return;
      const next = p.status === "paid" ? "pending" : p.status === "pending" ? "overdue" : "paid";
      updatePayment(state, id, { status: next });
      saveState(state);
      renderPayments(loadState());
    });
  });

  byId("paymentsList")?.querySelectorAll("[data-save-receipt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-save-receipt");
      if (!id) return;
      const receiptUrl = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-url="${CSS.escape(id)}"]`))?.value || "";
      const receiptNumber = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-number="${CSS.escape(id)}"]`))?.value || "";
      const lessonsAdded = Number((/** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-lessons-added="${CSS.escape(id)}"]`))?.value || "0").trim());
      updatePayment(state, id, {
        receiptUrl: receiptUrl.trim(),
        receiptNumber: receiptNumber.trim(),
        receiptIssuedAt: receiptUrl.trim() || receiptNumber.trim() ? new Date().toISOString() : undefined,
        lessonsAdded: Number.isFinite(lessonsAdded) ? lessonsAdded : 0,
      });
      renderPayments(loadState());
    });
  });

  byId("paymentsList")?.querySelectorAll("[data-confirm-pay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-confirm-pay");
      if (!id) return;
      const fresh = loadState();
      const payment = fresh.payments.find((x) => x.id === id);
      if (!payment) return;
      const lessonsAdded = Number((/** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-lessons-added="${CSS.escape(id)}"]`))?.value || "0").trim());
      const receiptUrl = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-url="${CSS.escape(id)}"]`))?.value || "";
      const receiptNumber = /** @type {HTMLInputElement|null} */ (byId("paymentsList")?.querySelector(`[data-receipt-number="${CSS.escape(id)}"]`))?.value || "";
      updatePayment(fresh, id, {
        status: "paid",
        confirmedAt: new Date().toISOString(),
        lessonsAdded: Number.isFinite(lessonsAdded) ? lessonsAdded : 0,
        receiptUrl: receiptUrl.trim(),
        receiptNumber: receiptNumber.trim(),
        receiptIssuedAt: receiptUrl.trim() || receiptNumber.trim() ? new Date().toISOString() : payment.receiptIssuedAt,
      });
      const updated = loadState().payments.find((x) => x.id === id);
      if (updated) applyLessonsAfterPayment(loadState(), updated);
      renderPayments(loadState());
      renderStudents(loadState());
      renderKpis(loadState(), document.body.dataset.teacherId || "u_teacher_1");
    });
  });
}

function renderPaymentCreator(state) {
  const el = byId("paymentCreator");
  if (!el) return;
  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  const today = new Date().toISOString().slice(0, 10);

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новая оплата", "New payment"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="newPayStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Сумма (₽)", "Amount (₽)"))}
          <input id="newPayAmount" type="number" value="3000" min="0">
        </label>
      </div>
      <div class="form-row">
        <label>${escapeHtml(t("Дата", "Date"))}
          <input id="newPayDate" type="date" value="${escapeHtml(today)}">
        </label>
        <label>${escapeHtml(t("Статус", "Status"))}
          <select id="newPayStatus">
            <option value="pending" selected>pending</option>
            <option value="paid">paid</option>
            <option value="overdue">overdue</option>
          </select>
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Комментарий", "Comment"))}
          <input id="newPayComment" placeholder="${escapeHtml(t("Например: индивидуально / пакет", "e.g. individual / bundle"))}">
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="createPayBtn" type="button">${escapeHtml(t("Добавить", "Add"))}</button>
        <button class="btn-mini" id="cancelPayBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelPayBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("createPayBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("newPayStudent"))?.value;
    const amount = Number((/** @type {HTMLInputElement|null} */ (byId("newPayAmount"))?.value || "0").trim());
    const dateStr = /** @type {HTMLInputElement|null} */ (byId("newPayDate"))?.value;
    const status = /** @type {HTMLSelectElement|null} */ (byId("newPayStatus"))?.value || "pending";
    const comment = /** @type {HTMLInputElement|null} */ (byId("newPayComment"))?.value || "";

    if (!studentId) return;
    addPayment(state, {
      studentId,
      amount: Number.isFinite(amount) ? amount : 0,
      status,
      date: isoAtNoon(dateStr),
      comment,
    });
    saveState(state);
    el.style.display = "none";
    renderPayments(loadState());
  });
}

function renderTasks(state, teacherId) {
  const tasks = listTeacherTasks(state, teacherId);
  const html = tasks
    .map((x) => {
      const done = x.status === "done";
      const due = x.due ? `<span class="panel-kicker">${escapeHtml(x.due)}</span>` : `<span class="muted">—</span>`;
      return `
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding: 10px 0; border-bottom: 1px solid var(--line);">
          <div style="${done ? "opacity:.7; text-decoration: line-through;" : ""}">
            <div><strong>${escapeHtml(x.title)}</strong></div>
            <div style="margin-top: 4px; display:flex; gap: 10px; align-items:center; flex-wrap:wrap;">
              ${due}
              ${x.notes ? `<span class="muted">${escapeHtml(x.notes)}</span>` : ""}
            </div>
          </div>
          <div style="display:flex; gap: 8px;">
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-toggle="${escapeHtml(x.id)}">${escapeHtml(
        done ? "↺" : "✓"
      )}</button>
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-edit="${escapeHtml(x.id)}">${escapeHtml(
        t("Ред.", "Edit")
      )}</button>
            <button class="btn-mini" style="min-height:32px; padding:0 10px;" type="button" data-task-del="${escapeHtml(x.id)}">×</button>
          </div>
        </div>
      `;
    })
    .join("");

  setHTML("tasksList", html || `<div class="muted">${escapeHtml(t("Пока нет задач", "No tasks yet"))}</div>`);

  byId("tasksList")?.querySelectorAll("[data-task-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-toggle") || "";
      const fresh = loadState();
      const cur = fresh.teacherTasks.find((t) => t.id === id);
      if (!cur) return;
      updateTeacherTask(fresh, id, { status: cur.status === "done" ? "open" : "done" });
      renderTasks(loadState(), teacherId);
      renderKpis(loadState(), teacherId);
    });
  });

  byId("tasksList")?.querySelectorAll("[data-task-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-del") || "";
      const fresh = loadState();
      deleteTeacherTask(fresh, id);
      const creator = byId("taskCreator");
      if (creator) creator.style.display = "none";
      renderTasks(loadState(), teacherId);
      renderKpis(loadState(), teacherId);
    });
  });

  byId("tasksList")?.querySelectorAll("[data-task-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task-edit") || "";
      const fresh = loadState();
      const task = fresh.teacherTasks.find((t) => t.id === id);
      if (!task) return;
      renderTaskCreator(fresh, teacherId, task);
    });
  });
}

function renderTaskCreator(state, teacherId, task = null) {
  const el = byId("taskCreator");
  if (!el) return;

  const isEdit = Boolean(task);
  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding: 14px; border-radius: 16px; border-color: var(--line-2);">
      <div class="panel-kicker">${escapeHtml(isEdit ? t("Редактировать задачу", "Edit task") : t("Новая задача", "New task"))}</div>
      <div class="form-row" style="grid-template-columns: 1fr 180px;">
        <label>${escapeHtml(t("Заголовок", "Title"))}
          <input id="taskTitle" value="${escapeHtml(task?.title || "")}" placeholder="${escapeHtml(t("Например: подготовить материалы…", "e.g. prepare materials…"))}">
        </label>
        <label>${escapeHtml(t("Срок (опционально)", "Due (optional)"))}
          <input id="taskDue" type="date" value="${escapeHtml(task?.due || "")}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Заметка", "Note"))}
          <textarea id="taskNotes" placeholder="${escapeHtml(t("Детали…", "Details…"))}">${escapeHtml(task?.notes || "")}</textarea>
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="taskSaveBtn" type="button">${escapeHtml(isEdit ? t("Сохранить", "Save") : t("Добавить", "Add"))}</button>
        <button class="btn-mini" id="taskCancelBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("taskCancelBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });
  byId("taskSaveBtn")?.addEventListener("click", () => {
    const title = /** @type {HTMLInputElement|null} */ (byId("taskTitle"))?.value?.trim() || "";
    const due = /** @type {HTMLInputElement|null} */ (byId("taskDue"))?.value || "";
    const notes = /** @type {HTMLTextAreaElement|null} */ (byId("taskNotes"))?.value?.trim() || "";
    if (!title) return;

    if (task) {
      updateTeacherTask(state, task.id, { title, due: due || "", notes });
    } else {
      addTeacherTask(state, { teacherId, title, due: due || "", notes, status: "open" });
    }
    saveState(state);
    el.style.display = "none";
    renderTasks(loadState(), teacherId);
    renderKpis(loadState(), teacherId);
  });
}

function renderNotifications(state) {
  const pending = listPendingNotifications(state);
  const html = pending
    .slice(0, 8)
    .map((n) => {
      const payload = `${n.payload.title}\n${n.payload.text}${n.payload.link ? `\n${n.payload.link}` : ""}`;
      return `
        <div style="border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div class="panel-kicker">${escapeHtml(formatDateTime(n.sendAt))} · ${escapeHtml(n.channel)}</div>
              <div><strong>${escapeHtml(n.payload.title)}</strong></div>
            </div>
            <button class="btn-mini" type="button" data-copy="${escapeHtml(payload)}">${escapeHtml(t("Копировать", "Copy"))}</button>
          </div>
          <div class="muted" style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(n.payload.text)}</div>
        </div>`;
    })
    .join("");

  setHTML("notifList", html || `<div class="muted">${escapeHtml(t("Очередь пуста", "Queue is empty"))}</div>`);

  byId("notifList")?.querySelectorAll("[data-copy]").forEach((btn) => {
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

function buildTeacherReportText(state, report) {
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

function renderReports(state) {
  ensureTeacherCollections(state);
  const usersById = new Map(state.users.map((u) => [u.id, u]));
  const html = state.reports
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((report) => {
      const student = usersById.get(report.studentId);
      return `
        <div class="student-item-row">
          <div>
            <div class="panel-kicker">${escapeHtml(formatDateTime(report.createdAt))} · ${escapeHtml(student?.name || "—")}</div>
            <div><strong>${escapeHtml(report.title || "Отчёт")}</strong></div>
            <div class="muted">${escapeHtml((report.body || "").slice(0, 120))}</div>
          </div>
          <div class="student-item-actions">
            <button class="btn-mini" type="button" data-download-report="${escapeHtml(report.id)}">${escapeHtml(t("Скачать", "Download"))}</button>
          </div>
        </div>
      `;
    })
    .join("");

  setHTML("reportsList", html || `<div class="muted">${escapeHtml(t("Отчётов пока нет", "No reports yet"))}</div>`);

  byId("reportsList")?.querySelectorAll("[data-download-report]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-download-report");
      const fresh = ensureTeacherCollections(loadState());
      const report = fresh.reports.find((x) => x.id === id);
      if (!report) return;
      const student = getUser(fresh, report.studentId);
      const safeName = (student?.name || "student").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
      downloadTextFile(`nge-teacher-report-${safeName}.txt`, buildTeacherReportText(fresh, report));
    });
  });
}

function renderReportCreator(state) {
  const el = byId("reportCreator");
  if (!el) return;
  const students = listStudents(state);
  const options = students.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");

  el.style.display = "block";
  el.innerHTML = `
    <div class="panel" style="padding:14px; border-radius:16px; border-color:var(--line-2);">
      <div class="panel-kicker">${escapeHtml(t("Новый отчёт", "New report"))}</div>
      <div class="form-row">
        <label>${escapeHtml(t("Ученик", "Student"))}
          <select id="reportStudent">${options}</select>
        </label>
        <label>${escapeHtml(t("Название отчёта", "Report title"))}
          <input id="reportTitle" value="${escapeHtml(t("Отчёт об успеваемости", "Progress report"))}">
        </label>
      </div>
      <div class="form-row" style="grid-template-columns: 1fr;">
        <label>${escapeHtml(t("Текст отчёта", "Report text"))}
          <textarea id="reportBody" placeholder="${escapeHtml(t("Что получилось, где сложность, что делаем дальше…", "What worked, what is hard, what comes next…"))}"></textarea>
        </label>
      </div>
      <div class="actions">
        <button class="btn-mini" data-primary id="saveReportBtn" type="button">${escapeHtml(t("Сохранить и уведомить", "Save and notify"))}</button>
        <button class="btn-mini" id="downloadDraftReportBtn" type="button">${escapeHtml(t("Скачать черновик", "Download draft"))}</button>
        <button class="btn-mini" id="cancelReportBtn" type="button">${escapeHtml(t("Отмена", "Cancel"))}</button>
      </div>
    </div>
  `;

  byId("cancelReportBtn")?.addEventListener("click", () => {
    el.style.display = "none";
  });

  byId("downloadDraftReportBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("reportStudent"))?.value || "";
    const report = {
      id: "draft",
      studentId,
      title: /** @type {HTMLInputElement|null} */ (byId("reportTitle"))?.value.trim() || "Отчёт",
      body: /** @type {HTMLTextAreaElement|null} */ (byId("reportBody"))?.value.trim() || "",
      createdAt: new Date().toISOString(),
    };
    downloadTextFile("nge-teacher-report-draft.txt", buildTeacherReportText(loadState(), report));
  });

  byId("saveReportBtn")?.addEventListener("click", () => {
    const studentId = /** @type {HTMLSelectElement|null} */ (byId("reportStudent"))?.value || "";
    const title = /** @type {HTMLInputElement|null} */ (byId("reportTitle"))?.value.trim() || "Отчёт";
    const body = /** @type {HTMLTextAreaElement|null} */ (byId("reportBody"))?.value.trim() || "";
    if (!studentId || !body) return;
    const fresh = ensureTeacherCollections(loadState());
    const report = { id: teacherUid("report"), studentId, title, body, createdAt: new Date().toISOString() };
    fresh.reports.push(report);
    addStudentItem(fresh, {
      studentId,
      kind: "material",
      title,
      details: body,
      url: "",
      done: false,
      at: report.createdAt,
    });
    const student = getUser(fresh, studentId);
    listParentsForStudent(fresh, studentId).forEach((parent) => {
      queueNotification(fresh, {
        userId: parent.id,
        channel: "telegram",
        payload: {
          title: "Новый отчёт преподавателя",
          text: `${student?.name || "Ученик"}: ${title}\n\n${body}`,
        },
        sendAt: new Date().toISOString(),
      });
    });
    saveState(fresh);
    el.style.display = "none";
    renderReports(loadState());
    renderNotifications(loadState());
  });
}

export function initTeacherCabinet(ctx) {
  const { me } = ctx;

  const state = loadState();
  ensureTeacherControlNotice();
  renderKpis(state, me.id);
  renderStudents(state);
  renderLessons(state, me.id);
  renderPayments(state);
  renderTasks(state, me.id);
  renderReports(state);
  renderNotifications(state);

  byId("exportCalendarBtn")?.addEventListener("click", () => {
    downloadGoogleCalendarICS(loadState(), me.id);
  });

  byId("addLessonBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    renderLessonCreator(fresh, me.id);
  });

  byId("addStudentBtn")?.addEventListener("click", () => {
    renderStudentCreator(loadState(), me.id);
  });

  byId("addPaymentBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    const el = byId("paymentCreator");
    if (el) {
      if (el.style.display === "none" || !el.style.display) renderPaymentCreator(fresh);
      else el.style.display = "none";
    }
  });

  byId("addTaskBtn")?.addEventListener("click", () => {
    const fresh = loadState();
    const el = byId("taskCreator");
    if (el) {
      if (el.style.display === "none" || !el.style.display) renderTaskCreator(fresh, me.id, null);
      else el.style.display = "none";
    }
  });

  byId("addReportBtn")?.addEventListener("click", () => {
    renderReportCreator(loadState());
  });

  // Re-render when language toggles (simple approach)
  const langBtn = byId("langBtn");
  langBtn?.addEventListener("click", () => {
    const fresh = loadState();
    renderKpis(fresh, me.id);
    renderStudents(fresh);
    renderLessons(fresh, me.id);
    renderPayments(fresh);
    renderTasks(fresh, me.id);
    renderReports(fresh);
    renderNotifications(fresh);
  });
}
