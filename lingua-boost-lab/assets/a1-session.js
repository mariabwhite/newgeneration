(function () {
  const PROGRESS_KEY = "linguaboost.lab.progress.v1";
  const SESSION_KEY = "linguaboost.lab.a1.session.v1";
  const TOTAL = 8;
  const lessons = [
    { id: "a1-01", href: "a1-01-present-simple-routines.html" },
    { id: "a1-02", href: "a1-02-present-simple-questions-negatives.html" },
    { id: "a1-03", href: "a1-03-present-simple-adverbs-frequency.html" },
    { id: "a1-04", href: "a1-04-have-has-my-things.html" },
    { id: "a1-05", href: "a1-05-my-your-his-her.html" },
    { id: "a1-06", href: "a1-06-prepositions-of-place.html" },
    { id: "a1-07", href: "a1-07-instructions-requests.html" },
    { id: "a1-08", href: "a1-08-final-mission.html" }
  ];

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (error) { return {}; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function progress() {
    const data = readJson(PROGRESS_KEY);
    data.a1 = data.a1 || { lessons: {} };
    data.a1.lessons = data.a1.lessons || {};
    return data;
  }

  function writeProgress(data) {
    const lessonsState = data.a1.lessons || {};
    data.a1.completed = lessons.filter(item => lessonsState[item.id]?.completed).length >= TOTAL;
    data.a1.updatedAt = new Date().toISOString();
    writeJson(PROGRESS_KEY, data);
    window.dispatchEvent(new CustomEvent("linguaboost:progress", { detail: data }));
  }

  function currentLessonId() {
    const path = window.location.pathname.replace(/\\/g, "/");
    const hit = lessons.find(item => path.endsWith("/" + item.href));
    return hit ? hit.id : "";
  }

  function lessonScoreFromPage() {
    const raw = document.querySelector("[data-lesson-score]")?.textContent || "";
    const number = parseInt(raw.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
  }

  function markLesson(id, patch) {
    if (!id) return;
    const data = progress();
    const prev = data.a1.lessons[id] || {};
    data.a1.lessons[id] = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (prev.completed) data.a1.lessons[id].completed = true;
    writeProgress(data);
    renderCatalogProgress();
  }

  function completedCount() {
    const data = progress();
    return lessons.filter(item => data.a1.lessons[item.id]?.completed).length;
  }

  function renderCatalogProgress() {
    const data = progress();
    const count = completedCount();
    const percent = Math.round((count / TOTAL) * 100);
    const text = document.querySelector("[data-module-progress-text]");
    const fill = document.querySelector("[data-module-progress-fill]");
    const rail = document.querySelector('[data-module-progress="a1"]');
    if (text) text.textContent = count + " / " + TOTAL;
    if (fill) fill.style.width = percent + "%";
    if (rail) rail.classList.toggle("is-complete", count >= TOTAL);
    const levelCount = document.querySelector("#a1 .level-count .ok");
    if (levelCount) levelCount.textContent = "→ lessons: " + count + " / " + TOTAL;
    lessons.forEach((lesson, index) => {
      const card = document.querySelector('[data-lab-lesson="' + lesson.id + '"]');
      if (!card) return;
      const state = data.a1.lessons[lesson.id] || {};
      const isComplete = Boolean(state.completed);
      const isStarted = Boolean(state.started || state.score > 0);
      card.classList.toggle("is-complete", isComplete);
      card.classList.toggle("is-started", isStarted && !isComplete);
      card.dataset.a1Progress = isComplete ? "complete" : (isStarted ? "started" : "new");
      card.style.setProperty("--a1-card-progress", isComplete ? "100%" : (isStarted ? "48%" : "0%"));
      const link = card.querySelector(".module-link");
      if (link && link.getAttribute("href") === "#") link.setAttribute("href", "./a1/" + lesson.href);
      if (link) link.setAttribute("aria-label", "Open A1 lesson " + String(index + 1).padStart(2, "0"));
    });
  }

  function updateLessonProgressFromPage() {
    const id = currentLessonId();
    if (!id) return;
    const score = lessonScoreFromPage();
    const certReady =
      id === "a1-08" && (
        document.getElementById("printCertBtn")?.disabled === false ||
        (document.getElementById("certId")?.textContent || "").trim().replace(/[—-]/g, "").length > 0 ||
        /generated|unlocked/i.test(document.getElementById("certMessage")?.textContent || "")
      );
    markLesson(id, {
      started: true,
      score,
      completed: score >= 80 || certReady
    });
  }

  function sessionBucket() {
    const data = readJson(SESSION_KEY);
    data.lessons = data.lessons || {};
    return data;
  }

  function controlKey(node, index) {
    if (node.id) return "#" + node.id;
    if (node.name) return node.tagName.toLowerCase() + "[name='" + node.name + "']";
    return node.tagName.toLowerCase() + ":" + index;
  }

  function saveLessonSession() {
    const id = currentLessonId();
    if (!id) return;
    const data = sessionBucket();
    const controls = [...document.querySelectorAll("input, textarea, select")];
    data.lessons[id] = data.lessons[id] || {};
    data.lessons[id].controls = {};
    controls.forEach((node, index) => {
      if (node.type === "file" || node.type === "password") return;
      const key = controlKey(node, index);
      data.lessons[id].controls[key] = node.type === "checkbox" || node.type === "radio" ? node.checked : node.value;
    });
    data.lessons[id].choiceRows = [...document.querySelectorAll(".choice-row")].map(row => {
      const buttons = [...row.querySelectorAll(".choice")];
      return buttons.findIndex(button => button.classList.contains("is-picked"));
    });
    data.lessons[id].updatedAt = new Date().toISOString();
    writeJson(SESSION_KEY, data);
  }

  function restoreLessonSession() {
    const id = currentLessonId();
    if (!id) return;
    const saved = sessionBucket().lessons?.[id];
    if (!saved) return;
    const controls = [...document.querySelectorAll("input, textarea, select")];
    controls.forEach((node, index) => {
      const key = controlKey(node, index);
      if (!(key in (saved.controls || {}))) return;
      const value = saved.controls[key];
      if (node.type === "checkbox" || node.type === "radio") node.checked = Boolean(value);
      else node.value = value;
    });
    [...document.querySelectorAll(".choice-row")].forEach((row, rowIndex) => {
      const picked = saved.choiceRows?.[rowIndex];
      if (!Number.isInteger(picked) || picked < 0) return;
      const buttons = [...row.querySelectorAll(".choice")];
      if (!buttons[picked]) return;
      buttons.forEach(button => button.classList.remove("is-picked"));
      buttons[picked].classList.add("is-picked");
    });
  }

  function wireLessonSession() {
    const id = currentLessonId();
    if (!id) return;
    markLesson(id, { started: true, lastOpenedAt: new Date().toISOString() });
    restoreLessonSession();
    updateLessonProgressFromPage();
    document.addEventListener("input", () => { saveLessonSession(); updateLessonProgressFromPage(); }, true);
    document.addEventListener("change", () => { saveLessonSession(); updateLessonProgressFromPage(); }, true);
    document.addEventListener("click", event => {
      if (event.target.closest(".choice,.word-chip,.sentence-chip,[data-build-check],[data-match-check],#generateCertBtn")) {
        setTimeout(() => { saveLessonSession(); updateLessonProgressFromPage(); }, 80);
      }
    }, true);
    const scoreNode = document.querySelector("[data-lesson-score]");
    if (scoreNode) new MutationObserver(updateLessonProgressFromPage).observe(scoreNode, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => setTimeout(restoreLessonSession, 40)).observe(document.body, { childList: true, subtree: true });
  }

  function wireFooterChain() {
    const id = currentLessonId();
    if (!id) return;
    const index = lessons.findIndex(item => item.id === id);
    const prev = lessons[index - 1];
    const next = lessons[index + 1];
    const prevLink = document.querySelector(".lesson-foot .foot-link.prev");
    const nextLink = document.querySelector(".lesson-foot .foot-link.next");
    if (prev && prevLink) prevLink.setAttribute("href", prev.href);
    if (next && nextLink) nextLink.setAttribute("href", next.href);
    if (!next && nextLink) nextLink.setAttribute("href", "#certificate");
    window.LinguaBoostTheme?.syncLinks(document, document.documentElement.getAttribute("data-theme") || "light-lab");
  }

  function installLessonBarAlignment() {
    if (document.getElementById("a1-lesson-bar-alignment")) return;
    const style = document.createElement("style");
    style.id = "a1-lesson-bar-alignment";
    style.textContent = `
      .lesson-flow,
      .learn-panel,
      .step-tracker,
      .lesson-score-card,
      .block,
      .lesson-foot,
      .copyright {
        box-sizing: border-box !important;
        width: calc(100% - 4cm) !important;
        max-width: none !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      .step-tracker,
      .lesson-score-card,
      .block,
      .lesson-foot,
      .copyright {
        overflow: hidden;
      }
      .step-track,
      .lesson-score-track,
      .progress-bar-bg,
      .star-progress {
        width: 100% !important;
        max-width: 100% !important;
      }
      @media (max-width: 820px) {
        .lesson-flow,
        .learn-panel,
        .step-tracker,
        .lesson-score-card,
      .block,
      .lesson-foot,
      .copyright {
          width: min(100% - 28px, 1180px) !important;
          max-width: 1180px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeLessonTheme(value) {
    const raw = String(value || "").trim().toLowerCase();
    const lessonThemes = new Set(["light-lab", "peach", "green", "rose", "cyan", "amber", "white", "black-lab", "violet"]);
    if (lessonThemes.has(raw)) return raw;
    if (["light", "lite", "day"].includes(raw)) return "light-lab";
    if (["dark", "black", "night"].includes(raw)) return "black-lab";
    if (["sky", "blue"].includes(raw)) return "cyan";
    return "";
  }

  function requestedTheme() {
    try {
      return normalizeLessonTheme(new URLSearchParams(window.location.search).get("theme"));
    } catch (error) {
      return "";
    }
  }

  function syncLessonTheme() {
    const id = currentLessonId();
    if (!id) return;
    const theme = requestedTheme() || normalizeLessonTheme(document.documentElement.getAttribute("data-theme")) || "light-lab";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("lesson-palette", theme);
      localStorage.setItem("lesson-palette-" + id, theme);
      localStorage.setItem("nge-theme-lab", window.LinguaBoostTheme?.catalogTheme(theme) || (theme === "black-lab" || theme === "violet" ? "dark" : theme === "cyan" ? "sky" : "light"));
    } catch (error) {}
    const palette = document.querySelector("[data-palette]");
    if (palette && palette.value !== theme) {
      palette.value = theme;
      palette.dispatchEvent(new Event("change", { bubbles: true }));
    }
    window.LinguaBoostTheme?.syncLinks(document, theme);
  }

  document.addEventListener("DOMContentLoaded", () => {
    installLessonBarAlignment();
    syncLessonTheme();
    renderCatalogProgress();
    wireFooterChain();
    wireLessonSession();
  });
  window.addEventListener("storage", renderCatalogProgress);
  window.LinguaBoostA1Session = { renderCatalogProgress, updateLessonProgressFromPage };
})();



