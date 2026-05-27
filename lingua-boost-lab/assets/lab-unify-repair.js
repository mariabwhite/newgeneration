(function(){
  var criticalCss = `
@media (max-width: 720px) {
  .canon-l-hero,
  .canon-l-hero-inner {
    width: calc(100vw - 28px) !important;
    inline-size: calc(100vw - 28px) !important;
    max-width: calc(100vw - 28px) !important;
    max-inline-size: calc(100vw - 28px) !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }
  html,
  body {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  body[data-lb-level] main *:not(table):not(thead):not(tbody):not(tr):not(th):not(td):not(svg):not(path) {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .canon-l-hero-inner {
    margin-inline: auto !important;
    padding-inline: clamp(18px, 6vw, 28px) !important;
  }
  .canon-l-hero-title,
  .canon-l-hero-lead,
  .canon-l-hero-meta {
    max-width: 100% !important;
    min-width: 0 !important;
  }
  .canon-l-hero-title,
  .canon-l-hero-title em {
    /* break-word ломает только если слово реально не помещается,
       не дробит по буквам как anywhere. Fixes Classroo/m, Pro/nouns. */
    overflow-wrap: break-word !important;
    word-break: normal !important;
    hyphens: auto !important;
    -webkit-hyphens: auto !important;
    /* Maria 27.05: «модули» (6 букв) разбивалось как «мо-/дули» на каталоге.
       Не ломать короткие слова: минимум 8 букв всего, 4 до дефиса, 3 после. */
    -webkit-hyphenate-limit-before: 4;
    -webkit-hyphenate-limit-after: 3;
    -webkit-hyphenate-limit-lines: 2;
    hyphenate-limit-chars: 8 4 3;
  }
  .canon-l-hero-meta {
    flex-wrap: wrap !important;
    /* "$ LAB --LEVEL" badge breathing room — Maria 27.05 (повторно): «прилипает к A1, прячется за полосу».
       Усилено до 36px, плюс margin-bottom чтобы A1 не липла к фиолетовой плашке. */
    margin-top: 36px !important;
    margin-bottom: 18px !important;
    scroll-margin-top: 100px;
  }
  /* Hero block itself — больше воздуха сверху, чтобы Codex'овский fixed-topbar не наезжал */
  .canon-l-hero {
    padding-top: 24px !important;
  }
  /* A1/уровень-заголовок — отдельный gap от плашки */
  .canon-l-hero-title {
    margin-top: 8px !important;
    font-size: clamp(2rem, 10vw, 2.6rem) !important;
    line-height: 0.98 !important;
  }
  /* Lesson Flow карточки (1-5 шагов урока) — Maria 27.05 file_50:
     текст «Активна / Lear-n / Итогово / Reading Check» обрезался справа.
     Уменьшаем padding-left (был 86px под крупную иконку), убираем min-height,
     разрешаем перенос по слогам. */
  .flow-card {
    padding: 22px 14px 16px 66px !important;
    min-height: auto !important;
    overflow: visible !important;
    min-width: 0 !important;
  }
  .flow-card strong,
  .flow-card small {
    overflow-wrap: break-word !important;
    word-break: normal !important;
    hyphens: auto !important;
    -webkit-hyphens: auto !important;
    display: block;
    max-width: 100%;
  }
  /* Unify lesson banner widths so blocks line up at one column width.
     Maria 27.05: «все блоки разной ширины». */
  .canon-l-hero,
  .canon-l-hero-inner,
  .canon-l-section,
  .canon-l-card,
  .scene-strip {
    box-sizing: border-box !important;
    max-width: 100% !important;
  }
  .canon-l-hero-inner > * {
    max-width: 100% !important;
  }
  .scene-card {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }
  .scene-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .scene-card span,
  .scene-card figcaption {
    display: block !important;
    min-width: 0 !important;
    max-width: 100% !important;
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    hyphens: auto !important;
    -webkit-hyphens: auto !important;
  }
  /* P4: Lab topbar — scroll-away поведение как на main site (Codex db5e042).
     На mobile топбар в нормальном потоке, уезжает вместе со страницей. */
  .canon-l-topbar {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    left: auto !important;
    z-index: 100 !important;
    transform: none !important;
    -webkit-transform: none !important;
    will-change: auto !important;
  }
  /* P6: Скрыть ghost concentric circles справа от уровней на каталоге Lab.
     Maria 27.05 file_48: «o o» рядом с A1 смотрятся непонятно на mobile. */
  .level-section::before {
    display: none !important;
  }
  /* P2: Бургер-меню для .canon-l-nav на уроках. Maria 27.05: «ЦЕЛЬ/ГРАММАТИКА/
     ПРАКТИКА/... — много, полоса жирная, РЕЗУЛЬТАТ обрезается. Сделай сэндвич». */
  .canon-l-nav.has-burger {
    position: relative !important;
  }
  .canon-l-nav.has-burger .canon-l-link {
    display: none !important;
  }
  .canon-l-nav.has-burger.is-open .canon-l-link {
    display: block !important;
    padding: 12px 16px !important;
    border-bottom: 1px solid rgba(154, 122, 217, 0.18) !important;
  }
  .canon-l-burger {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    background: transparent !important;
    border: 1.5px solid rgba(154, 122, 217, 0.34) !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    font-family: var(--mono, "JetBrains Mono", monospace) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    color: var(--text, #1a1326) !important;
    cursor: pointer !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
  }
  .canon-l-burger:hover,
  .canon-l-burger.is-open {
    border-color: #FF5A1F !important;
    color: #FF5A1F !important;
  }
  .canon-l-burger .canon-l-burger-icon {
    font-size: 16px !important;
    line-height: 1 !important;
  }
  .canon-l-nav.has-burger.is-open {
    display: block !important;
    position: absolute !important;
    top: calc(100% + 6px) !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 200 !important;
    background: var(--bg-card, #fff) !important;
    border: 1px solid rgba(154, 122, 217, 0.22) !important;
    border-radius: 12px !important;
    box-shadow: 0 14px 36px rgba(0,0,0,0.12) !important;
    padding: 4px 0 !important;
  }
  /* A1 mobile lesson stability: the progress strip must sit in the page flow,
     not hover over the final exercises. Also keep short English words readable. */
  .topbar,
  .friendly-topbar,
  .nge-shell-topbar,
  .canon-l-topbar {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    min-height: 54px !important;
    padding: 8px 10px !important;
    gap: 8px !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    overflow: visible !important;
    transform: none !important;
    -webkit-transform: none !important;
    will-change: auto !important;
  }
  .brand,
  .friendly-brand,
  .nge-shell-brand,
  .canon-l-brand {
    min-width: 0 !important;
    flex: 1 1 auto !important;
  }
  .brand-name,
  .brand-title,
  .friendly-brand .brand-name,
  .canon-l-brand-title {
    min-width: 0 !important;
    max-width: 100% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 13px !important;
    line-height: 1.1 !important;
  }
  .topbar-tools,
  .friendly-tools,
  .nge-shell-tools,
  .canon-l-tools {
    margin-left: auto !important;
    gap: 6px !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
  }
  .topbar-nav,
  .friendly-nav {
    display: none !important;
  }
  .menu-btn,
  .btn-tool,
  .level-bubble,
  .audience-switch,
  .lang-toggle,
  .theme-toggle,
  .canon-l-burger,
  .canon-l-pill {
    flex: 0 0 auto !important;
    min-width: 36px !important;
    max-width: 92px !important;
    height: 36px !important;
    padding: 0 9px !important;
    white-space: nowrap !important;
    font-size: 10px !important;
    letter-spacing: 0.04em !important;
  }
  .step-tracker,
  .canon-l-tracker,
  .wl-tracker,
  .tracker,
  .progress-header,
  .progress-rail,
  .room-progress,
  .module-progress-card,
  .lesson-score-card {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    z-index: 1 !important;
    width: min(100% - 28px, 1180px) !important;
    max-width: calc(100vw - 28px) !important;
    margin: 12px auto 16px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    backdrop-filter: none !important;
  }
  .step-tracker,
  .canon-l-tracker,
  .wl-tracker,
  .tracker,
  .progress-header,
  .progress-rail,
  .room-progress {
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) auto !important;
    gap: 8px !important;
    align-items: center !important;
    min-height: 40px !important;
    padding: 8px 10px !important;
    border-radius: 999px !important;
  }
  .lesson-flow,
  .learn-panel,
  .block,
  .lesson-foot,
  .copyright,
  .lesson-score-card,
  .canon-l-section,
  .canon-l-card {
    width: min(100% - 28px, 1180px) !important;
    max-width: calc(100vw - 28px) !important;
    min-width: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
  }
  .flow-grid,
  .learn-grid,
  .goal-grid,
  .output-grid,
  .check-grid,
  .prompt-grid,
  .cert-meta-grid,
  .test-summary,
  .story-builder,
  .course-grid,
  .round-list,
  .match-row,
  .practice-item,
  .test-shell {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  html body .lesson-flow .flow-grid.flow-grid,
  html body .learn-panel .learn-grid.learn-grid,
  html body .block .course-grid.course-grid,
  html body .block .test-summary.test-summary,
  html body .block .test-shell.test-shell,
  html body .block .round-list.round-list,
  html body .block .check-grid.check-grid,
  html body .block .story-builder.story-builder,
  html body .block .practice-item.practice-item {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  html body .lesson-flow .flow-card.flow-card::after {
    display: none !important;
  }
  html body .lesson-flow .flow-card.flow-card,
  html body .block .course-card.course-card,
  html body .block .summary-card.summary-card,
  html body .block .test-task.test-task,
  html body .block .info-card.info-card,
  html body .block .now-item.now-item {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }
  html body .lesson-score-card .lesson-score-meta.lesson-score-meta,
  html body .module-progress-card .module-progress-meta.module-progress-meta {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    white-space: normal !important;
  }
  html body .lesson-score-card .lesson-score-meta > *,
  html body .module-progress-card .module-progress-meta > * {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }
  .flow-card,
  .course-card,
  .summary-card,
  .info-card,
  .now-item,
  .test-task,
  .round-panel {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }
  .lesson-score-head,
  .lesson-score-meta,
  .module-progress-head,
  .module-progress-meta,
  .round-title-line,
  .block-head {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  .lesson-score-meta > *,
  .module-progress-meta > *,
  .round-title-line > *,
  .block-title-wrap,
  .block-title,
  .block-intro,
  .minitask-detail,
  .practice-q,
  .build-output,
  textarea,
  input,
  audio {
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
  }
  html body .canon-l-hero-title.canon-l-hero-title,
  html body .friendly-title.friendly-title,
  html body .hero-title.hero-title {
    max-width: calc(100vw - 96px) !important;
    white-space: normal !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    font-size: clamp(1.85rem, 8.8vw, 2.25rem) !important;
    line-height: 0.98 !important;
  }
  html body .block p,
  html body .block small,
  html body .block li,
  html body .block label,
  html body .block h2,
  html body .block h3,
  html body .lesson-flow small,
  html body .lesson-flow strong,
  html body .learn-panel p,
  html body .lesson-score-card span,
  html body .canon-l-hero-lead,
  html body .hero-lead,
  html body .friendly-lead {
    max-width: min(100%, calc(100vw - 96px)) !important;
    min-width: 0 !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    overflow-wrap: break-word !important;
    word-break: normal !important;
    hyphens: manual !important;
    -webkit-hyphens: manual !important;
  }
  html body .canon-l-hero-lead.canon-l-hero-lead,
  html body .hero-lead.hero-lead,
  html body .friendly-lead.friendly-lead,
  html body .block .block-intro.block-intro,
  html body .block .minitask-detail.minitask-detail {
    width: min(100%, calc(100vw - 96px)) !important;
    max-width: min(100%, calc(100vw - 96px)) !important;
    white-space: normal !important;
    overflow: visible !important;
  }
  html body .block-nav .btn,
  html body .block-nav .canon-l-btn,
  html body .input-line .btn,
  html body .recorder-controls .btn,
  html body .story-actions .btn {
    width: auto !important;
    max-width: 100% !important;
    white-space: normal !important;
  }
  .step-count,
  .step-name,
  .canon-l-tracker-label,
  .canon-l-tracker-meta,
  .canon-l-tracker-step,
  .round-stats,
  .module-progress-meta,
  .lesson-score-meta {
    min-width: 0 !important;
    max-width: 100% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 10px !important;
    letter-spacing: 0.08em !important;
  }
  .step-track,
  .canon-l-tracker-track,
  .round-track,
  .module-progress-track,
  .lesson-score-track,
  .progress-bar,
  .progress-fill-wrap {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 6px !important;
  }
  .grammar-table-wrap,
  .table-wrap,
  .responsive-table,
  .test-shell,
  .round-panel {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .grammar-table {
    width: max-content !important;
    min-width: 620px !important;
  }
  .grammar-table th,
  .grammar-table td {
    min-width: 130px !important;
    white-space: normal !important;
  }
  .choice-row,
  .quiz-options,
  .answer-options,
  .word-bank,
  .bank,
  .interactive,
  .recorder-controls,
  .input-line,
  .story-actions,
  .block-nav {
    max-width: 100% !important;
    min-width: 0 !important;
    flex-wrap: wrap !important;
  }
  .choice,
  .answer-btn,
  .word-chip,
  .sentence-chip,
  .test-build-chip,
  .practice-hint,
  .drop-slot,
  .btn,
  .canon-l-btn,
  .course-card,
  .test-task,
  .summary-card,
  .now-item,
  .info-card {
    max-width: 100% !important;
    min-width: 0 !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
    hyphens: manual !important;
    -webkit-hyphens: manual !important;
  }
  .choice,
  .answer-btn,
  .word-chip,
  .sentence-chip,
  .test-build-chip,
  .practice-hint,
  .drop-slot {
    white-space: normal !important;
    line-height: 1.25 !important;
  }
  .word-chip,
  .sentence-chip,
  .test-build-chip {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: auto !important;
    min-width: max-content !important;
    max-width: 100% !important;
  }
  @media (max-width: 420px) {
    .step-tracker,
    .canon-l-tracker,
    .wl-tracker,
    .tracker,
    .progress-header,
    .progress-rail,
    .room-progress {
      grid-template-columns: auto minmax(0, 1fr) !important;
    }
    .step-name,
    .canon-l-tracker-meta,
    .round-stats {
      grid-column: 1 / -1 !important;
    }
  }
}
/* P2 desktop: бургер не нужен — табы помещаются */
@media (min-width: 1025px) {
  .canon-l-burger { display: none !important; }
}`;

  function injectCriticalCss(){
    if(document.querySelector("style[data-lab-unify-critical]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-lab-unify-critical", "true");
    style.textContent = criticalCss;
    document.head.appendChild(style);
  }

  /* Maria 27.05: «LinguaBoost Lab орёт при входе». Дополнительная защита:
     при загрузке любой Lab-страницы немедленно отменяем любую речь, которая
     могла начаться. Сам speak() в studio-shell/teaser вызывается только по клику,
     но если где-то остался артефакт — этот стоп его перекроет. */
  function stopAutoSpeech(){
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch(_) {}
  }

  /* P2: Бургер-меню для .canon-l-nav когда табов > 4 (уроки).
     На каталоге Lab обычно 4 таба — не трогаем. На уроках — 6+ табов
     («Цель/Грамматика/Практика/Задания/Чтение/Результат») обрезаются на mobile. */
  function setupNavBurger(){
    var navs = document.querySelectorAll(".canon-l-nav");
    if (!navs.length) return;
    navs.forEach(function(nav){
      var links = nav.querySelectorAll(".canon-l-link");
      if (links.length <= 4) return; // 4 и меньше — помещаются
      if (nav.classList.contains("has-burger")) return; // уже обработан

      nav.classList.add("has-burger");

      // Кнопка ☰
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "canon-l-burger";
      btn.setAttribute("aria-label", "Меню урока");
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = '<span class="canon-l-burger-icon">☰</span><span>Меню</span>';

      // Вставить кнопку перед nav
      nav.parentNode.insertBefore(btn, nav);

      function toggle(){
        var open = !nav.classList.contains("is-open");
        nav.classList.toggle("is-open", open);
        btn.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }

      btn.addEventListener("click", function(e){
        e.stopPropagation();
        toggle();
      });

      // Клик по ссылке закрывает меню (чтобы не висело при scroll)
      links.forEach(function(link){
        link.addEventListener("click", function(){
          nav.classList.remove("is-open");
          btn.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        });
      });

      // Клик вне nav — закрыть
      document.addEventListener("click", function(e){
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
          nav.classList.remove("is-open");
          btn.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  var levelCanonCss = `
body[data-lb-level] { font-family: "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif !important; }
body[data-lb-level] footer .canon-l-footer-brand,
body[data-lb-level] footer .canon-l-footer-mark,
body[data-lb-level] .canon-l-footer .canon-l-footer-brand,
body[data-lb-level] .canon-l-footer .canon-l-footer-mark { display:none !important; }
@media (min-width:721px) {
  body[data-lb-level] .canon-l-hero,
  body[data-lb-level] .hero,
  body[data-lb-level] .hero-banner,
  body[data-lb-level] .lab-hero {
    width:min(calc(100% - 120px),1320px) !important;
    max-width:1320px !important;
    margin-left:auto !important;
    margin-right:auto !important;
    box-sizing:border-box !important;
  }
  body[data-lb-page="english-booster"] main,
  body[data-lb-page="english-booster"] .wrap,
  body[data-lb-page="core-trainer"] main,
  body[data-lb-page="core-trainer"] .wrap,
  body[data-lb-page="restaurant-menu"] main,
  body[data-lb-page="restaurant-menu"] .wrap,
  body[data-lb-page="grammar-arcade"] main,
  body[data-lb-page="grammar-arcade"] .wrap,
  body[data-lb-page="whispering-library"] main,
  body[data-lb-page="whispering-library"] .wrap,
  body[data-lb-page="whispering-library"] .shell,
  body[data-lb-page="geo-quest"] main,
  body[data-lb-page="geo-quest"] .wrap,
  body[data-lb-page="stars"] main,
  body[data-lb-page="stars"] .wrap,
  body[data-lb-page="stars"] .shell {
    width:min(calc(100% - 120px),1320px) !important;
    max-width:1320px !important;
    margin-left:auto !important;
    margin-right:auto !important;
    box-sizing:border-box !important;
  }
  body[data-lb-level] footer.canon-l-footer,
  body[data-lb-level] .canon-l-footer {
    width:100% !important;
    max-width:none !important;
    margin-left:0 !important;
    margin-right:0 !important;
    box-sizing:border-box !important;
  }
}
body[data-lb-level="a1"] .canon-l-hero-title,
body[data-lb-level="a1"] .hero-title,
body[data-lb-level="a1"] .friendly-title {
  font-size:clamp(2.05rem,3.35vw,3.015rem) !important;
  line-height:.98 !important;
  letter-spacing:0 !important;
}
body[data-lb-level="a2b1"] .canon-l-hero-title,
body[data-lb-level="b1"] .canon-l-hero-title,
body[data-lb-level="a2b1"] .hero-title,
body[data-lb-level="b1"] .hero-title {
  font-size:clamp(2.25rem,3.75vw,3.375rem) !important;
  line-height:.96 !important;
  letter-spacing:0 !important;
}
body[data-lb-level="b2plus"] .canon-l-hero-title,
body[data-lb-level="c1"] .canon-l-hero-title,
body[data-lb-level="b2plus"] .hero-title,
body[data-lb-level="c1"] .hero-title {
  font-size:clamp(2.35rem,3.9vw,3.5rem) !important;
  line-height:.98 !important;
  letter-spacing:0 !important;
}
body[data-lb-level] .canon-l-section-title,
body[data-lb-level] .block-title,
body[data-lb-level] .section-title,
body[data-lb-level] .section-head h2,
body[data-lb-level] .round-title {
  font-family:"Unbounded","Manrope",system-ui,sans-serif !important;
  letter-spacing:0 !important;
}
body[data-lb-page="prepositions-world"] .world-mission-row,
body[data-lb-page="prepositions-world"] .world-mission-path,
body[data-lb-page="prepositions-world"] .flip-grid,
body[data-lb-page="prepositions-world"] .prep-choice-grid,
body[data-lb-page="prepositions-world"] .speaking-grid {
  align-items:stretch !important;
  gap:clamp(18px,2vw,28px) !important;
}
body[data-lb-page="prepositions-world"] .world-mission-words,
body[data-lb-page="prepositions-world"] .world-mission-path,
body[data-lb-page="prepositions-world"] .mini-action,
body[data-lb-page="prepositions-world"] .sentence-frame {
  margin-top:clamp(18px,1.6vw,26px) !important;
}
body[data-lb-page="easter"] .star-bar,
body[data-lb-page="easter"] .round-card,
body[data-lb-page="easter"] .mission-card {
  width:min(calc(100% - 120px),1320px) !important;
  max-width:1320px !important;
  margin-left:auto !important;
  margin-right:auto !important;
}
body[data-lb-page="english-booster"] .booster-listen-chip,
body[data-lb-page="english-booster"] .canon-l-hero-pill,
body[data-lb-page="english-booster"] .core-line-chip {
  white-space:normal !important;
  overflow:visible !important;
  text-overflow:clip !important;
}`;

  var a1MobileFinalCss = `
@media (max-width: 720px) {
  body[data-lb-level="a1"].lb-level-a1,
  body.lb-level-a1 {
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  body.lb-level-a1 .canon-l-topbar {
    position: relative !important;
    width: 100vw !important;
    max-width: 100vw !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto auto !important;
    grid-template-areas: "brand tools menu" !important;
    align-items: center !important;
    min-height: 52px !important;
    padding: 8px 12px !important;
    gap: 10px !important;
    overflow: visible !important;
  }
  body.lb-level-a1 .canon-l-brand {
    grid-area: brand !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    gap: 10px !important;
  }
  body.lb-level-a1 .canon-l-mark {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
  }
  body.lb-level-a1 .canon-l-copy {
    min-width: 0 !important;
  }
  body.lb-level-a1 .canon-l-name {
    display: block !important;
    max-width: 100% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 16px !important;
    line-height: 1.1 !important;
  }
  body.lb-level-a1 .canon-l-sub,
  body.lb-level-a1 .canon-l-crumbs,
  body.lb-level-a1 .canon-l-tools .palette-select {
    display: none !important;
  }
  body.lb-level-a1 .canon-l-burger {
    grid-area: menu !important;
    position: static !important;
    display: inline-flex !important;
    width: 42px !important;
    min-width: 42px !important;
    max-width: 42px !important;
    height: 36px !important;
    padding: 0 !important;
    justify-content: center !important;
    border-radius: 10px !important;
    font-size: 0 !important;
  }
  body.lb-level-a1 .canon-l-burger span:not(.canon-l-burger-icon) {
    display: none !important;
  }
  body.lb-level-a1 .canon-l-burger .canon-l-burger-icon {
    font-size: 18px !important;
    line-height: 1 !important;
  }
  body.lb-level-a1 .canon-l-tools {
    grid-area: tools !important;
    position: absolute !important;
    top: 8px !important;
    right: 10px !important;
    margin-left: 0 !important;
    display: inline-flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 5px !important;
    min-width: 0 !important;
    width: 86px !important;
    max-width: 86px !important;
  }
  body.lb-level-a1 .canon-l-tools .canon-l-pill,
  body.lb-level-a1 .canon-l-tools button {
    width: auto !important;
    min-width: 36px !important;
    max-width: 48px !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 8px !important;
    border-radius: 10px !important;
    font-size: 10px !important;
    line-height: 1 !important;
    letter-spacing: 0 !important;
    white-space: nowrap !important;
  }
  body.lb-level-a1 .canon-l-nav.has-burger,
  body.lb-level-a1 .canon-l-nav {
    grid-column: 1 / -1 !important;
    min-width: 0 !important;
  }
  body.lb-level-a1 .canon-l-nav.has-burger:not(.is-open) {
    display: none !important;
  }
  body.lb-level-a1 .canon-l-nav.has-burger.is-open {
    position: absolute !important;
    top: calc(100% + 6px) !important;
    left: 10px !important;
    right: 10px !important;
    width: auto !important;
  }

  body.lb-level-a1 .step-tracker,
  body.lb-level-a1 .canon-l-tracker {
    position: relative !important;
    top: auto !important;
    width: calc(100% - 20px) !important;
    max-width: calc(100vw - 20px) !important;
    min-height: 32px !important;
    margin: 8px auto 12px !important;
    padding: 5px 8px !important;
    display: grid !important;
    grid-template-columns: auto minmax(56px, 1fr) auto !important;
    gap: 7px !important;
    align-items: center !important;
    border-radius: 12px !important;
    box-sizing: border-box !important;
  }
  body.lb-level-a1 .step-name,
  body.lb-level-a1 .step-count {
    grid-column: auto !important;
    max-width: 72px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    font-size: 9px !important;
    letter-spacing: 0 !important;
  }
  body.lb-level-a1 .step-track {
    height: 4px !important;
    min-width: 0 !important;
  }

  body.lb-level-a1 .vocab-grid,
  body.lb-level-a1 .goal-grid,
  body.lb-level-a1 .learn-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  body.lb-level-a1 .vocab-card,
  body.lb-level-a1 .vocab-inner,
  body.lb-level-a1 .vocab-face,
  body.lb-level-a1 .vocab-en,
  body.lb-level-a1 .practice-item,
  body.lb-level-a1 .practice-q,
  body.lb-level-a1 .bank,
  body.lb-level-a1 .choice-row {
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  body.lb-level-a1 :is(.vocab-word,.vocab-ipa,.word-chip,.sentence-chip,.test-build-chip,.choice,.answer-btn,.drop-slot,.practice-hint,.sample,.formula,.hero-lead,.friendly-lead,.block-intro,.practice-q) {
    overflow-wrap: normal !important;
    word-break: normal !important;
    hyphens: none !important;
    -webkit-hyphens: none !important;
    letter-spacing: 0 !important;
  }
  body.lb-level-a1 :is(.word-chip,.sentence-chip,.test-build-chip,.choice,.answer-btn,.drop-slot,.practice-hint) {
    white-space: normal !important;
    min-width: 0 !important;
    max-width: 100% !important;
    width: auto !important;
    line-height: 1.18 !important;
  }
  body.lb-level-a1 .vocab-word {
    display: inline-block !important;
    max-width: 100% !important;
    font-size: clamp(16px, 4.4vw, 18px) !important;
    line-height: 1.18 !important;
  }

  body.lb-level-a1 .grammar-table-wrap {
    overflow: visible !important;
    border: 0 !important;
    background: transparent !important;
  }
  body.lb-level-a1 .grammar-table,
  body.lb-level-a1 .grammar-table thead,
  body.lb-level-a1 .grammar-table tbody,
  body.lb-level-a1 .grammar-table tr,
  body.lb-level-a1 .grammar-table th,
  body.lb-level-a1 .grammar-table td {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  body.lb-level-a1 .grammar-table thead {
    display: none !important;
  }
  body.lb-level-a1 .grammar-table tr {
    margin: 0 0 10px !important;
    border: 1px solid var(--line, rgba(8,19,50,.12)) !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: var(--surface-2, var(--surface, #fff)) !important;
  }
  body.lb-level-a1 .grammar-table td {
    display: grid !important;
    grid-template-columns: 86px minmax(0, 1fr) !important;
    gap: 10px !important;
    align-items: start !important;
    padding: 10px 11px !important;
    border-right: 0 !important;
    border-bottom: 1px solid var(--line, rgba(8,19,50,.12)) !important;
    white-space: normal !important;
  }
  body.lb-level-a1 .grammar-table td:last-child {
    border-bottom: 0 !important;
  }
  body.lb-level-a1 .grammar-table td::before {
    content: attr(data-label) !important;
    font-family: var(--mono, ui-monospace, monospace) !important;
    font-size: 9px !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
    color: var(--accent, #ff690a) !important;
    text-transform: uppercase !important;
  }
}
`;

  function injectLevelCanonCss(){
    if(document.querySelector("style[data-lab-level-canon]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-lab-level-canon", "true");
    style.textContent = levelCanonCss;
    document.head.appendChild(style);
  }

  function injectA1MobileFinalCss(){
    var style = document.querySelector("style[data-lab-a1-mobile-final]");
    if(!style){
      style = document.createElement("style");
      style.setAttribute("data-lab-a1-mobile-final", "true");
      style.textContent = a1MobileFinalCss;
    }
    var target = document.body || document.documentElement || document.head;
    if(style.parentNode !== target){
      target.appendChild(style);
    }
  }

  function labelA1GrammarTables(){
    if(!document.body || document.body.dataset.lbLevel !== "a1") return;
    document.querySelectorAll(".grammar-table").forEach(function(table){
      var headers = Array.prototype.map.call(table.querySelectorAll("thead th"), function(th){
        return th.textContent.trim();
      });
      if(!headers.length) return;
      table.querySelectorAll("tbody tr").forEach(function(row){
        Array.prototype.forEach.call(row.children, function(cell, index){
          if(headers[index] && !cell.getAttribute("data-label")){
            cell.setAttribute("data-label", headers[index]);
          }
        });
      });
    });
  }

  function classifyLesson(){
    var body = document.body;
    if(!body) return;
    var path = location.pathname.replace(/\\/g, "/").toLowerCase();
    var page = "";
    var level = "";
    if(path.indexOf("/a1/") !== -1 || path.indexOf("/pre-a1/") !== -1) level = "a1";
    if(path.indexOf("/a2/") !== -1) level = "a2b1";
    if(path.indexOf("/b1/") !== -1) level = "b1";
    if(path.indexOf("/b2-plus/") !== -1) level = "b2plus";
    if(path.indexOf("/c1/") !== -1) level = "c1";
    if(path.indexOf("prepositions-world") !== -1) page = "prepositions-world";
    else if(path.indexOf("easter-english") !== -1) page = "easter";
    else if(path.indexOf("past-simple-adventure") !== -1) page = "past-simple";
    else if(path.indexOf("english-booster-a2-b1") !== -1) page = "english-booster";
    else if(path.indexOf("core-trainer-a2-b1") !== -1) page = "core-trainer";
    else if(path.indexOf("restaurant-menu-lab") !== -1) page = "restaurant-menu";
    else if(path.indexOf("grammar-arcade") !== -1) page = "grammar-arcade";
    else if(path.indexOf("stars-and-stellar") !== -1) page = "stars";
    else if(path.indexOf("whispering-library") !== -1) page = "whispering-library";
    else if(path.indexOf("articles-with-geographical") !== -1) page = "geo-quest";
    else if(path.indexOf("word-building") !== -1) page = "word-forge";
    else if(path.indexOf("ancient-china") !== -1) page = "ancient-china";
    else if(path.indexOf("space-explorers") !== -1) page = "space-explorers";
    else if(path.indexOf("school-words") !== -1) page = "school-words";
    else if(path.indexOf("a1-01-present-simple-routines") !== -1) page = "a1-01";
    if(level && !body.dataset.lbLevel) body.dataset.lbLevel = level;
    if(page && !body.dataset.lbPage) body.dataset.lbPage = page;
  }

  function lockMobileWidths(){
    classifyLesson();
    if(window.innerWidth > 720) return;
    var mobileWidth = Math.max(280, window.innerWidth - 64) + "px";
    document.querySelectorAll(".canon-l-hero, .canon-l-hero-inner").forEach(function(node){
      node.style.setProperty("width", mobileWidth, "important");
      node.style.setProperty("inline-size", mobileWidth, "important");
      node.style.setProperty("max-width", mobileWidth, "important");
      node.style.setProperty("max-inline-size", mobileWidth, "important");
      node.style.setProperty("min-width", "0", "important");
      node.style.setProperty("box-sizing", "border-box", "important");
    });
    if(document.body && document.body.dataset.lbPage === "restaurant-menu"){
      var restaurantWidth = Math.max(280, window.innerWidth - 28) + "px";
      document.querySelectorAll(".hero-visual, .hero-visual > *, .hero-inner > *, .hero img").forEach(function(node){
        node.style.setProperty("width", restaurantWidth, "important");
        node.style.setProperty("max-width", restaurantWidth, "important");
        node.style.setProperty("min-width", "0", "important");
        node.style.setProperty("box-sizing", "border-box", "important");
        node.style.setProperty("overflow", "hidden", "important");
      });
    }
  }

  function setImportant(node, prop, value){
    if(node) node.style.setProperty(prop, value, "important");
  }

  function hideFooterLogos(){
    document.querySelectorAll("footer .canon-l-footer-brand, footer .canon-l-footer-mark, .canon-l-footer .canon-l-footer-brand, .canon-l-footer .canon-l-footer-mark").forEach(function(node){
      setImportant(node, "display", "none");
      setImportant(node, "visibility", "hidden");
      setImportant(node, "width", "0");
      setImportant(node, "height", "0");
      setImportant(node, "overflow", "hidden");
    });
  }

  function lockLevelTypography(){
    classifyLesson();
    var body = document.body;
    if(!body || !body.dataset.lbLevel) return;
    var level = body.dataset.lbLevel;
    var mobile = window.innerWidth <= 720;
    var heroSize = mobile
      ? (level === "a1" ? "36px" : "38px")
      : (level === "a1" ? "48.24px" : (level === "b2plus" || level === "c1" ? "56px" : "54px"));
    document.querySelectorAll(".canon-l-hero-title, .hero-title, .friendly-title").forEach(function(node){
      setImportant(node, "font-family", '"Unbounded", "Manrope", system-ui, sans-serif');
      setImportant(node, "font-size", heroSize);
      setImportant(node, "line-height", level === "a1" ? ".98" : ".96");
      setImportant(node, "letter-spacing", "0");
      if(mobile){
        setImportant(node, "max-width", "calc(100vw - 96px)");
        setImportant(node, "white-space", "normal");
        setImportant(node, "overflow-wrap", "break-word");
        setImportant(node, "word-break", "normal");
      }
    });
    if(body.dataset.lbPage === "past-simple"){
      document.body.style.setProperty("font-size", "16px", "important");
      document.querySelectorAll(".hero-title, .canon-l-hero-title").forEach(function(node){
        setImportant(node, "font-size", mobile ? "40px" : "48.24px");
      });
    }
    if(body.dataset.lbPage === "grammar-arcade"){
      document.querySelectorAll(".hero-title, .canon-l-hero-title").forEach(function(node){
        setImportant(node, "font-size", "54px");
      });
    }
    if(/^(past-simple|core-trainer)$/.test(body.dataset.lbPage || "")){
      var firstH1 = document.querySelector("h1");
      if(firstH1){
        setImportant(firstH1, "font-family", '"Unbounded", "Manrope", system-ui, sans-serif');
        setImportant(firstH1, "font-size", body.dataset.lbPage === "core-trainer" ? "54px" : "48.24px");
        setImportant(firstH1, "line-height", ".98");
        setImportant(firstH1, "letter-spacing", "0");
      }
    }
    if(body.dataset.lbPage === "a1-01"){
      document.querySelectorAll(".friendly-photo .hero-img, [data-hero-img], [data-story-img]").forEach(function(node){
        setImportant(node, "object-position", "43% 42%");
      });
    }
  }

  function lockDesktopCanon(){
    classifyLesson();
    if(window.innerWidth <= 720) return;
    var body = document.body;
    if(!body || !body.dataset.lbLevel) return;
    var wide = Math.min(window.innerWidth - 120, 1320);
    if(wide < 900) wide = Math.max(window.innerWidth - 56, 320);
    var width = wide + "px";
    document.querySelectorAll(".canon-l-hero, .hero, .hero-banner, .lab-hero").forEach(function(node){
      setImportant(node, "width", width);
      setImportant(node, "max-width", "1320px");
      setImportant(node, "margin-left", "auto");
      setImportant(node, "margin-right", "auto");
      setImportant(node, "box-sizing", "border-box");
    });
    document.querySelectorAll("main, .wrap, .shell, .container").forEach(function(container){
      Array.prototype.forEach.call(container.children || [], function(node){
        if(!node.matches || !node.matches(".canon-l-collapsible, .canon-l-why, .canon-l-tracker, .wl-tracker, .tracker, .step-tracker, .lesson-score-card, .lesson-flow, .learn-panel, .block, .section, .lesson-section, .lesson-illustration, .activity-section, .mission-card, .round-card, .star-bar, .lab-panel, .practice-zone, .output-card, .module-progress, .lesson-foot")) return;
        setImportant(node, "width", width);
        setImportant(node, "max-width", "1320px");
        setImportant(node, "margin-left", "auto");
        setImportant(node, "margin-right", "auto");
        setImportant(node, "box-sizing", "border-box");
      });
    });
    if(/^(english-booster|core-trainer|restaurant-menu|grammar-arcade|whispering-library|geo-quest|stars|space-explorers)$/.test(body.dataset.lbPage || "")){
      document.querySelectorAll("main, .wrap, .shell, .container").forEach(function(node){
        setImportant(node, "width", width);
        setImportant(node, "max-width", "1320px");
        setImportant(node, "margin-left", "auto");
        setImportant(node, "margin-right", "auto");
        setImportant(node, "box-sizing", "border-box");
      });
    }
    if(body.dataset.lbPage === "whispering-library"){
      document.querySelectorAll("main, .wrap, .shell, .lesson-foot").forEach(function(node){
        setImportant(node, "transform", "translateX(-92px)");
      });
    }
    document.querySelectorAll(".lesson-foot").forEach(function(node){
      setImportant(node, "width", width);
      setImportant(node, "max-width", "1320px");
      setImportant(node, "margin-left", "auto");
      setImportant(node, "margin-right", "auto");
      setImportant(node, "box-sizing", "border-box");
      if(body.dataset.lbPage === "prepositions-world"){
        setImportant(node, "margin-top", "2cm");
      }
      if(body.dataset.lbPage === "restaurant-menu"){
        setImportant(node, "margin-top", "-1.2cm");
      }
    });
    if(body.dataset.lbLevel === "a1"){
      document.querySelectorAll(".step-tracker, .lesson-score-card, .lesson-flow, .learn-panel, .block").forEach(function(node){
        setImportant(node, "width", width);
        setImportant(node, "max-width", "1320px");
        setImportant(node, "margin-left", "auto");
        setImportant(node, "margin-right", "auto");
        setImportant(node, "box-sizing", "border-box");
      });
    }
    document.querySelectorAll("footer.canon-l-footer, .canon-l-footer").forEach(function(node){
      setImportant(node, "width", "100%");
      setImportant(node, "max-width", "none");
      setImportant(node, "margin-left", "0");
      setImportant(node, "margin-right", "0");
      setImportant(node, "box-sizing", "border-box");
    });
    document.querySelectorAll(".level-bubble, .lab-level-bubble, .nge-level-badge, .canon-l-level, .canon-l-topbar .canon-l-pill").forEach(function(node){
      var darkLab = document.documentElement.getAttribute("data-theme") === "black-lab";
      setImportant(node, "background", darkLab ? "color-mix(in srgb, var(--surface, #fff) 92%, transparent)" : "color-mix(in srgb, var(--surface, #fff) 88%, var(--accent, #8a3ffc) 12%)");
      setImportant(node, "border", darkLab ? "1px solid var(--line-2, rgba(198,177,255,.22))" : "1px solid color-mix(in srgb, var(--accent, #8a3ffc) 36%, transparent)");
      setImportant(node, "color", "var(--text, #1f1830)");
      setImportant(node, "box-shadow", "none");
    });
    hideFooterLogos();
    lockLevelTypography();
  }

  function makeSummary(text){
    var summary = document.createElement("summary");
    summary.className = "canon-l-collapsible-summary";
    summary.innerHTML = '<span>' + text + '</span><span class="canon-l-collapsible-icon" aria-hidden="true"></span>';
    return summary;
  }

  function labelFor(node, fallback){
    var explicit = node.getAttribute("data-collapse-title");
    if(explicit) return explicit;
    var step = node.querySelector(".canon-l-tracker-step");
    if(step && step.textContent.trim()) return step.textContent.trim();
    var eyebrow = node.querySelector(".canon-l-why-eyebrow");
    var heading = node.querySelector("h1,h2,h3");
    if(eyebrow && eyebrow.textContent.trim()) return eyebrow.textContent.trim();
    if(heading && heading.textContent.trim()) return heading.textContent.trim();
    var aria = node.getAttribute("aria-label");
    if(aria) return aria;
    return fallback;
  }

  function wrapNode(node, title, className){
    if(!node || node.closest(".canon-l-collapsible")) return;
    if(node.tagName && node.tagName.toLowerCase() === "details"){
      node.classList.add("canon-l-collapsible", className);
      node.removeAttribute("open");
      var existingSummary = node.querySelector(":scope > summary");
      if(existingSummary){
        existingSummary.classList.add("canon-l-collapsible-summary");
      }else{
        node.insertBefore(makeSummary(title), node.firstChild);
      }
      return;
    }
    var details = document.createElement("details");
    details.className = "canon-l-collapsible " + className;
    if(node.getAttribute("style")) details.setAttribute("style", node.getAttribute("style"));
    details.appendChild(makeSummary(title));
    node.parentNode.insertBefore(details, node);
    details.appendChild(node);
    node.classList.add("canon-l-collapsible-body");
  }

  function alignTracker(node){
    if(!node || node.closest(".canon-l-collapsible")) return;
    node.classList.add("canon-l-progress-align");
  }

  function isInteractiveLesson(){
    return !!document.querySelector([
      ".canon-l-tracker",
      ".wl-tracker",
      ".rail",
      ".progress-rail",
      ".progress-header",
      ".room-progress",
      "#activities-container",
      "#progressFill",
      "#progressText",
      "[id^='act']",
      ".lesson-illustration.is-interactive",
      ".activity-card",
      ".interactive-card"
    ].join(","));
  }

  function init(){
    injectCriticalCss();
    injectLevelCanonCss();
    stopAutoSpeech();
    setupNavBurger();
    classifyLesson();
    injectA1MobileFinalCss();
    labelA1GrammarTables();
    lockMobileWidths();
    lockDesktopCanon();
    hideFooterLogos();
    lockLevelTypography();
    if(!isInteractiveLesson()) return;
    document.querySelectorAll(".canon-l-why, .wl-why").forEach(function(node){
      wrapNode(node, labelFor(node, "Why this lesson works"), "is-why");
    });
    document.querySelectorAll(".canon-l-tracker, .wl-tracker").forEach(function(node){
      alignTracker(node);
    });
  }

  if(document.readyState === "loading"){
    injectCriticalCss();
    injectLevelCanonCss();
    injectA1MobileFinalCss();
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
  window.addEventListener("resize", lockMobileWidths);
  window.addEventListener("resize", lockDesktopCanon);
  window.addEventListener("load", function(){
    classifyLesson();
    injectA1MobileFinalCss();
    labelA1GrammarTables();
    lockDesktopCanon();
    hideFooterLogos();
    lockLevelTypography();
  });
  new MutationObserver(function(){
    hideFooterLogos();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
