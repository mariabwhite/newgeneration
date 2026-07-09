/* a1-cycle-tweaks.js v4 · 2026-07-09
   Локальные доводки для A1-цикла (a1-01…a1-08).

   1. Speech Coach (.lab-coach-section) — переставляет перед <nav.lesson-foot>,
      чтобы не был последним блоком урока (Мария 2026-07-09).

   2. Кнопка «📚 всю секцию в домашку» на Speech Coach — гарантирует конец
      секции (без флага, appendChild-noop).

   3. Lesson total (#lab-total-block) — max-width 1280 + карточка как .block.

   4. v4: VOCAB-add fix. Click «+» на .vocab-card теперь сохраняется в
      localStorage как kind='vocab' с полями en/ipa/ru/ex, а не как безлико
      «raw-block». В `.homework/index.html` уже есть ветка `if (kind='vocab')`
      которая рендерит красивую vocab-card. Раньше отправлялся raw-block с
      HTML-клоном, .homework падал в generic 'Блок'.

   5. v4: Sticky marker «✓ в домашке» прямо на самой vocab-card (не только
      toast в углу). Мария: «слова не видно при добавлении, непонятно где
      искать» — теперь виден статус на карточке до перезагрузки.
*/
(function(){
  if (window.__a1CycleTweaks) return;
  window.__a1CycleTweaks = true;

  function hwKey(){ return 'lab-hw:' + location.pathname; }
  function loadHw(){
    try { return JSON.parse(localStorage.getItem(hwKey()) || '[]'); }
    catch(e){ return []; }
  }
  function saveHw(arr){
    try { localStorage.setItem(hwKey(), JSON.stringify(arr)); } catch(e){}
  }

  function injectStyle(){
    if (document.getElementById('a1-cycle-tweaks-style')) return;
    var s = document.createElement('style');
    s.id = 'a1-cycle-tweaks-style';
    s.textContent =
      // Lesson total → как обычный .block
      // width — 1-в-1 с .lesson-foot (Codex etalon 20260512 override: 1320,
      // не 1180 как у .block). Формула из #codex-lesson-foot-etalon-20260512.
      // Раньше моё правило давало 1180 → визуально Lesson total уже навигации
      // на 140px (замер: foot 1320, total 1180). Приведено 1-в-1.
      '#lab-total-block{width:min(calc(100% - 2cm), 1320px) !important;max-width:1320px !important;'+
        'margin:32px auto !important;padding:28px clamp(20px,3vw,32px) !important;'+
        'border:1px solid var(--line,rgba(255,255,255,.14)) !important;'+
        'background:color-mix(in srgb, var(--surface,#fff) 94%, transparent) !important;'+
        'border-radius:20px !important;box-sizing:border-box !important;'+
        'box-shadow:0 18px 46px color-mix(in srgb,var(--brand,#7c3aed) 8%,transparent) !important}'+
      '#lab-total-block > div:first-child{background:transparent !important;border:0 !important;padding:0 0 12px !important}'+
      '#lab-total-block > div:last-child{gap:16px !important}'+
      // Обе колонки Band + CEFR — одинаковый мягкий accent-фон. Раньше Band
      // была на rgba(255,255,255,.05) — невидима на светлой теме.
      '#lab-total-block > div:last-child > div{border-radius:14px !important;padding:18px 22px !important;'+
        'background:color-mix(in srgb, var(--accent,#f59e0b) 10%, transparent) !important;'+
        'border:1px solid color-mix(in srgb, var(--accent,#f59e0b) 32%, transparent) !important}'+
      // Числа Band + CEFR — крупнее и в accent-цвет, чтоб «глазом видно»
      '#lab-total-block > div:last-child > div > div:nth-child(2){font-size:2rem !important;color:var(--accent,#f59e0b) !important;font-weight:900 !important}'+
      '@media(max-width:600px){#lab-total-block{padding:20px 16px !important;width:calc(100% - 20px) !important}'+
        '#lab-total-block > div:last-child{grid-template-columns:1fr !important}}'+
      // Sticky «✓ в домашке» на vocab-card
      '.vocab-card.a1hw-added{outline:2px solid #f59e0b;outline-offset:2px;border-radius:14px;position:relative}'+
      '.vocab-card .a1hw-marker{position:absolute;top:-14px;left:12px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;'+
        'font:900 10px/1 "JetBrains Mono",monospace;letter-spacing:.12em;padding:6px 12px;border-radius:999px;'+
        'text-transform:uppercase;pointer-events:none;box-shadow:0 6px 18px rgba(245,158,11,.42);z-index:6}'+
      // Улучшенный toast: полоса по центру-верху, крупнее
      '.a1hw-word-toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-16px);'+
        'background:linear-gradient(135deg,#92400e,#f59e0b);color:#fff;padding:14px 28px;border-radius:999px;'+
        'font:800 15px/1.2 "Manrope",sans-serif;z-index:99999;opacity:0;transition:all .3s ease-out;'+
        'box-shadow:0 12px 40px rgba(245,158,11,.42);max-width:90vw;text-align:center;pointer-events:none}'+
      '.a1hw-word-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}'+
      '.a1hw-word-toast .word{font-family:"JetBrains Mono",monospace;background:rgba(255,255,255,.22);padding:2px 10px;border-radius:6px;margin:0 6px}';
    document.head.appendChild(s);
  }

  function bigToast(html){
    var t = document.querySelector('.a1hw-word-toast');
    if (!t) { t = document.createElement('div'); t.className = 'a1hw-word-toast'; document.body.appendChild(t); }
    t.innerHTML = html;
    requestAnimationFrame(function(){ t.classList.add('show'); });
    clearTimeout(t.__tt);
    t.__tt = setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }

  function extractVocabFields(card){
    var word = (card.querySelector('.vocab-word, .word, .front .word, .vocab-front .word')?.textContent || '').trim();
    var ipa = (card.querySelector('.vocab-ipa, .ipa')?.textContent || '').trim();
    var ru = (card.querySelector('.vocab-ru, .ru, .meaning, .vocab-face .vocab-ru')?.textContent || '').trim();
    var ex = (card.querySelector('.vocab-example, .example, .ex, .vocab-back .vocab-example')?.textContent || '').trim();
    return { en: word, ipa: ipa, ru: ru, ex: ex };
  }

  // Апгрейд последнего raw-block item в vocab, если source — .vocab-card
  function upgradeLastVocab(card){
    var fields = extractVocabFields(card);
    if (!fields.en) return;
    var arr = loadHw();
    if (!arr.length) return;
    // Найдём последний item который матчит эту карточку (по question ИЛИ по html-fragment)
    var idx = -1;
    for (var i = arr.length - 1; i >= 0; i--) {
      var it = arr[i];
      var byQ = (it.question || '').indexOf(fields.en) >= 0;
      var byHtml = it.html && it.html.indexOf('>' + fields.en + '<') >= 0;
      if (byQ || byHtml) { idx = i; break; }
    }
    if (idx < 0) return;
    var it = arr[idx];
    it.kind = 'vocab';
    it.en = fields.en;
    it.ipa = fields.ipa;
    it.ru = fields.ru;
    it.ex = fields.ex;
    it.word = fields.en;
    it.title = fields.en;
    arr[idx] = it;
    saveHw(arr);
  }

  // Marker «✓ в домашке» на карточке
  function markCard(card, on){
    if (on) {
      card.classList.add('a1hw-added');
      if (!card.querySelector('.a1hw-marker')) {
        var m = document.createElement('div');
        m.className = 'a1hw-marker';
        m.textContent = '✓ в домашке';
        card.appendChild(m);
      }
    } else {
      card.classList.remove('a1hw-added');
      var m = card.querySelector('.a1hw-marker');
      if (m) m.remove();
    }
  }

  // Обход всех vocab-card, синхронизация markers c localStorage
  function syncVocabMarkers(){
    var arr = loadHw();
    var vocabWords = new Set(arr.filter(function(x){ return x.kind === 'vocab' && x.en; }).map(function(x){ return x.en; }));
    // Также raw-block с vocab-card внутри — временно для upgrade
    document.querySelectorAll('.vocab-card').forEach(function(card){
      var fields = extractVocabFields(card);
      if (!fields.en) return;
      var inHw = vocabWords.has(fields.en) || arr.some(function(x){
        return x.html && x.html.indexOf('>' + fields.en + '<') >= 0;
      });
      markCard(card, inHw);
    });
  }

  // Перехват клика на .lab-hw-add внутри .vocab-card
  function bindVocabPlusClicks(){
    document.querySelectorAll('.vocab-card .lab-hw-add').forEach(function(btn){
      if (btn.__a1VocabBound) return;
      btn.__a1VocabBound = true;
      btn.addEventListener('click', function(){
        var card = btn.closest('.vocab-card');
        if (!card) return;
        var fields = extractVocabFields(card);
        // lab-homework успевает сохранить свой item раньше нас (одна tick).
        // Микро-задержка → апгрейд + маркер + шумный toast.
        setTimeout(function(){
          upgradeLastVocab(card);
          syncVocabMarkers();
          // Только если reallу добавилось (кнопка стала ✓)
          if (btn.classList.contains('added')) {
            bigToast('Слово <span class="word">' + fields.en + '</span> в домашке · открой «Моя домашка» сверху');
          } else {
            bigToast('Слово <span class="word">' + fields.en + '</span> убрано из домашки');
          }
        }, 60);
      }, true);
    });
  }

  function pinCoach(){
    var foot = document.querySelector('nav.lesson-foot, .lesson-foot');
    document.querySelectorAll('.lab-coach-section').forEach(function(sec){
      var btn = sec.querySelector(':scope > .lab-hw-section-btn');
      if (btn && sec.lastElementChild !== btn) {
        btn.style.cssText = 'display:flex;margin:18px auto 4px;align-self:center';
        sec.appendChild(btn);
      }
      if (foot && sec.parentNode) {
        if (foot.parentNode === sec.parentNode) {
          var siblings = Array.from(foot.parentNode.children);
          if (siblings.indexOf(sec) > siblings.indexOf(foot)) {
            foot.parentNode.insertBefore(sec, foot);
          }
        } else {
          foot.parentNode.insertBefore(sec, foot);
        }
      }
    });
  }

  function tick(){
    pinCoach();
    bindVocabPlusClicks();
    syncVocabMarkers();
  }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    injectStyle();
    tick();
    var mo = new MutationObserver(function(){ tick(); });
    mo.observe(document.body, { childList:true, subtree:true });
    [400, 1500, 3500, 7000, 12000].forEach(function(ms){ setTimeout(tick, ms); });
    // Синхронизация markers при внешнем изменении hw (например теми же ключами в другой вкладке)
    window.addEventListener('storage', function(ev){
      if (ev.key === hwKey()) syncVocabMarkers();
    });
  });
})();
