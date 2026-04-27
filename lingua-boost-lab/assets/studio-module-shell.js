(function () {
  const STORAGE_KEY = "nge-linguaboost-lang";
  const DEFAULT_LANG = "ru";
  const pathName = window.location.pathname.replace(/\\/g, "/");
  const marker = "/lingua-boost-lab/";
  const route = pathName.includes(marker) ? pathName.split(marker)[1] : "index.html";

  const moduleCopy = {
    "pre-a1/hello-classroom-fun.html": {
      title: {
        ru: "Hello! Classroom Fun | LinguaBoost Studio",
        en: "Hello! Classroom Fun | LinguaBoost Studio",
      },
      pills: {
        ru: ["Pre-A1", "Дети / старт", "Первые фразы"],
        en: ["Pre-A1", "Kids / starter", "First phrases"],
      },
      summary: {
        ru: "Стартовый модуль для приветствий, действий в классе и первых речевых шаблонов.",
        en: "Starter module for greetings, classroom actions, and first speaking patterns.",
      },
    },
    "a1/school-words-and-pronouns.html": {
      title: {
        ru: "School Words and Pronouns | LinguaBoost Studio",
        en: "School Words and Pronouns | LinguaBoost Studio",
      },
      pills: {
        ru: ["A1", "Дети / beginners", "Лексика и местоимения"],
        en: ["A1", "Kids / beginners", "Vocabulary and pronouns"],
      },
      summary: {
        ru: "Школьная лексика, demonstratives и местоимения в спокойной тренировочной подаче.",
        en: "School vocabulary, demonstratives, and pronouns in a calm training format.",
      },
    },
    "a1/prepositions-world.html": {
      title: {
        ru: "Prepositions World | LinguaBoost Studio",
        en: "Prepositions World | LinguaBoost Studio",
      },
      pills: {
        ru: ["A1", "Kids / beginners", "Предлоги места"],
        en: ["A1", "Kids / beginners", "Prepositions of place"],
      },
      summary: {
        ru: "Карточки, matching и задания по картинке для предлогов места.",
        en: "Cards, matching, and picture tasks for prepositions of place.",
      },
    },
    "a1/past-simple-adventure.html": {
      title: {
        ru: "Past Simple Adventure | LinguaBoost Studio",
        en: "Past Simple Adventure | LinguaBoost Studio",
      },
      pills: {
        ru: ["A1", "Kids / beginners", "Past Simple"],
        en: ["A1", "Kids / beginners", "Past Simple"],
      },
      summary: {
        ru: "Игровой модуль на первые формы Past Simple с картами, matching и памятью.",
        en: "Game-based module for first Past Simple forms with cards, matching, and memory tasks.",
      },
    },
    "a1/easter-english-lesson.html": {
      title: {
        ru: "Easter English Lesson | LinguaBoost Studio",
        en: "Easter English Lesson | LinguaBoost Studio",
      },
      pills: {
        ru: ["A1", "Seasonal", "Праздничная практика"],
        en: ["A1", "Seasonal", "Holiday practice"],
      },
      summary: {
        ru: "Сезонный урок с лексикой, чек-листами, творческими и разговорными заданиями.",
        en: "Seasonal lesson with vocabulary, checklists, creative tasks, and speaking practice.",
      },
    },
    "a2/ancient-china-explorer.html": {
      title: {
        ru: "Ancient China Explorer | LinguaBoost Studio",
        en: "Ancient China Explorer | LinguaBoost Studio",
      },
      pills: {
        ru: ["A2", "Teens / mixed", "Reading and audio"],
        en: ["A2", "Teens / mixed", "Reading and audio"],
      },
      summary: {
        ru: "История, культурная лексика и аудирование в одном guided-модуле по Древнему Китаю.",
        en: "History, cultural vocabulary, and listening in one guided Ancient China module.",
      },
    },
    "a2/core-trainer-a2-b1.html": {
      title: {
        ru: "Core Trainer A2-B1 | LinguaBoost Studio",
        en: "Core Trainer A2-B1 | LinguaBoost Studio",
      },
      pills: {
        ru: ["A2-B1", "Teens / adults", "Grammar core"],
        en: ["A2-B1", "Teens / adults", "Grammar core"],
      },
      summary: {
        ru: "Сборный тренажёр по ключевой грамматике с табами, speaking-блоком и таймером.",
        en: "Core trainer for key grammar with tabs, speaking blocks, and timed practice.",
      },
    },
    "b1/word-building-prefixes-and-suffixes.html": {
      title: {
        ru: "Word Building: Prefixes and Suffixes | LinguaBoost Studio",
        en: "Word Building: Prefixes and Suffixes | LinguaBoost Studio",
      },
      pills: {
        ru: ["B1", "Teens / adults", "Word building"],
        en: ["B1", "Teens / adults", "Word building"],
      },
      summary: {
        ru: "Системная практика word formation: prefixes, suffixes, transformations and checks.",
        en: "Systematic word formation practice: prefixes, suffixes, transformations, and checks.",
      },
    },
    "b1/ancient-china-cultural-studies.html": {
      title: {
        ru: "Ancient China: Cultural Studies | LinguaBoost Studio",
        en: "Ancient China: Cultural Studies | LinguaBoost Studio",
      },
      pills: {
        ru: ["B1", "Teens / adults", "Culture and discussion"],
        en: ["B1", "Teens / adults", "Culture and discussion"],
      },
      summary: {
        ru: "Интерmediate-модуль с чтением, вопросами на понимание, speaking и лексикой.",
        en: "Intermediate module with reading, comprehension questions, speaking, and vocabulary.",
      },
    },
    "b1/space-explorers-english.html": {
      title: {
        ru: "Beyond Earth: Space Explorers | LinguaBoost Studio",
        en: "Beyond Earth: Space Explorers | LinguaBoost Studio",
      },
      pills: {
        ru: ["B1+", "Teens / adults", "Space English"],
        en: ["B1+", "Teens / adults", "Space English"],
      },
      summary: {
        ru: "Вокабуляр по космосу, matching, listening и speaking в едином B1-модуле.",
        en: "Space vocabulary, matching, listening, and speaking inside one unified B1 module.",
      },
    },
    "b1/restaurant-menu-lab.html": {
      title: {
        ru: "Restaurant Menu Lab | LinguaBoost Studio",
        en: "Restaurant Menu Lab | LinguaBoost Studio",
      },
      pills: {
        ru: ["B1", "Teens / adults", "Speaking and rubric"],
        en: ["B1", "Teens / adults", "Speaking and rubric"],
      },
      summary: {
        ru: "Модуль по food English, menu speaking и оцениванию устного ответа через готовую рубрику.",
        en: "A food English module with menu-based speaking and a ready-made rubric for oral assessment.",
      },
    },
    "b2-plus/articles-with-geographical-names.html": {
      title: {
        ru: "Articles with Geographical Names | LinguaBoost Studio",
        en: "Articles with Geographical Names | LinguaBoost Studio",
      },
      pills: {
        ru: ["B2+", "Adults / exam", "Advanced grammar"],
        en: ["B2+", "Adults / exam", "Advanced grammar"],
      },
      summary: {
        ru: "Продвинутая грамматика по артиклям с географическими названиями и письменной практикой.",
        en: "Advanced grammar on articles with geographical names and written practice.",
      },
    },
  };

  function getStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (error) {
      return DEFAULT_LANG;
    }
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      return;
    }
  }

  function setText(el, value) {
    if (!el || typeof value !== "string") {
      return;
    }
    el.textContent = value;
  }

  function setHtml(el, value) {
    if (!el || typeof value !== "string") {
      return;
    }
    el.innerHTML = value;
  }

  function createLangControls() {
    const wrap = document.createElement("div");
    wrap.className = "lbs-ribbon__lang lb-catalog-lang";

    ["ru", "en"].forEach((lang) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lbs-lang-btn";
      button.dataset.lang = lang;
      button.textContent = lang.toUpperCase();
      button.addEventListener("click", () => applyLanguage(lang));
      wrap.appendChild(button);
    });

    return wrap;
  }

  function mountLangControls() {
    const target = document.querySelector(".topbar") || document.querySelector(".lbs-ribbon");
    if (!target || target.querySelector(".lbs-lang-btn")) {
      return;
    }
    target.appendChild(createLangControls());
  }

  function updateLangButtons(lang) {
    document.querySelectorAll(".lbs-lang-btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.lang === lang);
    });
  }

  function applyDataTranslations(lang) {
    document.querySelectorAll("[data-ru][data-en]").forEach((node) => {
      const value = node.getAttribute(`data-${lang}`);
      if (node.dataset.i18nMode === "html") {
        setHtml(node, value);
      } else {
        setText(node, value);
      }
    });
  }

  function ensureRibbonCopy() {
    const ribbon = document.querySelector(".lbs-ribbon");
    if (!ribbon) {
      return null;
    }

    let copy = ribbon.querySelector(".lbs-ribbon__copy");
    if (!copy) {
      copy = document.createElement("div");
      copy.className = "lbs-ribbon__copy";
      const meta = ribbon.querySelector(".lbs-ribbon__meta");
      if (meta) {
        meta.insertAdjacentElement("afterend", copy);
      } else {
        ribbon.appendChild(copy);
      }
    }

    return copy;
  }

  function applyModuleCopy(lang) {
    const info = moduleCopy[route];
    const ribbon = document.querySelector(".lbs-ribbon");

    if (!ribbon || !info) {
      return;
    }

    document.documentElement.lang = lang;
    document.title = info.title[lang];

    const brand = ribbon.querySelector(".lbs-ribbon__brand");
    setText(brand, "LinguaBoost Studio");

    const back = ribbon.querySelector(".lbs-back");
    setText(back, lang === "ru" ? "← Все модули студии" : "← All studio modules");

    const pills = Array.from(ribbon.querySelectorAll(".lbs-pill"));
    info.pills[lang].forEach((value, index) => {
      setText(pills[index], value);
    });

    const copy = ensureRibbonCopy();
    setText(copy, info.summary[lang]);
  }

  function applyCatalogCopy(lang) {
    if (route !== "index.html" && route !== "index-light.html" && route !== "") {
      return;
    }

    document.documentElement.lang = lang;
    document.title = lang === "ru" ? "LinguaBoost Studio | Библиотека модулей" : "LinguaBoost Studio | Module Library";
  }

  function getDragValue(node) {
    if (!node) {
      return "";
    }

    return (
      node.dataset.dragValue ||
      node.dataset.word ||
      node.getAttribute("data-value") ||
      node.textContent.trim()
    );
  }

  function initTapDragFallback() {
    let activeDrag = null;

    const dragSelector = "[draggable='true']";
    const dropSelector = ".drop-zone, .slot, .drop-zone-pic";

    function clearSelection() {
      if (!activeDrag) {
        return;
      }
      activeDrag.classList.remove("lb-selected-draggable");
      activeDrag = null;
    }

    document.addEventListener("click", (event) => {
      const dragItem = event.target.closest(dragSelector);
      if (dragItem) {
        if (activeDrag === dragItem) {
          clearSelection();
          return;
        }

        clearSelection();
        activeDrag = dragItem;
        activeDrag.classList.add("lb-selected-draggable");
        return;
      }

      const dropTarget = event.target.closest(dropSelector);
      if (!dropTarget || !activeDrag) {
        return;
      }

      const data = getDragValue(activeDrag);
      const transfer = {
        getData: () => data,
        setData: () => {},
        clearData: () => {},
      };

      const dragOverEvent = new Event("dragover", { bubbles: true, cancelable: true });
      Object.defineProperty(dragOverEvent, "dataTransfer", { value: transfer });
      dropTarget.dispatchEvent(dragOverEvent);

      const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, "dataTransfer", { value: transfer });
      dropTarget.dispatchEvent(dropEvent);

      window.setTimeout(() => {
        clearSelection();
      }, 50);
    });
  }

  function initSpaceAudio() {
    if (route !== "b1/space-explorers-english.html") {
      return;
    }

    const play = document.getElementById("playCosmicAudio");
    const stop = document.getElementById("stopCosmicAudio");
    const transcript = "Mission report. The astronaut described Earth rising over the Moon as the most breathtaking view. The crew watched the blue planet glow above the horizon while the station moved silently through space.";

    if (!play || !stop || !("speechSynthesis" in window)) {
      return;
    }

    play.addEventListener("click", () => {
      const utterance = new SpeechSynthesisUtterance(transcript);
      utterance.lang = "en-US";
      utterance.rate = 0.92;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });

    stop.addEventListener("click", () => {
      window.speechSynthesis.cancel();
    });
  }

  function applyLanguage(lang) {
    setStoredLang(lang);
    updateLangButtons(lang);
    applyDataTranslations(lang);
    applyCatalogCopy(lang);
    applyModuleCopy(lang);
    window.dispatchEvent(new CustomEvent("lb-language-change", { detail: { lang } }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountLangControls();
    initTapDragFallback();
    initSpaceAudio();
    applyLanguage(getStoredLang());
  });
})();

