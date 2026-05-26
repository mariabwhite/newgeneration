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
}`;

  function injectCriticalCss(){
    if(document.querySelector("style[data-lab-unify-critical]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-lab-unify-critical", "true");
    style.textContent = criticalCss;
    document.head.appendChild(style);
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

  function injectLevelCanonCss(){
    if(document.querySelector("style[data-lab-level-canon]")) return;
    var style = document.createElement("style");
    style.setAttribute("data-lab-level-canon", "true");
    style.textContent = levelCanonCss;
    document.head.appendChild(style);
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
    var heroSize = level === "a1" ? "48.24px" : (level === "b2plus" || level === "c1" ? "56px" : "54px");
    document.querySelectorAll(".canon-l-hero-title, .hero-title, .friendly-title").forEach(function(node){
      setImportant(node, "font-family", '"Unbounded", "Manrope", system-ui, sans-serif');
      setImportant(node, "font-size", heroSize);
      setImportant(node, "line-height", level === "a1" ? ".98" : ".96");
      setImportant(node, "letter-spacing", "0");
    });
    if(body.dataset.lbPage === "past-simple"){
      document.body.style.setProperty("font-size", "16px", "important");
      document.querySelectorAll(".hero-title, .canon-l-hero-title").forEach(function(node){
        setImportant(node, "font-size", "48.24px");
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
    classifyLesson();
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
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
  window.addEventListener("resize", lockMobileWidths);
  window.addEventListener("resize", lockDesktopCanon);
  window.addEventListener("load", function(){
    classifyLesson();
    lockDesktopCanon();
    hideFooterLogos();
    lockLevelTypography();
  });
  new MutationObserver(function(){
    hideFooterLogos();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
