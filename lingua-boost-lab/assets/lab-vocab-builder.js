/* lab-vocab-builder.js v48 — Универсальный словарь + LIVE PUSH.
   v48 (2026-07-08): FIX SyntaxError на строке 13 (комментарий v1 закрывался
        слишком рано, IIFE вообще не запускалась → vocab-builder МЁРТВЫЙ на
        всех 61 уроке с 2026-05-24). Также click-to-vocab теперь работает
        в обычном режиме (не только observer): ученик или учитель кликом
        по слову в тексте .card/.reading/.story добавляет его в блок словаря.
        Guards исключают клики в .homework и по интерактивам упражнений.
   v47 (2026-07-07): FIX кнопка «+ добавить своё слово» ТЕПЕРЬ появляется и на
        уроках со статичным vocab-контейнером (у 36 уроков раньше была скрыта
        из-за early return null в findOrBuildSection). Инцидент Маша 2026-07-07.
   v46 (2026-07-05): двусторонний режим. Добавление слов в vocab работает у ВСЕХ
        — учителя и ученика одинаково. Guard `if (!teacherMode) return` снят
        в hookSelection и рендере кнопки «+ добавить своё слово».
        Единственное ограничение — observer mode (URL ?observe=…): смотришь,
        не добавляешь. teacherMode остаётся только для облачного snapshot в
        Supabase (cloudSyncExtras) — это отдельная механика, не касается UI.
        Установлено Машей: «все функции в уроке взаимны, нет ученика и учителя».

   Урок объявляет:
     window.LAB_VOCAB = [
       { word: 'environment', ipa: '/ɪnˈvaɪrənmənt/', ru: 'окружающая среда',
         example: 'We must protect the environment.', audio: 'assets/audio/env.mp3' },
       { word: 'pollution', ipa: '/pəˈluːʃən/', ru: 'загрязнение' },
       ...
     ];

   Модуль:
     • Строит секцию «📖 Vocabulary» с flip-cards (если её нет в HTML).
     • На каждой карточке: front = word + IPA, back = ru + example, 🔊 кнопка
       (audio файл или TTS через speechSynthesis API), ➕ в домашку (lab-homework).
     • Подсвечивает каждое слово в тексте урока (.card, p, li) — мягкое
       подчёркивание, hover → tooltip с IPA + ru + 🔊.
     • УЧИТЕЛЬСКИЙ «+ добавить слово» — Маша выделяет слово в тексте → плавающая
       кнопка «+ в словарь» → mini-modal (word/IPA/ru/example) → добавляется
       в localStorage extras + перерисовывается vocab section.

   Observer mode (URL ?observe=...) — учитель видит структуру, но не добавляет. */
(function(){
  if (window.__labVocabLoadedV48) return;
  window.__labVocabLoadedV48 = true;

  var observeMode = /[?&]observe=/.test(location.search);
  // v45: унифицировано с lab-sync.js — принимаем ?teacher=on (стандарт), ?teacher=1
  // (legacy), ?role=teacher (legacy) + sticky localStorage 'lab-teacher-mode'
  var teacherMode = !observeMode && (
    /[?&](teacher|t)=(1|on)/.test(location.search) ||
    /[?&]role=teacher/.test(location.search) ||
    (function(){ try { return localStorage.getItem('lab-teacher-mode') === 'on'; } catch(e){ return false; } })()
  );

  function injectStyle(){
    if (document.getElementById('lab-vb-style')) return;
    var s = document.createElement('style');
    s.id = 'lab-vb-style';
    s.textContent = ''+
      /* Старые кастомные vocab-FAB у Вани и др. — наш модуль их заменяет */
      '.vocab-box,.vocab-bag,.my-vocab-fab{display:none !important}'+
      /* v51 2026-07-08 23:30: canon-l-mark с пустым HTML — показать N через :empty::before (для a1, ancient-china); mark с SVG (restaurant) не трогаем — :empty не сработает. Букву N добавляем универсально для .brand-mark/.brand-logo-mark/.cb-mark (старая топбар-система). */
      '.canon-l-topbar .canon-l-mark:empty::before{content:"N" !important;font-family:"Unbounded","Manrope",system-ui,sans-serif !important;font-weight:900 !important;font-size:18px !important;font-style:normal !important;line-height:1 !important;color:#fff !important;letter-spacing:0 !important;display:inline-block !important;text-align:center !important}'+
      '.topbar .brand-mark,.friendly-topbar .brand-mark,.lab-topbar .brand-mark,.cmdbar .brand-mark,.cmdbar .cb-mark,.friendly-topbar .brand-logo-mark{position:relative !important;overflow:hidden !important;display:grid !important;place-items:center !important;width:34px !important;height:34px !important;min-width:34px !important;border:0 !important;border-radius:9px !important;border-top-right-radius:0 !important;background:var(--accent,var(--brand,var(--lb-link-hover,#ff690a))) !important;background-image:none !important;color:#fff !important;overflow:hidden !important}'+
      '.topbar .brand-mark>*,.friendly-topbar .brand-mark>*,.lab-topbar .brand-mark>*,.cmdbar .brand-mark>*,.cmdbar .cb-mark>*,.friendly-topbar .brand-logo-mark>*{display:none !important}'+
      '.topbar .brand-mark>span[style*="right:0"],.friendly-topbar .brand-mark>span[style*="right:0"],.lab-topbar .brand-mark>span[style*="right:0"],.cmdbar .brand-mark>span[style*="right:0"],.cmdbar .cb-mark>span[style*="right:0"],.friendly-topbar .brand-logo-mark>span[style*="right:0"]{display:none !important}'+
      '.topbar .brand-mark::before,.friendly-topbar .brand-mark::before,.lab-topbar .brand-mark::before,.cmdbar .brand-mark::before,.cmdbar .cb-mark::before,.friendly-topbar .brand-logo-mark::before{content:"N" !important;position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) !important;z-index:1 !important;display:block !important;background:none !important;color:#fff !important;font-family:var(--display,"Manrope","Unbounded",system-ui,sans-serif) !important;font-size:20px !important;font-weight:900 !important;font-style:normal !important;line-height:1 !important;letter-spacing:0 !important;text-align:center !important}'+
      '.topbar .brand-mark::after,.friendly-topbar .brand-mark::after,.lab-topbar .brand-mark::after,.cmdbar .brand-mark::after,.cmdbar .cb-mark::after,.friendly-topbar .brand-logo-mark::after{content:"" !important;display:block !important;position:absolute !important;top:0 !important;right:0 !important;bottom:auto !important;left:auto !important;width:14px !important;height:14px !important;border:0 !important;border-radius:0 !important;outline:0 !important;background:#ffffff !important;background-image:none !important;clip-path:polygon(100% 0,0 0,100% 100%) !important;-webkit-clip-path:polygon(100% 0,0 0,100% 100%) !important;z-index:9 !important;pointer-events:none !important;transform:none !important;box-shadow:none !important;filter:none !important}'+
      '.lab-vocab-section{background:transparent !important;border:0 !important;box-sizing:border-box;display:block;padding-left:0 !important;padding-right:0 !important}'+
      '.lab-vocab-panel{padding:20px 22px;border-radius:14px;'+
        'background:color-mix(in srgb, var(--accent, #7c3aed) 7%, var(--card, var(--surface, rgba(15,20,30,.82))));'+
        'border:1px solid color-mix(in srgb, var(--accent, #7c3aed) 25%, transparent);'+
        'font-family:"Manrope",sans-serif;color:var(--text, #f3eee5);'+
        'box-sizing:border-box;display:block;width:100%;margin-left:0;margin-right:0}'+
      '[data-lab-theme="dark"] .lab-vocab-panel{background:var(--card, var(--surface, #1b232d));'+
        'border-color:var(--line, color-mix(in srgb, var(--accent, #7c3aed) 35%, transparent));color:var(--text, #f3eee5)}'+
      '.lab-vocab-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:12px}'+
      '.lab-vocab-h h2{margin:0 !important;font:800 1.25rem/1.2 "Manrope",sans-serif !important;color:var(--accent, #fbbf24) !important;display:flex;align-items:center;gap:10px}'+
      '[data-lab-theme="dark"] .lab-vocab-h h2{color:var(--accent, #e9d6ff) !important}'+
      '.lab-vocab-h .meta{font:600 .82rem/1.4 "JetBrains Mono",monospace;letter-spacing:.08em;color:color-mix(in srgb, var(--accent, #6b46c1) 70%, var(--text, #1a1f2e))}'+
      '[data-lab-theme="dark"] .lab-vocab-h .meta{color:color-mix(in srgb, var(--accent, #c5a3ff) 72%, var(--text, #f3eee5))}'+
      '.lab-vocab-section{max-width:1240px !important;width:100% !important;margin-left:auto !important;margin-right:auto !important;padding-left:clamp(16px,3vw,28px) !important;padding-right:clamp(16px,3vw,28px) !important;overflow:visible !important}'+
      '.lab-vocab-grid{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(220px,280px)) !important;justify-content:start !important;align-items:stretch;gap:12px;width:100%;max-width:100%;box-sizing:border-box}'+
'@media(max-width:600px){.topbar,.friendly-topbar,.lab-topbar,.cmdbar,.canon-l-topbar{box-sizing:border-box !important;max-width:100vw !important;overflow:hidden !important;flex-wrap:wrap !important}.topbar .spacer,.friendly-topbar .spacer,.lab-topbar .spacer,.cmdbar .spacer,.canon-l-topbar .spacer{display:none !important}.topbar .btn-sm,.cmdbar .btn-sm,.lab-topbar .btn-sm,.topbar .pill,.cmdbar .pill,.lab-topbar .pill{max-width:120px !important;min-width:0 !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important}.lab-vocab-section{padding-left:58px !important;padding-right:14px !important}.lab-vocab-grid{grid-template-columns:1fr;gap:10px}.lab-vocab-panel{padding:14px 14px !important;margin-left:0;margin-right:0}}'+
      '.lab-vocab-section .vocab-card{position:relative;background:var(--surface, var(--card, #fff));border:1.5px solid var(--line, color-mix(in srgb, var(--accent, #7c3aed) 25%, transparent));border-radius:10px;'+
        /* верхний/нижний padding больше — текст не заезжает под кнопки в углах (⭐ слева, 🔊+➕ справа) */
        'padding:44px 16px 16px;cursor:pointer;transition:transform .15s,box-shadow .15s;perspective:600px;min-height:112px;overflow:visible;box-sizing:border-box;width:100%;max-width:280px}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card{background:var(--surface, var(--card, #15102a));border-color:var(--line, #5b3aa8)}'+
      '.lab-vocab-section .vocab-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.14)}'+
      '.lab-vocab-section .vocab-card .face{display:block}'+
      '.lab-vocab-section .vocab-card.flipped .front{display:none}'+
      '.lab-vocab-section .vocab-card:not(.flipped) .back{display:none}'+
      '.lab-vocab-section .vocab-card .word{font:800 1.05rem/1.2 "Manrope",sans-serif;color:var(--text, #1a1f2e);margin-bottom:4px}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card .word{color:var(--text, #f3eee5)}'+
      '.lab-vocab-section .vocab-card .ipa{font:500 .88rem/1.4 "JetBrains Mono",monospace;color:var(--accent, #7c3aed);margin-bottom:6px}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card .ipa{color:var(--accent, #c5a3ff)}'+
      '.lab-vocab-section .vocab-card .ru{font:700 .94rem/1.4 "Manrope",sans-serif;color:var(--accent, #4a2d8a);margin-bottom:4px}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card .ru{color:var(--accent, #e9d6ff)}'+
      '.lab-vocab-section .vocab-card .ex{font:500 .82rem/1.5 "Manrope",sans-serif;color:var(--muted, #64748b);font-style:italic}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card .ex{color:var(--muted, #9aa0ab)}'+
      '.lab-vocab-section .vocab-card .speak{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;'+
        'border:0;background:var(--accent, #7c3aed);color:#fff;cursor:pointer;font-size:14px;'+
        'box-shadow:0 2px 6px rgba(124,58,237,.32);display:flex;align-items:center;justify-content:center}'+
      '.lab-vocab-section .vocab-card .speak:hover{filter:brightness(1.08);transform:scale(1.08)}'+
      '.lab-vocab-section .vocab-card .extra-mark{position:absolute;top:8px;left:8px;width:22px;height:22px;'+
        'border-radius:50%;background:#fef3c7;color:#f59e0b;font:800 12px/1 system-ui;padding:0;letter-spacing:0;'+
        'display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(245,158,11,.25)}'+
      '[data-lab-theme="dark"] .lab-vocab-section .vocab-card .extra-mark{background:#451a03;color:#fbbf24}'+
      /* Кнопка удалить — только для учителя */
      '.lab-vocab-section .vocab-card .vc-del{position:absolute;top:-6px;left:-6px;width:24px;height:24px;border-radius:50%;'+
        'background:#ef4444;color:#fff;border:0;cursor:pointer;'+
        'display:none;align-items:center;justify-content:center;font:800 14px/1 system-ui;'+
        'box-shadow:0 2px 6px rgba(239,68,68,.45);z-index:6}'+
      '.lab-vocab-section .vocab-card .vc-del:hover{background:#dc2626;transform:scale(1.12)}'+
      'body.lab-teacher-on .lab-vocab-section .vocab-card .vc-del{display:flex}'+

      '.lab-vocab-add-btn{padding:9px 16px;border-radius:10px;border:1.5px dashed #7c3aed;'+
        'background:transparent;color:#7c3aed;cursor:pointer;'+
        'font:700 .82rem/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}'+
      '.lab-vocab-add-btn:hover{background:#7c3aed;color:#fff;border-style:solid}'+
      '[data-lab-theme="dark"] .lab-vocab-add-btn{color:#c5a3ff;border-color:#7c5ad6}'+

      '.vocab-hl{cursor:help;border-bottom:1.5px dotted #7c3aed;color:inherit;text-decoration:none;'+
        'background:rgba(124,58,237,.08);padding:1px 3px;border-radius:3px;transition:background .15s}'+
      '.vocab-hl:hover{background:rgba(124,58,237,.20)}'+
      '[data-lab-theme="dark"] .vocab-hl{border-color:#c5a3ff;background:rgba(197,163,255,.12)}'+

      '.vocab-tip{position:fixed;z-index:99997;max-width:260px;background:#1a1a2e;color:#fff;'+
        'border-radius:10px;padding:10px 14px;font:600 .85rem/1.45 "Manrope",sans-serif;'+
        'box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:auto;opacity:0;transition:opacity .15s}'+
      '.vocab-tip.show{opacity:1}'+
      '.vocab-tip .word{font:800 .98rem/1.2 "Manrope",sans-serif;color:#fbbf24;margin-bottom:3px}'+
      '.vocab-tip .ipa{font:500 .82rem/1.3 "JetBrains Mono",monospace;color:#c5a3ff;margin-bottom:6px}'+
      '.vocab-tip .ru{font:700 .9rem/1.3 "Manrope",sans-serif;color:#fff;margin-bottom:4px}'+
      '.vocab-tip .ex{font:500 .8rem/1.4 "Manrope",sans-serif;color:#9aa0ab;font-style:italic;margin-bottom:6px}'+
      '.vocab-tip .speak{background:#7c3aed;color:#fff;border:0;padding:5px 12px;border-radius:50px;cursor:pointer;'+
        'font:700 .76rem/1 "JetBrains Mono",monospace;letter-spacing:.1em}'+

      '.teacher-add-float{position:fixed;z-index:99996;padding:10px 16px;border-radius:50px;'+
        'background:linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%);color:#1a1a2e;'+
        'border:0;cursor:pointer;font:800 .82rem/1 "Manrope",sans-serif;'+
        'box-shadow:0 8px 22px rgba(245,158,11,.42);transform:scale(.85);opacity:0;'+
        'transition:transform .15s,opacity .15s}'+
      '.teacher-add-float.show{transform:scale(1);opacity:1}'+

      '.vocab-add-overlay{position:fixed;inset:0;background:rgba(20,15,40,.55);'+
        'backdrop-filter:blur(8px);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px}'+
      '.vocab-add-overlay.show{display:flex;animation:vbFade .25s ease-out}'+
      '@keyframes vbFade{from{opacity:0}to{opacity:1}}'+
      '.vocab-add-modal{background:#fff;border-radius:16px;padding:24px 28px;max-width:440px;width:100%;'+
        'box-shadow:0 24px 60px rgba(0,0,0,.32);font-family:"Manrope",sans-serif;color:#1a1f2e}'+
      '[data-lab-theme="dark"] .vocab-add-modal{background:#1b1626;color:#f3eee5}'+
      '.vocab-add-modal h3{margin:0 0 6px;font:800 1.2rem/1.2 "Manrope",sans-serif;color:#7c3aed}'+
      '.vocab-add-modal p{margin:0 0 14px;font:500 .85rem/1.5 "Manrope",sans-serif;color:#64748b}'+
      '.vocab-add-modal label{display:block;font:800 .72rem/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;margin:10px 0 6px}'+
      '.vocab-add-modal input,.vocab-add-modal textarea{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;'+
        'border:1.5px solid #d4c0f7;background:#fff;font:600 .92rem/1.4 "Manrope",sans-serif;color:#1a1f2e;outline:none}'+
      '[data-lab-theme="dark"] .vocab-add-modal input,[data-lab-theme="dark"] .vocab-add-modal textarea{background:#15102a;border-color:#5b3aa8;color:#f3eee5}'+
      '.vocab-add-modal input:focus,.vocab-add-modal textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.12)}'+
      '.vocab-add-modal textarea{resize:vertical;min-height:60px;font-family:"Manrope",sans-serif}'+
      '.vocab-add-actions{display:flex;gap:10px;margin-top:18px;justify-content:flex-end}'+
      '.vocab-add-actions button{padding:10px 16px;border-radius:9px;border:0;cursor:pointer;'+
        'font:700 .82rem/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}'+
      '.vocab-add-actions .cancel{background:transparent;color:#7c3aed;border:1.5px solid #d4c0f7}'+
      '.vocab-add-actions .ok{background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#fff}';
    document.head.appendChild(s);
  }

  function ttsSay(text){
    try {
      if (!('speechSynthesis' in window)) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch(e){}
  }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function extraKey(){ return 'lab-vocab-extra:' + location.pathname; }
  function loadExtras(){
    try { return JSON.parse(localStorage.getItem(extraKey()) || '[]'); }
    catch(e){ return []; }
  }
  function saveExtras(arr){
    try { localStorage.setItem(extraKey(), JSON.stringify(arr)); } catch(e){}
    // Облачный snapshot — только в teacher mode, чтобы Клод мог
    // подтянуть текущий teacher-vocab из Supabase, не дергая Машу за скрины.
    if (typeof teacherMode !== 'undefined' && teacherMode) {
      try { cloudSyncExtras(arr); } catch(e){}
    }
  }

  // Снапшот teacher-vocab в Supabase lab_submissions с section_id='teacher-vocab-snapshot'.
  // Последний snapshot по lesson_path = актуальный teacher-vocab урока.
  // Тротлится 1 запрос/3 сек, чтобы быстрая серия add'ов не штамповала кучу записей.
  var __vbCloudTimer = null;
  var __vbCloudPending = null;
  function cloudSyncExtras(arr){
    __vbCloudPending = arr;
    if (__vbCloudTimer) return;
    __vbCloudTimer = setTimeout(function(){
      var payload = __vbCloudPending; __vbCloudPending = null; __vbCloudTimer = null;
      var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
      var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";
      var body = {
        room_id: 'teacher-vocab',
        lesson_path: location.pathname,
        section_id: 'teacher-vocab-snapshot',
        section_title: '⭐ teacher vocab snapshot',
        student_role: 'teacher',
        score: 0,
        total: (payload || []).length,
        misses: payload || []
      };
      fetch(SUPABASE_URL + '/rest/v1/lab_submissions', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body),
        mode: 'cors'
      }).catch(function(){});
    }, 3000);
  }

  function harvestStaticCards(){
    // Если в уроке уже есть статичные .vocab-card (как у Тимофея, A1 и др.) —
    // вытаскиваем word + meaning + example, чтобы подсветка в тексте работала
    // без дублирования секции.
    var out = [];
    document.querySelectorAll('.vocab-card').forEach(function(card){
      var word = card.dataset.word ||
                 (card.querySelector('.word, .vocab-front .word')?.textContent || '').trim();
      if (!word) return;
      var meaning = (card.querySelector('.meaning, .vocab-back .meaning, .vocab-back .ru')?.textContent || '').trim();
      var example = (card.querySelector('.ex, .vocab-back .ex, .vocab-back .example')?.textContent || '').trim();
      var ipa = (card.querySelector('.ipa')?.textContent || '').trim();
      out.push({ word: word, ipa: ipa, ru: meaning, example: example, __static: true });
    });
    return out;
  }

  function getVocab(){
    var fromPage = Array.isArray(window.LAB_VOCAB) ? window.LAB_VOCAB.slice() : [];
    var fromStatic = harvestStaticCards();
    var extras = loadExtras();
    extras.forEach(function(e){ e.__extra = true; });
    // dedupe по lowercased word
    var seen = {};
    return fromPage.concat(fromStatic).concat(extras).filter(function(v){
      var k = (v.word || '').toLowerCase();
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function buildCard(item){
    var card = document.createElement('div');
    card.className = 'vocab-card';
    card.dataset.word = item.word || '';
    card.innerHTML =
      '<button class="vc-del" type="button" title="Удалить слово">×</button>' +
      (item.__extra ? '<div class="extra-mark" title="Слово добавлено учителем">⭐</div>' : '') +
      '<button class="speak" type="button" title="Прослушать">🔊</button>' +
      '<div class="face front">'+
        '<div class="word">'+esc(item.word)+'</div>'+
        (item.ipa ? '<div class="ipa">'+esc(item.ipa)+'</div>' : '') +
      '</div>' +
      '<div class="face back">'+
        '<div class="ru">'+esc(item.ru || '')+'</div>' +
        (item.example ? '<div class="ex">'+esc(item.example)+'</div>' : '') +
      '</div>';
    card.addEventListener('click', function(e){
      if (e.target.closest('.speak') || e.target.closest('.vc-del')) return;
      card.classList.toggle('flipped');
    });
    card.querySelector('.speak').addEventListener('click', function(e){
      e.stopPropagation();
      if (item.audio) {
        try { new Audio(item.audio).play(); return; } catch(_){}
      }
      ttsSay(item.word);
    });
    card.querySelector('.vc-del').addEventListener('click', function(e){
      e.stopPropagation();
      removeWord(item.word);
    });
    return card;
  }

  function removeWord(word){
    if (!word) return;
    var fresh = loadExtras().filter(function(x){ return (x.word||'').toLowerCase() !== word.toLowerCase(); });
    saveExtras(fresh);
    // Re-render
    var section = document.getElementById('auto-vocab');
    if (section) section.remove();
    renderVocab();
    document.querySelectorAll('p, li').forEach(function(el){ el.__vbHighlighted = false; });
    highlightInText();
    // Broadcast remove ученику
    try {
      var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
      var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";
      if (!window.supabase) return;
      var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      var ch = c.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
      ch.subscribe(function(s){
        if (s === 'SUBSCRIBED') {
          ch.send({ type:'broadcast', event:'vocab-remove', payload: {
            word: word, lesson_path: location.pathname, ts: Date.now()
          }});
          setTimeout(function(){ ch.unsubscribe(); }, 600);
        }
      });
    } catch(e){}
  }

  function findOrBuildSection(){
    // Если в уроке уже есть статичный vocab section — используем его
    if (document.getElementById('auto-vocab')) return document.getElementById('auto-vocab');
    var existing = document.querySelector(
      'section.vocabulary, .vocab-section, section[id*="vocab"], '+
      '[id*="vocab"], .vocab-grid, .vocab-list, .vocabulary-block, '+
      '.vocab-cards, .vocab-table, [class*="vocab-grid"]'
    );
    // Также если на странице уже есть хоть одна .vocab-card — Vocabulary считается родной
    if (!existing && document.querySelector('.vocab-card')) existing = document.querySelector('.vocab-card').closest('section, .container, .card, div');
    // v47 (2026-07-07): если existing нашли — привешиваем «+ добавить своё слово»
    // кнопку внутрь, вместо того чтобы уйти. Так учитель + ученик могут добавлять
    // слова к статичному vocab-контейнеру. Инцидент 2026-07-07: у 36 уроков не было
    // никакого способа добавить слово, потому что existing блокировал auto-vocab.
    if (existing && !observeMode) {
      if (!existing.querySelector('#vocabAddBtn')) {
        var addWrap = document.createElement('div');
        addWrap.style.cssText = 'margin:18px 0 8px;text-align:center';
        addWrap.innerHTML = '<button class="lab-vocab-add-btn" id="vocabAddBtn">+ добавить своё слово</button>';
        existing.appendChild(addWrap);
      }
    }
    if (existing && !loadExtras().length && !Array.isArray(window.LAB_VOCAB)) return existing;
    var sec = document.createElement('section');
    sec.className = 'section lab-vocab-section';
    sec.id = 'auto-vocab';
    sec.innerHTML =
      '<div class="lab-vocab-panel">'+
        '<div class="lab-vocab-h">'+
          '<h2>📖 Vocabulary</h2>'+
          '<div class="meta"><span id="vocabCount">0</span> слов · кликни карточку, чтобы перевернуть</div>'+
        '</div>'+
        '<div class="lab-vocab-grid" id="vocabGrid"></div>'+
        (observeMode ? '' : '<div style="margin-top:18px"><button class="lab-vocab-add-btn" id="vocabAddBtn">+ добавить своё слово</button></div>')+
      '</div>';
    // Vocabulary в общий контейнер первой .section, без clone-стилей (раньше съезжало влево).
    var firstSection = document.querySelector('section.section');
    if (firstSection && firstSection.parentNode) {
      firstSection.parentNode.insertBefore(sec, firstSection);
      return sec;
    }
    var main = document.querySelector('main, .container, .wrap, .lesson, .lesson-container');
    if (main) {
      main.insertBefore(sec, main.firstChild);
      return sec;
    }
    document.body.insertBefore(sec, document.body.firstChild);
    return sec;
  }

  function renderVocab(){
    var vocab = getVocab();
    if (!vocab.length) return;
    var extras = loadExtras();

    // v52 2026-07-08: если у урока есть статичный vocab-grid с .vocab-card —
    // extras должны попадать ТУДА (наверху страницы, где Мария и ждёт).
    // Иначе — падало вниз как отдельный `#auto-vocab` и словарь «пропадал».
    if (extras.length && !document.getElementById('auto-vocab')) {
      var staticGrid = null;
      var firstCard = document.querySelector('.vocab-card');
      if (firstCard) {
        staticGrid = firstCard.parentElement;
      }
      if (staticGrid) {
        // Кладём extras как новые .vocab-card в статичный grid, если их там ещё нет
        extras.forEach(function(it){
          it.__extra = true;
          var existsCard = staticGrid.querySelector('.vocab-card[data-word="' + (it.word||'').replace(/"/g,'\\"') + '"]');
          if (existsCard && existsCard.dataset.extra === '1') return;
          if (existsCard && existsCard.dataset.extra !== '1') return; // dup из статики
          var card = buildCard(it);
          card.dataset.extra = '1';
          staticGrid.appendChild(card);
        });
        // добавляем «+ добавить своё слово» кнопку возле статичного grid если её ещё нет
        if (!observeMode) {
          var parent = staticGrid.closest('section, .container, .card, div') || staticGrid.parentNode;
          if (parent && !parent.querySelector('#vocabAddBtn')) {
            var addWrap = document.createElement('div');
            addWrap.style.cssText = 'margin:18px auto 0;text-align:center;grid-column:1/-1';
            addWrap.innerHTML = '<button class="lab-vocab-add-btn" id="vocabAddBtn">+ добавить своё слово</button>';
            staticGrid.appendChild(addWrap);
            addWrap.querySelector('#vocabAddBtn').addEventListener('click', function(){ openAddModal(); });
          }
        }
        return;
      }
    }

    var section = findOrBuildSection();
    if (!section) return; // статичная — модуль её не трогает
    var grid = section.querySelector('#vocabGrid');
    var counter = section.querySelector('#vocabCount');
    if (!grid) return; // static vocab section без нашего grid — не трогаем; иначе crash 'innerHTML' of null (oge-mock-mix-01, dana-russia-history-exam).
    grid.innerHTML = '';
    vocab.forEach(function(it){ grid.appendChild(buildCard(it)); });
    if (counter) counter.textContent = vocab.length;
    if (!observeMode) {
      var addBtn = section.querySelector('#vocabAddBtn');
      if (addBtn) addBtn.addEventListener('click', function(){ openAddModal(); });
    }
  }

  function highlightInText(){
    var vocab = getVocab();
    if (!vocab.length) return;
    var hosts = document.querySelectorAll('.card p, .card li, .reading p, .story p, .passage p, .lp-bridge p, p.lead');
    var map = {};
    vocab.forEach(function(v){ if (v.word) map[v.word.toLowerCase()] = v; });
    var words = Object.keys(map).sort(function(a,b){ return b.length - a.length; });
    if (!words.length) return;
    var re = new RegExp('\\b(' + words.map(function(w){ return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b', 'gi');
    hosts.forEach(function(host){
      if (host.__vbHighlighted) return;
      host.__vbHighlighted = true;
      walkAndReplace(host, re, map);
    });
  }
  function walkAndReplace(node, re, map){
    if (node.nodeType === 3) {
      var txt = node.nodeValue;
      if (!re.test(txt)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0, m;
      while ((m = re.exec(txt)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        var item = map[m[0].toLowerCase()];
        var span = document.createElement('span');
        span.className = 'vocab-hl';
        span.dataset.word = item.word;
        span.textContent = m[0];
        attachTooltip(span, item);
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag, node);
      return;
    }
    if (node.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|SPAN)$/.test(node.tagName)) return;
    if (node.classList && node.classList.contains('vocab-hl')) return;
    Array.from(node.childNodes).forEach(function(c){ walkAndReplace(c, re, map); });
  }

  var tipEl = null;
  function tip(){
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'vocab-tip';
    document.body.appendChild(tipEl);
    return tipEl;
  }
  function showTip(span, item){
    var t = tip();
    t.innerHTML =
      '<div class="word">'+esc(item.word)+'</div>'+
      (item.ipa ? '<div class="ipa">'+esc(item.ipa)+'</div>' : '') +
      '<div class="ru">'+esc(item.ru||'')+'</div>'+
      (item.example ? '<div class="ex">'+esc(item.example)+'</div>' : '') +
      '<button class="speak" type="button">🔊 listen</button>';
    var r = span.getBoundingClientRect();
    t.style.left = Math.min(window.innerWidth - 280, r.left) + 'px';
    t.style.top  = (r.bottom + 6) + 'px';
    t.classList.add('show');
    t.querySelector('.speak').onclick = function(){
      if (item.audio) { try { new Audio(item.audio).play(); return; } catch(_){} }
      ttsSay(item.word);
    };
  }
  function hideTip(){
    if (tipEl) tipEl.classList.remove('show');
  }
  function attachTooltip(span, item){
    span.addEventListener('mouseenter', function(){ showTip(span, item); });
    span.addEventListener('mouseleave', function(){ setTimeout(function(){
      if (tipEl && !tipEl.matches(':hover')) hideTip();
    }, 200); });
  }

  // ==== TEACHER MODE — добавление слов через selection ====
  var floatBtn = null;
  function ensureFloat(){
    if (floatBtn) return floatBtn;
    floatBtn = document.createElement('button');
    floatBtn.className = 'teacher-add-float';
    floatBtn.textContent = '+ в словарь';
    document.body.appendChild(floatBtn);
    return floatBtn;
  }
  function hookSelection(){
    if (observeMode) return;
    ensureFloat();
    document.addEventListener('mouseup', function(){
      setTimeout(function(){
        var sel = window.getSelection();
        var text = (sel ? sel.toString() : '').trim();
        if (!text || text.length < 2 || text.length > 40 || /\s{2,}/.test(text)) {
          floatBtn.classList.remove('show');
          return;
        }
        var range = sel.getRangeAt(0);
        var r = range.getBoundingClientRect();
        floatBtn.style.left = Math.min(window.innerWidth - 160, r.right + 8) + 'px';
        floatBtn.style.top  = (r.top + window.scrollY - 8) + 'px';
        floatBtn.style.position = 'absolute';
        floatBtn.classList.add('show');
        floatBtn.onclick = function(){
          openAddModal({ word: text });
          floatBtn.classList.remove('show');
        };
      }, 80);
    });
  }

  function openAddModal(prefill){
    var overlay = document.querySelector('.vocab-add-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'vocab-add-overlay';
      overlay.innerHTML =
        '<div class="vocab-add-modal">'+
          '<h3>Новое слово в словарь</h3>'+
          '<p>Это слово сохранится для этого устройства и появится в Vocabulary секции этого урока (помечено ⭐ teacher).</p>'+
          '<label>Слово (EN)</label><input type="text" id="vbWord" maxlength="40">'+
          '<label>Транскрипция (IPA)</label><input type="text" id="vbIpa" placeholder="/ˈmɔːr.fiːm/">'+
          '<label>Перевод (RU)</label><input type="text" id="vbRu">'+
          '<label>Пример (необязательно)</label><textarea id="vbEx"></textarea>'+
          '<div class="vocab-add-actions">'+
            '<button class="cancel" type="button">Отмена</button>'+
            '<button class="ok" type="button">Добавить</button>'+
          '</div>'+
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.classList.remove('show'); });
      overlay.querySelector('.cancel').addEventListener('click', function(){ overlay.classList.remove('show'); });
      overlay.querySelector('.ok').addEventListener('click', function(){
        var word = (overlay.querySelector('#vbWord').value || '').trim();
        if (word.length < 2) { alert('Введи слово'); return; }
        var item = {
          word: word,
          ipa: (overlay.querySelector('#vbIpa').value || '').trim(),
          ru:  (overlay.querySelector('#vbRu').value  || '').trim(),
          example: (overlay.querySelector('#vbEx').value || '').trim()
        };
        var extras = loadExtras();
        // v49 2026-07-12: case-insensitive dedupe. Раньше overlay «+ добавить своё
        // слово» просто push'ил без проверки → повторный add того же слова
        // дублировал запись. addPushedWord (live push от учителя) уже был с
        // проверкой, а manual overlay — нет.
        var lc = word.toLowerCase();
        if (extras.some(function(x){ return (x.word || '').toLowerCase() === lc; })) {
          alert('Такое слово уже есть в словаре — «' + word + '»');
          return;
        }
        extras.push(item);
        saveExtras(extras);
        overlay.classList.remove('show');
        // Re-render
        var existing = document.getElementById('auto-vocab');
        if (existing) existing.remove();
        renderVocab();
        document.querySelectorAll('p, li').forEach(function(el){ el.__vbHighlighted = false; });
        highlightInText();
      });
    }
    overlay.querySelector('#vbWord').value = (prefill && prefill.word) || '';
    overlay.querySelector('#vbIpa').value = '';
    overlay.querySelector('#vbRu').value = '';
    overlay.querySelector('#vbEx').value = '';
    overlay.classList.add('show');
    setTimeout(function(){
      var f = overlay.querySelector(prefill && prefill.word ? '#vbIpa' : '#vbWord');
      if (f) f.focus();
    }, 50);
  }

  // ---- LIVE PUSH (v3): учитель шлёт слово через firehose,
  //      ученик ловит → авто-обогащает Pollinations'ом → добавляет к vocab.
  function getStudentRoom(){
    try {
      var name = localStorage.getItem('lab-student-name');
      if (name) {
        return 'student-' + (name||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
      }
      var solo = localStorage.getItem('lab-solo-id');
      if (solo) return solo;
    } catch(e){}
    return '';
  }

  async function enrichWord(word){
    try {
      var resp = await fetch('https://text.pollinations.ai/openai', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'openai', private:true, seed: Math.floor(Math.random()*1e6),
          messages: [
            { role:'system', content: 'Ты лингвист. Дай для слова: IPA (British), краткий русский перевод (1-3 слова), короткий пример в одном предложении. Ответ СТРОГО в формате JSON без markdown: {"ipa":"/.../","ru":"...","example":"..."}' },
            { role:'user', content: 'Слово: ' + word }
          ]
        })
      });
      if (!resp.ok) return {};
      var data = await resp.json().catch(function(){ return {}; });
      var text = data?.choices?.[0]?.message?.content || '';
      var m = text.match(/\{[\s\S]*\}/);
      if (m) try { return JSON.parse(m[0]); } catch(e){}
    } catch(e){}
    return {};
  }

  async function addPushedWord(word){
    if (!word) return;
    word = String(word).trim();
    if (!word) return;
    var extras = loadExtras();
    if (extras.some(function(x){ return (x.word||'').toLowerCase() === word.toLowerCase(); })) return;
    var item = { word: word, ipa: '', ru: '', example: '' };
    extras.push(item);
    saveExtras(extras);
    // Re-render immediately
    var existing = document.getElementById('auto-vocab');
    if (existing) existing.remove();
    renderVocab();
    document.querySelectorAll('p, li').forEach(function(el){ el.__vbHighlighted = false; });
    highlightInText();

    // Тёплый flash + toast
    showWordToast('✨ Учитель добавил слово: ' + word);

    // Enrich in background — IPA + RU + example
    var enrichment = await enrichWord(word);
    if (enrichment && (enrichment.ipa || enrichment.ru)) {
      var fresh = loadExtras();
      var idx = fresh.findIndex(function(x){ return (x.word||'').toLowerCase() === word.toLowerCase(); });
      if (idx >= 0) {
        fresh[idx].ipa = enrichment.ipa || '';
        fresh[idx].ru = enrichment.ru || '';
        fresh[idx].example = enrichment.example || '';
        saveExtras(fresh);
        var section = document.getElementById('auto-vocab');
        if (section) section.remove();
        renderVocab();
        document.querySelectorAll('p, li').forEach(function(el){ el.__vbHighlighted = false; });
        highlightInText();
      }
    }
  }

  function showWordToast(msg){
    var t = document.querySelector('.vocab-push-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'vocab-push-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);'+
        'background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:12px 22px;border-radius:50px;'+
        'font:800 .92rem/1.4 "Manrope",sans-serif;z-index:99999;box-shadow:0 8px 30px rgba(124,58,237,.45);'+
        'opacity:0;transition:opacity .25s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function(){ t.style.opacity = '1'; });
    clearTimeout(t.__tt);
    t.__tt = setTimeout(function(){ t.style.opacity = '0'; }, 3200);
  }

  function hookFirehosePush(){
    if (observeMode) return;
    var myRoom = getStudentRoom();
    var myLesson = location.pathname;
    var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
    var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";
    function bind(){
      if (!window.supabase) return setTimeout(bind, 400);
      try {
        var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        var ch = c.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
        ch.on('broadcast', { event:'vocab-push' }, function(p){
          var data = p.payload || {};
          if (!data.word) return;
          var byRoom = myRoom && data.room_id && data.room_id === myRoom;
          var byLesson = data.lesson_path && data.lesson_path === myLesson;
          if (!byRoom && !byLesson) return;
          addPushedWord(data.word);
        });
        ch.on('broadcast', { event:'vocab-remove' }, function(p){
          var data = p.payload || {};
          if (!data.word) return;
          if (data.lesson_path && data.lesson_path !== myLesson) return;
          var fresh = loadExtras().filter(function(x){ return (x.word||'').toLowerCase() !== String(data.word).toLowerCase(); });
          saveExtras(fresh);
          var section = document.getElementById('auto-vocab');
          if (section) section.remove();
          renderVocab();
          document.querySelectorAll('p, li').forEach(function(el){ el.__vbHighlighted = false; });
          highlightInText();
        });
        ch.subscribe();
      } catch(e){}
    }
    bind();
  }

  // UNIVERSAL click-to-vocab: любой пользователь (ученик/учитель/observer)
  // кликом по слову в тексте добавляет его в блок словаря. В observer mode
  // также транслируется в firehose. Без модалок.
  //
  // Guards — click ИГНОРИРУЕТСЯ если попал в:
  //   * homework/domashka область (.homework, .lab-hw-*, .item.raw…);
  //   * интерактив упражнений (mc-opt, tf-btn, choice, bank-word, word-chip,
  //     drag-item, drop-*, match-*, wo-pill, ord-*);
  //   * сам блок словаря (.lab-vocab-section, .vc-*);
  //   * TTS/play/mic кнопки и любые button/a/input/textarea/select.
  function hookUniversalClickToVocab(){
    var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
    var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";
    var firehose = null;
    if (observeMode) {
      (function bind(){
        if (!window.supabase) return setTimeout(bind, 300);
        try {
          var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
          firehose = c.channel('lab-firehose-v1', { config:{ broadcast:{ self:false }}});
          firehose.subscribe();
        } catch(e){}
      })();
    }

    // Курсор-индикатор: текст в реадинг-контейнерах намекает что кликабельно.
    var cs = document.createElement('style');
    cs.textContent = '.card p, .card li, .reading p, .story p, .passage p, p.lead, .card .stmt, .card .question, .card .q-text {cursor:crosshair}'+
      '.lab-click-flash{background:#fbbf24 !important;color:#1a1a2e !important;'+
      'border-radius:4px;padding:1px 5px;transition:background .15s,color .15s;'+
      'box-shadow:0 0 0 3px rgba(251,191,36,.45)}';
    document.head.appendChild(cs);

    var TEXT_HOSTS = '.card, .reading, .story, .passage, .lab-bridge';
    var IGNORE_HOSTS = '.homework, .lab-hw-overlay, .lab-hw-modal, .lab-vocab-section, .vocab-section, [data-lab-vocab], .lab-teacher-banner, #labSyncBanner';
    var IGNORE_MECH = '.mc-opt, .tf-btn, .btn-tf, .choice, .choice-btn, .predict-btn, .bank-word, .word-chip, .drag-item, .drop-gap, .drop-slot, .drop-zone, .cloze-gap, .match-place, .match-card, .match-drop, .match-slot, .wo-pill, .ord-card, .ord-chip, .flip-card, .vocab-card, .vc-card';
    var IGNORE_ATTRS = '[data-say], [data-w], [data-word], [data-place], [data-a], [data-v], [data-ans], [data-answer], [data-correct], [data-expected], [data-rm], [role="button"]';

    document.addEventListener('click', function(e){
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest(IGNORE_HOSTS)) return;
      if (t.closest(IGNORE_MECH)) return;
      if (t.closest(IGNORE_ATTRS)) return;
      var tag = t.tagName;
      if (/^(BUTTON|A|INPUT|TEXTAREA|SELECT|LABEL)$/.test(tag)) return;
      var host = t.closest(TEXT_HOSTS);
      if (!host) return;
      var word = extractWordAtClick(e);
      if (!word || word.length < 2 || word.length > 40) return;
      e.preventDefault();
      e.stopPropagation();
      if (observeMode && firehose) {
        try {
          firehose.send({ type:'broadcast', event:'vocab-push', payload: {
            room_id: (typeof observeId !== 'undefined' ? observeId : null),
            lesson_path: location.pathname,
            word: word, ts: Date.now()
          }});
        } catch(e2){}
      }
      window.dispatchEvent(new CustomEvent('lab-local-vocab-push', { detail: { word: word }}));
      flashWord(t, word);
    }, true);
  }

  function extractWordAtClick(e){
    // Сначала пробуем выделение
    var sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      var t = sel.toString().trim();
      if (t.length >= 2 && t.length <= 40) return t.replace(/[^a-zA-Zа-яА-ЯёЁ\-\s]/g,'').trim();
    }
    // Caret position на месте клика
    var range;
    if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.setEnd(pos.offsetNode, pos.offset); }
    } else if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    }
    if (!range || range.startContainer.nodeType !== 3) return null;
    var text = range.startContainer.nodeValue;
    var i = range.startOffset;
    // Расширяем границы до пробелов/пунктуации
    var re = /[a-zA-Z\-]/;
    var start = i;
    while (start > 0 && re.test(text[start-1])) start--;
    var end = i;
    while (end < text.length && re.test(text[end])) end++;
    var word = text.slice(start, end).trim();
    if (word.length < 2) return null;
    return word;
  }

  function flashWord(target, word){
    // Найти конкретный текстовый узел и обернуть его временным span
    try {
      var text = target.textContent || '';
      var idx = text.toLowerCase().indexOf(word.toLowerCase());
      if (idx < 0) return;
      // Простой mark: добавить class 'lab-click-flash' на element полностью на 800мс
      target.classList.add('lab-click-flash');
      setTimeout(function(){ target.classList.remove('lab-click-flash'); }, 800);
    } catch(e){}
  }

  function init(){
    injectStyle();
    renderVocab();
    highlightInText();
    if (!observeMode) hookSelection();
    if (!observeMode) hookFirehosePush();
    hookUniversalClickToVocab();
    // Локальное мгновенное обновление словаря в iframe Маши
    // когда она набирает word в observer banner + Enter
    // или кликает на слово в observer тексте.
    window.addEventListener('lab-local-vocab-push', function(e){
      var w = e.detail && e.detail.word;
      if (w) addPushedWord(w);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
