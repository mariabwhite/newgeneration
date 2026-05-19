const PREF_VERSION_KEY = "nge-preferences-version";
const PREF_VERSION = "20260520-ru-light-default";
function setTheme(theme) {
  const themes = ["dark", "light"];
  const nextTheme = themes.includes(theme) ? theme : "dark";
  if (window.NGETheme && typeof window.NGETheme.setTheme === "function") {
    window.NGETheme.setTheme(nextTheme);
    return;
  }
    document.documentElement.dataset.theme = nextTheme;
  document.body.classList.toggle("light", nextTheme === "light");
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    const labels = { light: "LIGHT", dark: "DARK" };
    themeToggle.textContent = labels[nextTheme];
    themeToggle.setAttribute("aria-pressed", String(nextTheme !== "light"));
    themeToggle.setAttribute("aria-label", "Toggle theme: currently " + labels[nextTheme]);
    themeToggle.dataset.themeCurrent = nextTheme;
  }

  localStorage.setItem("nge-theme", nextTheme);
}

function toggleTheme() {
  if (window.NGETheme && typeof window.NGETheme.toggleTheme === "function") {
    window.NGETheme.toggleTheme();
    return;
  }
  const themes = ["dark", "light"];
  const current = document.documentElement.dataset.theme || (document.body.classList.contains("light") ? "light" : "dark");
  const currentIndex = themes.indexOf(current);
  setTheme(themes[(currentIndex + 1) % themes.length]);
}

function setLanguage(lang) {
  lang = lang === "en" ? "en" : "ru";
  const isEnglish = lang === "en";
  document.documentElement.setAttribute("lang", lang);
  document.body.classList.toggle("en", isEnglish);

  const langButton = document.getElementById("langBtn");
  if (langButton) {
    langButton.textContent = isEnglish ? "RU" : "EN";
  }

  document.querySelectorAll("[data-en]").forEach((element) => {
    const text = isEnglish ? element.dataset.en : element.dataset.ru;
    if (typeof text === "string") {
      element.textContent = text;
    }
  });

  localStorage.setItem("nge-lang", lang);
  localStorage.setItem(PREF_VERSION_KEY, PREF_VERSION);

  /* Anti-FOUC: reveal body once translation pass finished. */
  document.body.classList.add("lang-ready");

  /* Keep URL in sync — survives file:// origin isolation between pages */
  try {
    const _u = new URL(window.location.href);
    _u.searchParams.set("lang", lang);
    history.replaceState(null, "", _u.toString());
  } catch (_e) {}

  /* window.name — main state bridge. Survives navigation in same tab,
     NOT blocked by file:// origin isolation. */
  try {
    let _st = {};
    try { _st = (window.name && window.name.charAt(0) === "{") ? JSON.parse(window.name) : {}; } catch (_e2) {}
    _st.lang = lang;
    window.name = JSON.stringify(_st);
  } catch (_e) {}

  if (window.NGETheme && typeof window.NGETheme.syncLinks === "function") {
    var lessonTheme;
    try {
      lessonTheme = localStorage.getItem("lesson-palette") ||
                    (document.body.classList.contains("light") ? "light-lab" : "black-lab");
    } catch (error) {
      lessonTheme = "black-lab";
    }
    window.NGETheme.syncLinks(lessonTheme);
  }
}

function readRequestedLanguage() {
  try {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "en" || lang === "ru") return lang;
    const match = String(window.location.href || "").match(/[?&]lang=(en|ru)(?:[&#]|$)/);
    return match ? match[1] : "";
  } catch (error) {
    return "";
  }
}

function toggleLang() {
  const nextLang = document.body.classList.contains("en") ? "ru" : "en";
  setLanguage(nextLang);
}

function markActiveNav() {
  const currentPage = document.body.dataset.page;
  if (!currentPage) return;

  document.querySelectorAll(".topnav-link[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === currentPage);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTheme(localStorage.getItem("nge-theme") || "light");

  const requestedLang = readRequestedLanguage();
  const storedLang = localStorage.getItem("nge-lang");
  setLanguage(requestedLang || (storedLang === "en" ? "en" : "ru"));

  markActiveNav();
});
