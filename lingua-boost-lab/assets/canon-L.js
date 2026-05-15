/* canon-L.js - shared LinguaBoost Lab shell behavior */
(function () {
  'use strict';

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function applyTheme(theme) {
    if (!theme) return;
    document.documentElement.setAttribute('data-theme', theme);
    storageSet('lab-theme', theme);
    storageSet('lesson-palette', theme);
    if (window.LinguaBoostTheme && typeof window.LinguaBoostTheme.writeTheme === 'function') {
      window.LinguaBoostTheme.writeTheme(theme);
    }
    if (window.LinguaBoostTheme && typeof window.LinguaBoostTheme.syncLinks === 'function') {
      window.LinguaBoostTheme.syncLinks(document, theme);
    }
    if (window.LinguaBoostTheme && typeof window.LinguaBoostTheme.syncHeroAssets === 'function') {
      window.LinguaBoostTheme.syncHeroAssets(theme);
    }
  }

  function initTheme() {
    var fromUrl = new URLSearchParams(window.location.search).get('theme');
    var saved = storageGet('lab-theme') || storageGet('lesson-palette') || storageGet('nge-theme-universal');
    var fromAttr = document.documentElement.getAttribute('data-theme');
    applyTheme(fromUrl || saved || fromAttr || 'light-lab');

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.dataset.canonLBoundTheme === 'true') return;
      btn.dataset.canonLBoundTheme = 'true';
      btn.addEventListener('click', function () {
        var explicit = btn.getAttribute('data-theme-target');
        var current = document.documentElement.getAttribute('data-theme') || 'light-lab';
        var next = explicit || (current === 'light-lab' ? 'black-lab' : 'light-lab');
        applyTheme(next);
      });
    });
  }

  function applyAudience(mode) {
    if (mode !== 'kids' && mode !== 'adults') return;
    document.documentElement.setAttribute('data-audience', mode);
    if (document.body) document.body.dataset.audience = mode;
    storageSet('lab-audience', mode);
    storageSet('lesson-audience', mode);

    document.querySelectorAll('[data-audience-btn]').forEach(function (btn) {
      var active = btn.getAttribute('data-audience-btn') === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.querySelectorAll('[data-kids][data-adults]').forEach(function (el) {
      var value = el.getAttribute(mode === 'kids' ? 'data-kids' : 'data-adults');
      if (value != null) el.innerHTML = value;
    });

    if (window.LinguaBoostTheme && typeof window.LinguaBoostTheme.syncHeroAssets === 'function') {
      window.LinguaBoostTheme.syncHeroAssets(document.documentElement.getAttribute('data-theme'));
    }
  }

  function initAudience() {
    var saved = storageGet('lab-audience') || storageGet('lesson-audience');
    var fromAttr = document.documentElement.getAttribute('data-audience') || (document.body && document.body.dataset.audience);
    applyAudience(saved || fromAttr || 'kids');

    document.querySelectorAll('[data-audience-btn]').forEach(function (btn) {
      if (btn.dataset.canonLBoundAudience === 'true') return;
      btn.dataset.canonLBoundAudience = 'true';
      btn.addEventListener('click', function () {
        applyAudience(btn.getAttribute('data-audience-btn'));
      });
    });
  }

  var TASK_TRANSLATIONS = {
    'Goal': '\u0426\u0435\u043b\u044c',
    'Route': '\u041c\u0430\u0440\u0448\u0440\u0443\u0442',
    'Finish': '\u0424\u0438\u043d\u0438\u0448',
    'Mission': '\u041c\u0438\u0441\u0441\u0438\u044f',
    'Your Mission': '\u0412\u0430\u0448\u0430 \u043c\u0438\u0441\u0441\u0438\u044f',
    'Booster Mission': '\u041c\u0438\u0441\u0441\u0438\u044f Booster',
    'Garden Mission': '\u041c\u0438\u0441\u0441\u0438\u044f Garden',
    'Classroom Mission': '\u041c\u0438\u0441\u0441\u0438\u044f Classroom',
    'School Bag Mission': '\u041c\u0438\u0441\u0441\u0438\u044f School Bag',
    'Easter Mission': '\u041f\u0430\u0441\u0445\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u0438\u0441\u0441\u0438\u044f',
    'Speaking Mission': '\u0423\u0441\u0442\u043d\u0430\u044f \u043c\u0438\u0441\u0441\u0438\u044f',
    'Final Mission': '\u0424\u0438\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043c\u0438\u0441\u0441\u0438\u044f',
    'Complete Mission': '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043c\u0438\u0441\u0441\u0438\u044e',
    'Complete Garden Mission': '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043c\u0438\u0441\u0441\u0438\u044e Garden',
    'What you will do in this lesson': '\u0427\u0442\u043e \u0432\u044b \u0431\u0443\u0434\u0435\u0442\u0435 \u0434\u0435\u043b\u0430\u0442\u044c \u043d\u0430 \u0443\u0440\u043e\u043a\u0435',
    'What you review': '\u0427\u0442\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u043c',
    'What you unlock': '\u0427\u0442\u043e \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f',
    'What you practise': '\u0427\u0442\u043e \u043e\u0442\u0440\u0430\u0431\u043e\u0442\u0430\u0435\u043c',
    'What you practice': '\u0427\u0442\u043e \u043e\u0442\u0440\u0430\u0431\u043e\u0442\u0430\u0435\u043c',
    'Mini Focus': '\u041c\u0438\u043d\u0438-\u0444\u043e\u043a\u0443\u0441',
    'Visual Input': '\u0412\u0438\u0437\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0432\u043e\u0434',
    'Controlled Practice': '\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c\u0430\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430',
    'Free Practice': '\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u0430\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430',
    'Practice': '\u041f\u0440\u0430\u043a\u0442\u0438\u043a\u0430',
    'Final Test': '\u0424\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0442\u0435\u0441\u0442',
    'Certificate': '\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442',    'What to do': 'Что делать',
    'What you do': 'Что делать',
    'What to send': 'Что отправить',
    'If it is hard': 'Если сложно',
    'Now I can': 'Теперь я умею',
    'Final Task': 'Итоговое задание',
    'Final Project': 'Итоговый проект',
    'Final Interactive Test': 'Итоговый интерактивный тест',
    'Guided Tasks': 'Задания с опорой',
    'Active Tasks': 'Активная практика',
    'Guided Practice': 'Практика с опорой',
    'Active Practice': 'Активная практика',
    'Listening / Reading': 'Аудирование / чтение',
    'Vocabulary': 'Слова',
    'Language Focus': 'Языковой фокус',
    'Grammar Review': 'Повторение грамматики',
    'Visual Review': 'Визуальное повторение',
    'Mini Mission': 'Мини-миссия',
    'Project checklist': 'Чек-лист проекта',
    'Certificate condition': 'Условие сертификата',
    'Then test': 'Потом тест',
    'Correct': 'Верно',
    'Try again': 'Попробуйте ещё',
    'Choose': 'Выберите',
    'Choose...': 'Выберите...',
    'Select': 'Выберите',
    'Listen': 'Слушать',
    'Show text': 'Показать текст',
    'Hide text': 'Скрыть текст',
    'Start recording': 'Начать запись',
    'Stop': 'Стоп',
    'Start': 'Начать',
    'Reset': 'Сброс',
    'Each card': 'Карточки',
    'Personal questions:': 'Личные вопросы:',
    'Each card (click to flip and listen)': 'Карточки: нажмите, чтобы перевернуть и прослушать',
    'Hint': 'Подсказка',
    'hint': 'подсказка',
    'model': 'пример',
    'drop': 'перетащите',
    'Next': 'Дальше',
    'Previous lesson': 'Предыдущий урок',
    'Next lesson': 'Следующий урок',
    'All lessons': 'Все уроки',
    'Lab catalog': 'Каталог Lab',
    'Tasks completed': 'Задания выполнены',
    'Final test score': 'Баллы за финальный тест',
    'Certificate status': 'Статус сертификата',
    'Locked': 'Закрыт',
    'Download PDF': 'Скачать PDF',
    'Print / Save PDF': 'Печать / сохранить PDF',
    'mark studied': 'изучено',
    'mark route planned': 'маршрут готов',
    'check answers': 'проверить ответы',
    'Check answers': 'Проверить ответы',
    'Answer the question and give a reason...': 'Ответьте на вопрос и объясните причину...',
    'Write your route or geography paragraph here...': 'Напишите маршрут или абзац по географии здесь...',
    'Write 1–2 sentences in English': 'Напишите 1–2 предложения по-английски',
    'Write 1-2 sentences in English': 'Напишите 1–2 предложения по-английски'
  };

  var NEXT_TARGET_TRANSLATIONS = {
    'visual input': '\u0432\u0438\u0437\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0432\u043e\u0434',
    'vocabulary': '\u0441\u043b\u043e\u0432\u0430',
    'language focus': '\u044f\u0437\u044b\u043a\u043e\u0432\u043e\u0439 \u0444\u043e\u043a\u0443\u0441',
    'mini focus': '\u043c\u0438\u043d\u0438-\u0444\u043e\u043a\u0443\u0441',
    'guided practice': '\u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430 \u0441 \u043e\u043f\u043e\u0440\u043e\u0439',
    'active practice': '\u0430\u043a\u0442\u0438\u0432\u043d\u0430\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430',
    'free practice': '\u0441\u0432\u043e\u0431\u043e\u0434\u043d\u0430\u044f \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430',
    'listening': '\u0430\u0443\u0434\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435',
    'reading': '\u0447\u0442\u0435\u043d\u0438\u0435',
    'text': '\u0442\u0435\u043a\u0441\u0442',
    'final task': '\u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u0435',
    'final test': '\u0444\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0442\u0435\u0441\u0442',
    'final project': '\u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0435\u043a\u0442'
  };

  function translateTaskText(value) {
    var raw = String(value || '');
    var trimmed = raw.trim();
    if (!trimmed) return raw;
    var translated = TASK_TRANSLATIONS[trimmed];
    if (!translated) {
      var match;
      if (/^Next:\s*/i.test(trimmed)) {
        var nextTarget = trimmed.replace(/^Next:\s*/i, '');
        var nextTranslated = NEXT_TARGET_TRANSLATIONS[nextTarget.toLowerCase()];
        translated = nextTranslated ? ('Дальше: ' + nextTranslated) : trimmed
          .replace(/^Next:\s*/i, 'Дальше: ')
          .replace(/(\d+\s*\/\s*\d+)\s+tasks\b/i, '$1 заданий')
          .replace(/(\d+\s*\/\s*\d+)\s+blocks\b/i, '$1 блоков');
      } else if ((match = trimmed.match(/^(\d+\s*\/\s*\d+)\s+tasks$/i))) {
        translated = match[1] + ' заданий';
      } else if ((match = trimmed.match(/^(\d+\s*\/\s*\d+)\s+blocks$/i))) {
        translated = match[1] + ' блоков';
      } else if ((match = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)\s+tasks each$/i))) {
        translated = match[1] + '–' + match[2] + ' заданий в каждом';
      } else if ((match = trimmed.match(/^Listen to task\s+(\d+)$/i))) {
        translated = 'Слушать задание ' + match[1];
      } else if ((match = trimmed.match(/^Round\s+(\d+)\s*\/\s*(\d+)$/i))) {
        translated = 'Раунд ' + match[1] + ' / ' + match[2];
      } else if (/^Complete all tasks in this round\.$/i.test(trimmed)) {
        translated = 'Выполните все задания этого раунда.';
      } else if (/^Previous round$/i.test(trimmed)) {
        translated = 'Предыдущий раунд';
      } else if (/^Next round$/i.test(trimmed)) {
        translated = 'Следующий раунд';
      } else if (/^Check block$/i.test(trimmed)) {
        translated = 'Проверить блок';
      } else if (/^type answer$/i.test(trimmed)) {
        translated = 'введите ответ';
      } else if (/^Write or record$/i.test(trimmed)) {
        translated = 'Напишите или запишите';
      } else if (/^Record or write$/i.test(trimmed)) {
        translated = 'Запишите голосом или письменно';
      } else {
        translated = '';
      }
    }
    if (!translated) return raw;
    return raw.replace(trimmed, translated);
  }

  function applyTaskTranslations(lang, root) {
    var scope = root || document.body || document;
    if (!scope) return;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|SVG)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (node.__canonLEnText == null) node.__canonLEnText = node.nodeValue;
      node.nodeValue = lang === 'ru' ? translateTaskText(node.__canonLEnText) : node.__canonLEnText;
    });

    ['placeholder', 'aria-label', 'title', 'value'].forEach(function (attr) {
      scope.querySelectorAll('[' + attr + ']').forEach(function (el) {
        if (el.matches('[data-ru][data-en]')) return;
        var key = 'canonLEn' + attr.replace(/(^|-)([a-z])/g, function (_, dash, c) { return c.toUpperCase(); });
        if (!el.dataset[key]) el.dataset[key] = el.getAttribute(attr) || '';
        var source = el.dataset[key];
        var next = lang === 'ru' ? translateTaskText(source) : source;
        if (next) el.setAttribute(attr, next);
      });
    });
  }

  function watchTaskTranslations() {
    if (window.__canonLTaskTranslationObserver) return;
    var observer = new MutationObserver(function (mutations) {
      var lang = document.documentElement.getAttribute('lang') || 'en';
      if (lang !== 'ru') return;
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) applyTaskTranslations('ru', node);
        });
      });
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    window.__canonLTaskTranslationObserver = observer;
  }

  function applyLang(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.dataset.lang = lang;
    storageSet('lab-lang', lang);
    storageSet('lesson-lang', lang);
    storageSet('nge-lang', lang);
    /* NGE STATE-BRIDGE: keep window.name in sync so main site reads correct lang on return. */
    try {
      var _st = {};
      try { _st = (window.name && window.name.charAt(0) === '{') ? JSON.parse(window.name) : {}; } catch (_e2) {}
      _st.lang = lang;
      window.name = JSON.stringify(_st);
    } catch (_e) {}
    /* Body class for state-bridge consistency. */
    try { document.body && document.body.classList.toggle('en', lang === 'en'); } catch (_e) {}

    document.querySelectorAll('[data-ru][data-en]').forEach(function (el) {
      var value = el.getAttribute(lang === 'ru' ? 'data-ru' : 'data-en');
      if (value != null) el.innerHTML = value;
    });

    applyTaskTranslations(lang, document.body || document);
    watchTaskTranslations();

    document.querySelectorAll('[data-lang-pill], [data-lang-toggle], .lang-toggle').forEach(function (pill) {
      if (pill.matches('[data-ru][data-en]')) return;
      pill.textContent = lang === 'ru' ? 'EN' : 'RU';
    });
  }

  function initLang() {
    /* window.name first — survives navigation main↔Lab on file:// origin. */
    var fromWindowName = '';
    try {
      if (window.name && window.name.charAt(0) === '{') {
        var _st = JSON.parse(window.name);
        if (_st && (_st.lang === 'ru' || _st.lang === 'en')) fromWindowName = _st.lang;
      }
    } catch (e) {}
    var fromUrl = '';
    try {
      fromUrl = new URLSearchParams(window.location.search).get('lang') || '';
      if (fromUrl !== 'ru' && fromUrl !== 'en') {
        var match = String(window.location.href || '').match(/[?&]lang=(ru|en)(?:[&#]|$)/);
        fromUrl = match ? match[1] : '';
      }
    } catch (e) {}
    var saved = storageGet('nge-lang') || storageGet('lab-lang') || storageGet('lesson-lang');
    var fromAttr = document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang;
    /* Default for lessons = EN. Russian is reached via toggle or propagated ?lang=ru. */
    applyLang(fromWindowName || fromUrl || saved || fromAttr || 'en');

    document.querySelectorAll('[data-lang-toggle], .lang-toggle').forEach(function (btn) {
      if (btn.dataset.canonLBoundLang === 'true') return;
      btn.dataset.canonLBoundLang = 'true';
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('lang') || 'ru';
        applyLang(current === 'ru' ? 'en' : 'ru');
      });
    });
  }

  function initProgress() {
    if (window.LessonProgress && typeof window.LessonProgress.init === 'function') {
      window.LessonProgress.init();
    }
  }

  function init() {
    initTheme();
    initAudience();
    initLang();
    initProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CanonL = {
    applyTheme: applyTheme,
    applyAudience: applyAudience,
    applyLang: applyLang
  };
})();

/* ============================================================
   Toggle scope by URL path (2026-05-15)
   --------------------------------------------------
   Per Maria's directive:
   - Lang toggle works ONLY in /a1/ and /a2/ lessons.
     Hidden in pre-a1, b1, b2-plus, c1, c2, etc.
   - Theme toggle is hidden in core A1 lessons a1-01..a1-08
     (their interactives ship multiple palettes already and a
     global toggle would conflict). Stays visible elsewhere.
   ============================================================ */
(function () {
  'use strict';

  function path() {
    return (location.pathname || '').toLowerCase();
  }

  function langInScope() {
    var p = path();
    // pre-a1 included per Maria 2026-05-15 (Hello! Classroom Fun + Body & Grammar Garden)
    if (/\/lingua-boost-lab\/(pre-a1|a1|a2)\//.test(p)) return true;
    // Per-lesson exceptions for B1+ (Maria's specific requests 2026-05-15)
    if (/\/lingua-boost-lab\/b1\/word-building-prefixes-and-suffixes/.test(p)) return true;
    if (/\/lingua-boost-lab\/b1\/ancient-china-cultural-studies/.test(p)) return true;
    if (/\/lingua-boost-lab\/b1\/whispering-library-quest/.test(p)) return true;
    if (/\/lingua-boost-lab\/c1\/stars-and-stellar-phenomena/.test(p)) return true;
    return false;
  }

  function themeInScope() {
    // Theme toggle + palette-select hidden in ALL Lab lessons per Maria 2026-05-15.
    // Only the catalog (/lingua-boost-lab/index.html) shows them via its own script.
    return false;
  }

  function apply() {
    if (!langInScope()) {
      document.querySelectorAll('.canon-l-pill.lang-toggle, [data-lang-toggle], [data-lang-pill]').forEach(function (el) {
        el.classList.add('is-scope-hidden');
        el.setAttribute('aria-hidden', 'true');
      });
    }
    if (!themeInScope()) {
      // Hide theme-toggle button AND palette-select dropdown (both are "theme" controls)
      document.querySelectorAll('.canon-l-pill.theme-toggle, [data-theme-toggle], .canon-l-pill.palette-select, select.palette-select, [data-palette]').forEach(function (el) {
        el.classList.add('is-scope-hidden');
        el.setAttribute('aria-hidden', 'true');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();