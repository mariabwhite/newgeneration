/* === head logic (was inline in <head>) === */
  function toggleTheme() {
    if (window.NGETheme && typeof window.NGETheme.toggleTheme === "function") {
      window.NGETheme.toggleTheme();
    }
  }
  function toggleLang() {
    const cur = document.documentElement.getAttribute("lang") || "ru";
    const next = cur === "ru" ? "en" : "ru";
    document.documentElement.setAttribute("lang", next);
    document.querySelectorAll("[data-ru]").forEach(el => {
      const val = el.getAttribute("data-" + next);
      if (val) el.textContent = val;
    });
    const btn = document.getElementById("langBtn");
    if (btn) btn.textContent = next.toUpperCase();
    localStorage.setItem("nge-lang", next);
    // State-bridge sync: body class + window.name (so Lab and other pages stay in sync)
    document.body.classList.toggle("en", next === "en");
    try {
      let _st = {};
      try { _st = (window.name && window.name.charAt(0) === "{") ? JSON.parse(window.name) : {}; } catch (_e2) {}
      _st.lang = next;
      window.name = JSON.stringify(_st);
    } catch (_e) {}
  }
  function markActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll(".topnav-link[data-nav]").forEach(l => {
      l.classList.toggle("active", l.dataset.nav === page);
    });
  }
  function setupArticleAccordion() {
    const articleSelector = "details.dynasty-feature, details.neural-article-feature";
    document.querySelectorAll(articleSelector).forEach(article => {
      article.addEventListener("toggle", () => {
        if (!article.open) return;
        document.querySelectorAll(articleSelector).forEach(other => {
          if (other !== article) other.open = false;
        });
      });
    });
  }
  function restorePageState() {
    try {
      const requestedLang = new URLSearchParams(location.search).get("lang");
      const savedLang = (requestedLang === "en" || requestedLang === "ru")
        ? requestedLang
        : localStorage.getItem("nge-lang");
      // URL wins over stale localStorage/window.name when the user follows a translated link.
      const currentLang = document.documentElement.getAttribute("lang") || "ru";
      if (savedLang && (savedLang === "en" || savedLang === "ru") && savedLang !== currentLang) {
        if (typeof window.setLanguage === "function") window.setLanguage(savedLang);
        else toggleLang();
      }
    } catch (e) {}
    markActiveNav();
    setupArticleAccordion();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restorePageState, { once: true });
  } else {
    restorePageState();
  }

/* === accordion logic (was inline before </body>) === */
/* Accordion: при открытии одной записи закрываются остальные в той же секции
   (внутренние <details>, вложенные в другие <details>, не трогаем — у них своя жизнь). */
document.addEventListener('DOMContentLoaded', function () {
  var sectionIds = ['travel', 'neural-tools', 'my-path', 'authorship', 'dynasty'];
  sectionIds.forEach(function (id) {
    var section = document.getElementById(id);
    if (!section) return;
    var topLevel = Array.prototype.filter.call(
      section.querySelectorAll('details'),
      function (d) { return !d.parentElement.closest('details'); }
    );
    topLevel.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        topLevel.forEach(function (other) {
          if (other !== d && other.open) other.open = false;
        });
      });
    });
  });
});
