(function () {
  "use strict";

  var STORAGE_KEY = "nge_os_v1";
  var SESSION_KEY = "nge_os_session_v1";
  var THEME_KEY = "nge-cabinet-theme";

  var LAB_MODULES = [
    ["pre-a1-hello-classroom", "PRE-A1", "Hello Classroom Fun", "First words", "Kids / beginners", "../lingua-boost-lab/pre-a1/hello-classroom-fun.html", 10, "Первые слова, приветствия и игровые задания для самого старта."],
    ["a1-school-pronouns", "A1", "School Words and Pronouns", "Vocabulary and pronouns", "Kids / beginners", "../lingua-boost-lab/a1/school-words-and-pronouns.html", 15, "Школьная лексика, местоимения, карточки и простая игровая практика."],
    ["a1-prepositions-world", "A1", "Prepositions World", "Prepositions", "Kids / beginners", "../lingua-boost-lab/a1/prepositions-world.html", 12, "Предлоги места через визуальные задания и короткие тренировки."],
    ["a1-past-simple", "A1", "Past Simple Adventure", "Past Simple", "Kids / teens", "../lingua-boost-lab/a1/past-simple-adventure.html", 15, "Игровая тренировка Past Simple с короткими заданиями."],
    ["a2-core-trainer", "A2", "Core Trainer A2-B1", "Core skills", "Teens / adults", "../lingua-boost-lab/a2/core-trainer-a2-b1.html", 20, "Базовая системная тренировка для перехода к уверенному B1."],
    ["b1-word-building", "B1", "Word Building: Prefixes and Suffixes", "Word formation", "Teens / exams", "../lingua-boost-lab/b1/word-building-prefixes-and-suffixes.html", 20, "Словообразование, приставки, суффиксы и экзаменационная практика."],
    ["b1-restaurant-menu", "B1", "Restaurant Menu Lab", "Speaking and rubric", "Teens / adults", "../lingua-boost-lab/b1/restaurant-menu-lab.html", 20, "Food vocabulary, speaking task и понятная рубрика для устного ответа."],
    ["b2-geo-articles", "B2+", "Articles with Geographical Names", "Articles", "Advanced", "../lingua-boost-lab/b2-plus/articles-with-geographical-names.html", 25, "Артикли с географическими названиями и продвинутая грамматика."],
  ].map(function (x) {
    return { id: x[0], level: x[1], title: x[2], topic: x[3], audience: x[4], href: x[5], minutes: x[6], description: x[7] };
  });

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function esc(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function lang() {
    return document.documentElement.getAttribute("lang") || "ru";
  }

  function tr(ru, en) {
    return lang() === "ru" ? ru : en;
  }

  function localISODate(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function isoFor(dateStr, timeStr) {
    var parts = (dateStr || localISODate()).split("-").map(Number);
    var t = (timeStr || "12:00").split(":").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], t[0] || 0, t[1] || 0).toISOString();
  }

  function formatDateTime(iso) {
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  function seed() {
    var teacherId = "u_teacher_1";
    var studentId = "u_student_1";
    var parentId = "u_parent_1";
    return {
      users: [
        { id: teacherId, role: "teacher", name: "Мария", email: "teacher@example.com" },
        { id: studentId, role: "student", name: "Ученик", email: "student@example.com" },
        { id: parentId, role: "parent", name: "Родитель", email: "parent@example.com", linkedStudents: [studentId] },
      ],
      lessons: [
        {
          id: "l_1",
          studentId: studentId,
          teacherId: teacherId,
          date: isoFor(localISODate(1), "17:00"),
          status: "planned",
          homework: "Повторить Past Simple: 10 примеров + 15 минут чтения.",
          notes: "",
          progressMeUrl: "https://progressme.ru/",
        },
        {
          id: "l_2",
          studentId: studentId,
          teacherId: teacherId,
          date: isoFor(localISODate(4), "18:30"),
          status: "planned",
          homework: "Подготовить speaking по теме Travel.",
          notes: "",
        },
        {
          id: "l_3",
          studentId: studentId,
          teacherId: teacherId,
          date: isoFor(localISODate(-2), "17:00"),
          status: "done",
          homework: "Закрепить лексику Travel.",
          notes: "Хорошая динамика, следующий шаг: speaking drills.",
        },
      ],
      payments: [],
      progress: [
        {
          studentId: studentId,
          level: "A2",
          goals: "Speaking + travel vocabulary",
          comments: "Уверенность растёт. Важно держать короткую регулярную практику.",
          studentGoals: "",
          studentNotes: "",
        },
      ],
      studentItems: [
        {
          id: "si_1",
          studentId: studentId,
          kind: "practice",
          title: "Speaking drill",
          details: "10 минут: вопросы и ответы по теме Travel.",
          minutes: 10,
          at: isoFor(localISODate(0), "12:00"),
          done: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "si_2",
          studentId: studentId,
          kind: "material",
          title: "Список слов: Travel",
          details: "Повторить и составить 10 примеров.",
          url: "",
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
      studentMeta: [],
      teacherTasks: [],
      notifications: [],
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var s = raw ? JSON.parse(raw) : seed();
      if (!s || typeof s !== "object") s = seed();
      ["users", "lessons", "payments", "progress", "studentItems", "studentMeta", "teacherTasks", "notifications"].forEach(function (key) {
        if (!Array.isArray(s[key])) s[key] = [];
      });
      if (!s.users.some(function (u) { return u.role === "student"; })) return seed();
      return s;
    } catch (e) {
      return seed();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureStudent() {
    var state = loadState();
    var user = state.users.find(function (u) { return u.role === "student"; });
    if (!user) {
      state = seed();
      user = state.users.find(function (u) { return u.role === "student"; });
      saveState(state);
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role: "student", userId: user.id }));
    return user;
  }

  function listLessons(state, studentId) {
    return state.lessons.filter(function (x) { return x.studentId === studentId; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  }

  function listItems(state, studentId, kind) {
    return state.studentItems
      .filter(function (x) { return x.studentId === studentId && (!kind || x.kind === kind); })
      .sort(function (a, b) { return new Date(b.at || b.createdAt) - new Date(a.at || a.createdAt); });
  }

  function getProgress(state, studentId) {
    return state.progress.find(function (p) { return p.studentId === studentId; }) || null;
  }

  function saveProgress(state, studentId, patch) {
    var p = getProgress(state, studentId);
    if (!p) {
      p = { studentId: studentId, level: "—", goals: "", comments: "", studentGoals: "", studentNotes: "" };
      state.progress.push(p);
    }
    Object.assign(p, patch);
    saveState(state);
  }

  function addItem(state, input) {
    state.studentItems.push(Object.assign({ id: uid("si"), createdAt: new Date().toISOString() }, input));
    saveState(state);
  }

  function updateItem(state, id, patch) {
    var item = state.studentItems.find(function (x) { return x.id === id; });
    if (!item) return;
    Object.assign(item, patch);
    saveState(state);
  }

  function deleteItem(state, id) {
    state.studentItems = state.studentItems.filter(function (x) { return x.id !== id; });
    saveState(state);
  }

  function pill(text, tone) {
    return '<span class="pill"' + (tone ? ' data-tone="' + esc(tone) + '"' : "") + ">" + esc(text) + "</span>";
  }

  function distanceLabel(iso) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    var days = Math.round((target - today) / 86400000);
    if (days === 0) return "сегодня";
    if (days === 1) return "завтра";
    if (days > 1) return "через " + days + " дн.";
    return Math.abs(days) + " дн. назад";
  }

  function renderTimeline(state, studentId) {
    var lessons = listLessons(state, studentId)
      .filter(function (l) { return new Date(l.date).getTime() >= Date.now() - 86400000; })
      .slice(0, 4)
      .map(function (l) {
        return { title: "Урок с преподавателем", at: l.date, details: l.homework, status: l.status, url: l.progressMeUrl || "" };
      });
    var events = listItems(state, studentId, "schedule").slice(0, 4).map(function (x) {
      return { title: x.title, at: x.at || x.createdAt, details: x.details || "", status: "planned", url: x.url || "" };
    });
    var items = lessons.concat(events).sort(function (a, b) { return new Date(a.at) - new Date(b.at); }).slice(0, 6);
    var el = byId("scheduleTimeline");
    if (!el) return;
    el.innerHTML = items.length
      ? items.map(function (x, index) {
          return '<article class="timeline-item" style="--i:' + index + '">' +
            '<div class="timeline-dot"></div><div class="timeline-body">' +
            '<div class="timeline-meta">' + esc(formatDateTime(x.at)) + " · " + esc(distanceLabel(x.at)) + "</div>" +
            '<div class="timeline-title">' + esc(x.title) + "</div>" +
            (x.details ? '<div class="timeline-text">' + esc(x.details) + "</div>" : "") +
            '<div class="timeline-actions">' + pill(x.status, x.status === "done" ? "ok" : "warn") +
            (x.url ? '<a class="btn-mini timeline-open" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Открыть</a>' : "") +
            "</div></div></article>";
        }).join("")
      : '<div class="muted">Ближайших событий пока нет.</div>';
  }

  function renderLessons(state, studentId) {
    var rows = listLessons(state, studentId).slice(-8).reverse().map(function (l) {
      return "<tr><td><div class=\"panel-kicker\">" + esc(formatDateTime(l.date)) + "</div><strong>" + esc(l.status) + "</strong></td>" +
        "<td class=\"muted\">" + esc(l.homework || "—") + "</td><td>" +
        (l.progressMeUrl ? '<a class="footer-link" style="padding:4px 10px;border-radius:10px;" href="' + esc(l.progressMeUrl) + '" target="_blank" rel="noopener noreferrer">Урок ↗</a>' : '<span class="muted">—</span>') +
        "</td></tr>";
    }).join("");
    var table = byId("studentLessonsTable");
    if (table) table.innerHTML = "<thead><tr><th>Дата</th><th>Домашка</th><th>Ссылка</th></tr></thead><tbody>" + (rows || '<tr><td colspan="3" class="muted">Пока нет уроков</td></tr>') + "</tbody>";
  }

  function itemRow(x, kind) {
    var done = x.done ? ' style="opacity:.7;text-decoration:line-through;"' : "";
    var meta = [x.at ? formatDateTime(x.at) : "", x.minutes ? x.minutes + "m" : ""].filter(Boolean).join(" · ");
    var source = x.source === "linguaboost" ? pill(x.level || "LAB", "warn") : "";
    var open = x.url ? '<a class="btn-mini" style="min-height:32px;padding:0 10px;" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Открыть</a>' : "";
    return '<div class="student-item-row"><div' + done + ">" +
      (meta ? '<div class="panel-kicker">' + esc(meta) + "</div>" : "") +
      "<div><strong>" + esc(x.title) + "</strong> " + source + "</div>" +
      (x.details ? '<div class="muted" style="margin-top:4px;">' + esc(x.details) + "</div>" : "") +
      '</div><div class="student-item-actions">' + open +
      '<button class="btn-mini" style="min-height:32px;padding:0 10px;" type="button" data-toggle-' + kind + '="' + esc(x.id) + '">' + (x.done ? "↺" : "✓") + "</button>" +
      '<button class="btn-mini" style="min-height:32px;padding:0 10px;" type="button" data-del-' + kind + '="' + esc(x.id) + '">×</button>' +
      "</div></div>";
  }

  function renderItems(state, studentId) {
    var homework = listLessons(state, studentId).filter(function (l) { return (l.homework || "").trim(); }).slice(-4).reverse();
    var hwEl = byId("homeworkList");
    if (hwEl) {
      hwEl.innerHTML = homework.length ? homework.map(function (l) {
        return '<div class="student-item-row"><div><div class="panel-kicker">' + esc(formatDateTime(l.date)) + '</div><div class="muted">' + esc(l.homework) + "</div></div></div>";
      }).join("") : '<div class="muted">Пока нет домашки от преподавателя.</div>';
    }

    var materials = listItems(state, studentId, "material");
    var matEl = byId("materialsList");
    if (matEl) matEl.innerHTML = materials.length ? materials.map(function (x) { return itemRow(x, "material"); }).join("") : '<div class="muted">Материалов пока нет.</div>';

    var practice = listItems(state, studentId, "practice");
    var prEl = byId("practiceList");
    if (prEl) prEl.innerHTML = practice.length ? practice.map(function (x) { return itemRow(x, "practice"); }).join("") : '<div class="muted">Практики пока нет.</div>';

    document.querySelectorAll("[data-toggle-material],[data-toggle-practice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-toggle-material") || btn.getAttribute("data-toggle-practice");
        var s = loadState();
        var cur = s.studentItems.find(function (x) { return x.id === id; });
        if (cur) updateItem(s, id, { done: !cur.done });
        renderAll();
      });
    });
    document.querySelectorAll("[data-del-material],[data-del-practice],[data-del-event]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-del-material") || btn.getAttribute("data-del-practice") || btn.getAttribute("data-del-event");
        deleteItem(loadState(), id);
        renderAll();
      });
    });
  }

  function renderEvents(state, studentId) {
    var events = listItems(state, studentId, "schedule");
    var el = byId("eventsList");
    if (!el) return;
    el.innerHTML = events.length ? events.map(function (x) { return itemRow(x, "event"); }).join("") : '<div class="muted">Личных событий пока нет.</div>';
  }

  function renderProgress(state, studentId) {
    var p = getProgress(state, studentId);
    var el = byId("progressBox");
    if (!el) return;
    p = p || { level: "—", goals: "", comments: "", studentGoals: "", studentNotes: "" };
    el.innerHTML = '<div style="display:grid;gap:10px;">' +
      '<div><span class="panel-kicker">Уровень</span><div><strong>' + esc(p.level) + "</strong></div></div>" +
      '<div><span class="panel-kicker">Цели от преподавателя</span><div class="muted">' + esc(p.goals || "—") + "</div></div>" +
      '<div><span class="panel-kicker">Комментарий преподавателя</span><div class="muted">' + esc(p.comments || "—") + "</div></div>" +
      '<label>Мои цели<textarea id="studentGoals" placeholder="Например: speaking 2 раза в неделю">' + esc(p.studentGoals || "") + "</textarea></label>" +
      '<label>Мои заметки<textarea id="studentNotes" placeholder="Что получается / что сложно">' + esc(p.studentNotes || "") + "</textarea></label>" +
      "</div>";
  }

  function renderLabPicker() {
    var el = byId("labPicker");
    if (!el) return;
    var levels = LAB_MODULES.map(function (m) { return m.level; }).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    el.innerHTML = '<div class="lab-picker"><div class="form-row lab-picker-row">' +
      '<label>Уровень<select id="labLevelSelect"><option value="">Все уровни</option>' + levels.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + "</option>"; }).join("") + "</select></label>" +
      '<label>Тренажёр<select id="labModuleSelect"></select></label>' +
      '<label>Когда сделать<input id="labDueDate" type="date" value="' + esc(localISODate(0)) + '"></label>' +
      '</div><div id="labModulePreview" class="lab-module-preview"></div><div class="actions">' +
      '<button class="btn-mini" id="addLabModuleBtn" type="button" data-primary>Добавить в домашку</button>' +
      '<a class="btn-mini" href="../lingua-boost-lab/index.html" target="_blank" rel="noopener noreferrer">Открыть лабораторию</a></div></div>';

    var level = byId("labLevelSelect");
    var select = byId("labModuleSelect");
    function filtered() {
      return LAB_MODULES.filter(function (m) { return !level.value || m.level === level.value; });
    }
    function sync() {
      select.innerHTML = filtered().map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.title) + "</option>"; }).join("");
      preview();
    }
    function preview() {
      var m = LAB_MODULES.find(function (x) { return x.id === select.value; }) || filtered()[0];
      var box = byId("labModulePreview");
      if (!box || !m) return;
      box.innerHTML = '<div class="lab-card"><div class="panel-kicker">' + esc(m.level + " · " + m.topic) + "</div><strong>" + esc(m.title) + "</strong>" +
        '<p class="muted">' + esc(m.description) + '</p><div class="lab-card-meta">' + pill(m.audience) + pill(m.minutes + " мин") + "</div></div>";
    }
    level.addEventListener("change", sync);
    select.addEventListener("change", preview);
    sync();
  }

  function renderCreators() {
    var eventEl = byId("eventCreator");
    var matEl = byId("materialCreator");
    var prEl = byId("practiceCreator");
    if (eventEl) eventEl.innerHTML = '<div class="form-row" style="grid-template-columns:1fr 140px 120px;"><label>Событие<input id="evTitle" placeholder="Название"></label><label>Дата<input id="evDate" type="date" value="' + esc(localISODate(0)) + '"></label><label>Время<input id="evTime" type="time" value="12:00"></label></div><label>Комментарий<textarea id="evDetails"></textarea></label><div class="actions"><button class="btn-mini" id="evSaveBtn" type="button" data-primary>Добавить</button></div>';
    if (matEl) matEl.innerHTML = '<div class="form-row"><label>Материал<input id="matTitle" placeholder="Название"></label><label>Ссылка<input id="matUrl" placeholder="https://..."></label></div><label>Комментарий<textarea id="matDetails"></textarea></label><div class="actions"><button class="btn-mini" id="matSaveBtn" type="button" data-primary>Добавить</button></div>';
    if (prEl) prEl.innerHTML = '<div class="form-row" style="grid-template-columns:1fr 120px 140px;"><label>Практика<input id="prTitle" placeholder="Например: Listening"></label><label>Минут<input id="prMinutes" type="number" min="1" value="10"></label><label>Дата<input id="prDate" type="date" value="' + esc(localISODate(0)) + '"></label></div><label>Комментарий<textarea id="prDetails"></textarea></label><div class="actions"><button class="btn-mini" id="prSaveBtn" type="button" data-primary>Добавить</button></div>';
  }

  function buildReport(state, user) {
    var studentId = user.id;
    var progress = getProgress(state, studentId) || {};
    var lessons = listLessons(state, studentId).slice(-8).reverse();
    var practice = listItems(state, studentId, "practice");
    var materials = listItems(state, studentId, "material");
    var done = practice.filter(function (x) { return x.done; }).length;
    var minutes = practice.reduce(function (sum, x) { return sum + (Number(x.minutes) || 0); }, 0);
    return [
      "New Generation English",
      "Отчёт ученика: " + user.name,
      "Дата выгрузки: " + new Date().toLocaleString("ru-RU"),
      "",
      "Прогресс",
      "Уровень: " + (progress.level || "—"),
      "Цели преподавателя: " + (progress.goals || "—"),
      "Комментарий преподавателя: " + (progress.comments || "—"),
      "Мои цели: " + (progress.studentGoals || "—"),
      "Мои заметки: " + (progress.studentNotes || "—"),
      "",
      "Сводка",
      "Уроков в отчёте: " + lessons.length,
      "Материалов: " + materials.length,
      "Практик и тренажёров: " + practice.length,
      "Готово практик: " + done,
      "Минут практики: " + minutes,
      "",
      "Уроки",
      lessons.map(function (l) { return "- " + formatDateTime(l.date) + " · " + l.status + " · " + (l.homework || "без домашки"); }).join("\n") || "- пока нет уроков",
      "",
      "Материалы",
      materials.map(function (x) { return "- " + (x.done ? "[готово] " : "[в работе] ") + x.title + (x.url ? " · " + x.url : ""); }).join("\n") || "- пока нет материалов",
      "",
      "Тренажёры и практика",
      practice.map(function (x) { return "- " + (x.done ? "[готово] " : "[в работе] ") + x.title + (x.level ? " · " + x.level : "") + (x.url ? " · " + x.url : ""); }).join("\n") || "- пока нет практики",
    ].join("\n");
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  var currentUser = null;

  function renderAll() {
    var state = loadState();
    renderTimeline(state, currentUser.id);
    renderLessons(state, currentUser.id);
    renderItems(state, currentUser.id);
    renderEvents(state, currentUser.id);
    renderProgress(state, currentUser.id);
  }

  function wire() {
    byId("whoami").textContent = currentUser.name;
    byId("signOutBtn").addEventListener("click", function () {
      localStorage.removeItem(SESSION_KEY);
      location.href = "login.html";
    });
    if (!window.__NGE_CABINET_THEME_WIRED__) {
      byId("theme-toggle").addEventListener("click", function () {
        document.body.classList.toggle("light");
        localStorage.setItem(THEME_KEY, document.body.classList.contains("light") ? "light" : "dark");
        byId("theme-toggle").textContent = document.body.classList.contains("light") ? "☀" : "☾";
      });
      window.__NGE_CABINET_THEME_WIRED__ = true;
    }
    byId("langBtn").addEventListener("click", function () {
      var next = lang() === "ru" ? "en" : "ru";
      document.documentElement.setAttribute("lang", next);
      byId("langBtn").textContent = next.toUpperCase();
    });

    [["addEventBtn", "eventCreator"], ["addMaterialBtn", "materialCreator"], ["addPracticeBtn", "practiceCreator"]].forEach(function (pair) {
      var btn = byId(pair[0]);
      var box = byId(pair[1]);
      if (btn && box) btn.addEventListener("click", function () { box.style.display = box.style.display === "block" ? "none" : "block"; });
    });

    byId("evSaveBtn").addEventListener("click", function () {
      var title = byId("evTitle").value.trim();
      if (!title) return;
      addItem(loadState(), { studentId: currentUser.id, kind: "schedule", title: title, details: byId("evDetails").value.trim(), at: isoFor(byId("evDate").value, byId("evTime").value) });
      byId("eventCreator").style.display = "none";
      renderAll();
    });
    byId("matSaveBtn").addEventListener("click", function () {
      var title = byId("matTitle").value.trim();
      if (!title) return;
      addItem(loadState(), { studentId: currentUser.id, kind: "material", title: title, details: byId("matDetails").value.trim(), url: byId("matUrl").value.trim(), done: false });
      byId("materialCreator").style.display = "none";
      renderAll();
    });
    byId("prSaveBtn").addEventListener("click", function () {
      var title = byId("prTitle").value.trim();
      if (!title) return;
      addItem(loadState(), { studentId: currentUser.id, kind: "practice", title: title, details: byId("prDetails").value.trim(), minutes: Math.max(1, Number(byId("prMinutes").value) || 10), at: isoFor(byId("prDate").value, "12:00"), done: false });
      byId("practiceCreator").style.display = "none";
      renderAll();
    });
    byId("addLabModuleBtn").addEventListener("click", function () {
      var module = LAB_MODULES.find(function (m) { return m.id === byId("labModuleSelect").value; });
      if (!module) return;
      addItem(loadState(), { studentId: currentUser.id, kind: "practice", title: module.title, details: module.description + " Добавлено из LinguaBoost Лаб.", url: module.href, minutes: module.minutes, at: isoFor(byId("labDueDate").value, "12:00"), done: false, source: "linguaboost", moduleId: module.id, level: module.level });
      renderAll();
    });
    byId("saveStudentNotesBtn").addEventListener("click", function () {
      saveProgress(loadState(), currentUser.id, { studentGoals: byId("studentGoals").value.trim(), studentNotes: byId("studentNotes").value.trim() });
      renderAll();
    });
    byId("downloadProgressBtn").addEventListener("click", function () {
      download("nge-student-progress-" + localISODate(0) + ".txt", buildReport(loadState(), currentUser));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    currentUser = ensureStudent();
    renderCreators();
    renderLabPicker();
    wire();
    renderAll();
  });
})();
