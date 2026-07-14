/* lab-sync.js v17 — NAIL-DOWN teacher-banner + realtime sync + persist + firehose.
   v17 (2026-07-12): teacherMode DEFAULT = true. Yellow banner всегда сверху,
   пока URL явно НЕ содержит один из выключателей:
     ?role=student      — cabinet передаёт студенту
     ?observe=<id>      — пассивное зеркало
     ?teacher=off       — ручной выкл Марии
   Раньше teacher-mode требовал opt-in (?teacher=on или sticky localStorage);
   Мария каждую вторую сессию оставалась без банера, потому что Codex/новый
   Chrome чистили localStorage. Теперь банер прибит намертво: любой её URL
   → yellow bar сверху. Ученики через cabinet URL получают ?role=student → OK.
   v10 → v17: пропущены версии, чтобы cache-buster сбросил Fastly.

   Остальная логика (без изменений):
   • С URL ?sync=<roomId>&role=teacher|student — двусторонняя live-комната.
   • Без ?sync — solo-mode: каждый submit идёт в Supabase lab_submissions.
   • Имя ученика → 'student-<slug>' room_id (модалка на первый submit).
   • ВСЕГДА broadcast в общий канал 'lab-firehose-v1' (teacher-live видит).
   • URL ?observe=<student-id> — пассивный режим зеркала. Iframe подписан
     на firehose, фильтрует dom-state events от этого ученика, применяет
     их к своему DOM. Маша видит как ученик заполняет форму в реальном
     времени без всякого ?sync= setup. */
(function(){
  if (window.__labSyncLoaded) return;
  window.__labSyncLoaded = true;

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  function qs(name){
    var m = location.search.match(new RegExp('[?&]'+name+'=([^&]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  var syncParam   = qs('sync');
  var observeId   = qs('observe');  // v6: пассивное зеркало
  var observeMode = !!observeId;

  // v17 (2026-07-12): Учительский режим ПРИБИТ. Default = true.
  // Выключить можно ТОЛЬКО одним из: ?role=student | ?observe=<id> | ?teacher=off
  var teacherParam = qs('teacher');
  var roleParam    = qs('role');
  try {
    if (teacherParam === 'on' || teacherParam === '1') localStorage.setItem('lab-teacher-mode', 'on');
    if (teacherParam === 'off') localStorage.removeItem('lab-teacher-mode');
  } catch(e){}
  // Explicit student cabinet / observer / manual off — ONLY exits from teacher mode.
  var explicitOff = (roleParam === 'student') || observeMode || (teacherParam === 'off');
  var teacherMode = !explicitOff;   // v17: default TRUE
  if (roleParam === 'teacher') teacherMode = true;
  // Sticky localStorage — сохраняем on, чтобы будущие v17-off URL не проскакивали
  if (teacherMode) { try { localStorage.setItem('lab-teacher-mode', 'on'); } catch(e){} }
  if (teacherMode) {
    var markTeacherBody = function(){
      if (document.body) document.body.classList.add('lab-teacher-on');
    };
    markTeacherBody();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markTeacherBody);
  }

  var soloMode    = !syncParam && !observeMode && !teacherMode;
  var role        = roleParam ||
    (observeMode ? 'observer' : (teacherMode ? 'teacher' : (soloMode ? 'solo' : 'student')));
  var roomId;
  if (soloMode) {
    // Если имя уже сохранено — используем сразу 'student-<slug>'.
    // Иначе временный solo-* до первого submit, на котором спросим имя.
    var savedName = '';
    try { savedName = localStorage.getItem('lab-student-name') || ''; } catch(e){}
    if (savedName) {
      roomId = 'student-' + slugify(savedName);
      role = 'solo:' + savedName;
    } else {
      try {
        var stored = localStorage.getItem('lab-solo-id');
        if (!stored) {
          stored = 'solo-' + Math.random().toString(36).slice(2,10);
          localStorage.setItem('lab-solo-id', stored);
        }
        roomId = stored;
      } catch(e) {
        roomId = 'solo-' + Date.now().toString(36);
      }
    }
  } else {
    roomId = syncParam;
  }

  function loadSDK(){
    /* v18 2026-07-12 · fallback chain: локальный vendor → jsdelivr → unpkg.
       Раньше был только jsdelivr — если CDN режется у ученика/учителя, весь
       live-режим (lesson-open · dom-state · section-submit · vocab-push)
       умирал молча. Теперь всегда есть 3 попытки. */
    var SOURCES = [
      '/lingua-boost-lab/assets/vendor/supabase.js',
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
    ];
    return new Promise(function(resolve, reject){
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var idx = 0;
      function tryNext(){
        if (idx >= SOURCES.length) return reject(new Error('Supabase SDK load failed · all CDN paths dead'));
        var s = document.createElement('script');
        s.src = SOURCES[idx++];
        s.async = true;
        s.onload = function(){
          if (window.supabase && window.supabase.createClient) resolve(window.supabase);
          else tryNext();
        };
        s.onerror = function(){ tryNext(); };
        document.head.appendChild(s);
      }
      tryNext();
    });
  }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function slugify(s){
    return (s||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
  }

  // ---- Identity (имя ученика) ----
  function getStoredName(){
    try { return localStorage.getItem('lab-student-name') || ''; } catch(e){ return ''; }
  }
  function saveName(n){
    try { localStorage.setItem('lab-student-name', n); } catch(e){}
  }

  function injectIdentityStyle(){
    if (document.getElementById('lab-identity-style')) return;
    var s = document.createElement('style');
    s.id = 'lab-identity-style';
    s.textContent = ''+
      '.lab-id-overlay{position:fixed;inset:0;background:rgba(20,15,40,.55);'+
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);'+
        'z-index:99998;display:flex;align-items:center;justify-content:center;'+
        'animation:labIdFade .25s ease-out}'+
      '@keyframes labIdFade{from{opacity:0}to{opacity:1}}'+
      '.lab-id-modal{background:linear-gradient(135deg,#fbf8ff 0%,#f0e9ff 100%);'+
        'border:1px solid #d4c0f7;border-left:5px solid #7c3aed;'+
        'border-radius:18px;padding:28px 32px;max-width:420px;width:92vw;'+
        'box-shadow:0 24px 60px rgba(124,58,237,.32);font-family:"Manrope",sans-serif}'+
      '[data-lab-theme="dark"] .lab-id-modal{background:linear-gradient(135deg,#1e1a2e 0%,#241c3e 100%);'+
        'border-color:#5b3aa8;color:#f3eee5}'+
      '.lab-id-modal h3{margin:0 0 8px;font:800 1.25rem/1.25 "Manrope",sans-serif;color:#4a2d8a}'+
      '[data-lab-theme="dark"] .lab-id-modal h3{color:#e9d6ff}'+
      '.lab-id-modal p{margin:0 0 16px;font:500 .92rem/1.55 "Manrope",sans-serif;color:#4a3a6b}'+
      '[data-lab-theme="dark"] .lab-id-modal p{color:#c5b8e6}'+
      '.lab-id-input{width:100%;box-sizing:border-box;padding:13px 16px;border-radius:10px;'+
        'border:1.5px solid #d4c0f7;background:#fff;font:600 1rem/1.3 "Manrope",sans-serif;'+
        'color:#1a1f2e;outline:none;transition:border-color .15s}'+
      '.lab-id-input:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.12)}'+
      '[data-lab-theme="dark"] .lab-id-input{background:#15102a;border-color:#5b3aa8;color:#f3eee5}'+
      '.lab-id-actions{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}'+
      '.lab-id-btn{padding:11px 18px;border-radius:10px;border:0;cursor:pointer;'+
        'font:700 .88rem/1 "Manrope",sans-serif;transition:transform .15s,box-shadow .15s}'+
      '.lab-id-skip{background:transparent;color:#7c3aed;border:1.5px solid #d4c0f7}'+
      '.lab-id-ok{background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#fff}'+
      '.lab-id-ok:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(124,58,237,.42)}'+
      '.lab-id-ok:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}';
    document.head.appendChild(s);
  }

  function askName(){
    return new Promise(function(resolve){
      injectIdentityStyle();
      var existing = getStoredName();
      if (existing) return resolve(existing);

      var overlay = document.createElement('div');
      overlay.className = 'lab-id-overlay';
      overlay.innerHTML =
        '<div class="lab-id-modal">'+
          '<h3>Как тебя зовут?</h3>'+
          '<p>Имя нужно один раз — чтобы наставник видел твои результаты по всем урокам.</p>'+
          '<input type="text" class="lab-id-input" placeholder="Например, Тимофей" maxlength="40">'+
          '<div class="lab-id-actions">'+
            '<button type="button" class="lab-id-btn lab-id-skip">Пропустить</button>'+
            '<button type="button" class="lab-id-btn lab-id-ok" disabled>Продолжить</button>'+
          '</div>'+
        '</div>';
      document.body.appendChild(overlay);
      var input = overlay.querySelector('.lab-id-input');
      var ok = overlay.querySelector('.lab-id-ok');
      var skip = overlay.querySelector('.lab-id-skip');
      setTimeout(function(){ input.focus(); }, 30);
      function finish(name){
        if (name) saveName(name);
        overlay.remove();
        resolve(name || '');
      }
      input.addEventListener('input', function(){
        ok.disabled = input.value.trim().length < 2;
      });
      input.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !ok.disabled) finish(input.value.trim());
        if (e.key === 'Escape') finish('');
      });
      ok.addEventListener('click', function(){ if (!ok.disabled) finish(input.value.trim()); });
      skip.addEventListener('click', function(){ finish(''); });
    });
  }

  function badge(text, color){
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);'+
      'z-index:9999;padding:7px 16px;border-radius:50px;font:800 11px/1 "JetBrains Mono",monospace;'+
      'letter-spacing:.14em;text-transform:uppercase;background:'+color+';color:#fff;'+
      'box-shadow:0 6px 22px rgba(0,0,0,.25);';
    document.body.appendChild(el);
    return el;
  }

  // ---- Tracking helpers (shared by sync + firehose) ----
  var TRACK_SEL = '.gap,.match-item,.match-card,.mcq-opts button,.mc-opts button,' +
    '.tfns-row button,.mc-item button,.wf-row input,.gapfill input,.bank-word,' +
    '.classify-item,.ord-pill,.predict-card,.choice-card,.vocab-card,.dict-input,' +
    '.builder button,textarea,.match-row select';
  var TRACK_CLASSES = ['right','wrong','filled','matched','correct','selected',
    'used','revealed','flipped','picked','show','shown','sel','ok','hit'];

  function pathOf(el){
    if (!el || el === document.body) return null;
    if (el.id) return '#'+el.id;
    var parts = [];
    var n = el;
    while (n && n !== document.body) {
      var p = n.parentElement;
      if (!p) return null;
      var idx = Array.prototype.indexOf.call(p.children, n);
      parts.unshift(idx);
      if (p.id) { parts.unshift('#'+p.id); return parts.join('/'); }
      if (p.tagName === 'SECTION' && p.id) { parts.unshift('#'+p.id); return parts.join('/'); }
      n = p;
    }
    return null;
  }
  function resolvePath(path){
    if (!path) return null;
    var parts = path.split('/');
    var first = parts.shift();
    var root = first[0] === '#' ? document.getElementById(first.slice(1)) : null;
    if (!root) return null;
    var n = root;
    for (var i=0; i<parts.length; i++){
      var idx = parseInt(parts[i], 10);
      if (isNaN(idx)) continue;
      n = n.children[idx];
      if (!n) return null;
    }
    return n;
  }
  function pickFlags(el){
    var keep = [];
    if (!el.classList) return keep;
    for (var i=0; i<TRACK_CLASSES.length; i++) {
      if (el.classList.contains(TRACK_CLASSES[i])) keep.push(TRACK_CLASSES[i]);
    }
    return keep;
  }
  function elContext(el){
    // Краткий человеческий контекст для firehose — что за элемент тронут.
    var sec = el.closest && el.closest('section.section');
    var secTitle = sec && (sec.querySelector('h2')?.textContent || sec.querySelector('h3')?.textContent || '');
    var kind = (el.classList && (el.classList.contains('gap') ? 'gap' :
      el.classList.contains('mcq-opts') || (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('mcq-opts')) ? 'mcq' :
      el.classList.contains('tfns-row') || (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('tfns-row')) ? 'tfns' :
      el.tagName === 'TEXTAREA' ? 'writing' :
      el.tagName === 'INPUT' ? 'input' :
      el.classList.contains('match-item') ? 'match' :
      el.classList.contains('mic-row') ? 'mic' : 'other')) || 'other';
    return {
      kind: kind,
      section_id: sec ? sec.id : '',
      section_title: (secTitle||'').replace(/\s+/g,' ').trim().slice(0,90),
      tag: el.tagName
    };
  }

  ready(function(){
    var statusBadge = soloMode ? null : badge('🔌 connecting…', '#6b7280');
    var name = '';
    try { name = localStorage.getItem('lab-student-name') || ''; } catch(e){}

    // TEACHER banner — рендерится СРАЗУ, независимо от Supabase SDK.
    // Раньше банер висел внутри loadSDK().then() — если SDK не грузился
    // (сеть/CDN/RU-блок Supabase), банер не появлялся вообще. Теперь UI
    // всегда виден; broadcast подключается когда firehose готов.
    var pendingWordQueue = [];
    // Универсальный sender — до connect'а кладёт в очередь, после — broadcast.
    // SDK-side переопределит window.__labVocabSend когда firehose поднимется.
    window.__labVocabSend = window.__labVocabSend || function(w){ pendingWordQueue.push(w); };
    if (teacherMode) {
      if (!document.getElementById('lab-teacher-style')) {
        var ts2Pre = document.createElement('style');
        ts2Pre.id = 'lab-teacher-style';
        ts2Pre.textContent = '.lab-teacher-banner{position:fixed;top:0;left:0;right:0;z-index:100000;'+
          'padding:6px 10px;background:linear-gradient(90deg,#f59e0b,#fbbf24);'+
          'color:#1a1a2e;font:800 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.14em;'+
          'text-transform:uppercase;display:flex;align-items:center;justify-content:center;'+
          'gap:8px;box-shadow:0 2px 12px rgba(0,0,0,.3);flex-wrap:wrap}'+
          '@media(max-width:600px){.lab-teacher-banner{padding:6px 8px;font-size:10px;letter-spacing:.08em;gap:6px}'+
          '.lab-teacher-banner #labTeacherWord{width:160px !important;font-size:11px !important}'+
          '.lab-teacher-banner a[href*="teacher=off"]{padding:3px 8px !important;font-size:9px !important}}'+
          '.lab-click-flash{background:#fbbf24 !important;color:#1a1a2e !important;'+
          'border-radius:4px;padding:1px 5px;transition:background .15s,color .15s;'+
          'box-shadow:0 0 0 3px rgba(251,191,36,.45)}';
        document.head.appendChild(ts2Pre);
      }
      if (!document.querySelector('.lab-teacher-banner')) {
        var tBannerPre = document.createElement('div');
        tBannerPre.className = 'lab-teacher-banner';
        tBannerPre.innerHTML =
          '<span>🎓 Teacher · ' + (function(p){var m=p.match(/lingua-boost-lab\/([^?#]+)/i);if(m)return m[1].replace(/\/$/,'').slice(0,40);var last=p.split('/').filter(Boolean).slice(-3).join('/');return (last.replace(/%[0-9A-F]{2}/gi,'').slice(-40))||'lesson';})(location.pathname) + '</span>' +
          '<span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px">'+
            '<input id="labTeacherWord" type="text" placeholder="+ слово в корзиночку (или кликни в текст)" '+
              'style="padding:5px 12px;border-radius:50px;border:0;background:rgba(255,255,255,.92);color:#1a1a2e;'+
              'font:700 12px/1.3 \'Manrope\',sans-serif;outline:none;width:280px">'+
            '<button id="labTeacherAdd" type="button" '+
              'style="padding:6px 12px;border-radius:50px;border:0;cursor:pointer;'+
              'background:#1a1a2e;color:#fbbf24;font:800 11px/1 \'JetBrains Mono\',monospace;letter-spacing:.12em;text-transform:uppercase">'+
              '➕ enter</button>'+
          '</span>'+
          '<span style="margin-left:14px;opacity:.85">click слово в тексте → в корзинку</span>'+
          '<a href="?teacher=off" style="margin-left:14px;padding:4px 10px;border-radius:50px;background:rgba(26,26,46,.8);color:#fbbf24;text-decoration:none;font:800 10px/1 \'JetBrains Mono\',monospace;letter-spacing:.12em">выкл</a>';
        document.body.appendChild(tBannerPre);
        document.body.style.paddingTop = '40px';
        // Локальный enter → в очередь, отправится когда SDK поднимется
        var inpPre = document.getElementById('labTeacherWord');
        var addBtnPre = document.getElementById('labTeacherAdd');
        function localPush(){
          var w = (inpPre.value || '').trim();
          if (!w || w.length < 2) return;
          w = w.replace(/[^a-zA-Zа-яА-ЯёЁ\- ]/g,'').trim();
          if (!w) return;
          window.__labVocabSend(w);
          window.dispatchEvent(new CustomEvent('lab-local-vocab-push', { detail: { word: w }}));
          inpPre.value = '';
          var orig = inpPre.style.background;
          inpPre.style.background = '#22c55e';
          inpPre.placeholder = '✓ ' + w + (window.__labFirehoseReady ? ' — в корзинке у всех' : ' — сохранено, ждёт connect');
          setTimeout(function(){
            inpPre.style.background = orig || 'rgba(255,255,255,.92)';
            inpPre.placeholder = '+ слово в корзиночку (или кликни в текст)';
          }, 1300);
        }
        addBtnPre.addEventListener('click', localPush);
        inpPre.addEventListener('keydown', function(e){ if (e.key === 'Enter') localPush(); });
      }
    }

    loadSDK().then(function(sb){
      var client    = sb.createClient(SUPABASE_URL, SUPABASE_ANON);
      var channel   = null;            // sync-room channel (?sync=)
      var firehose  = null;            // global firehose for teacher-live.html
      var muteOutgoing = false;

      // ---- Firehose: ВСЕГДА (solo + sync + observer) ----
      firehose = client.channel('lab-firehose-v1', { config: { broadcast: { self: false } } });

      // ===== TELEPORT (v7) =====
      // Ученик слушает firehose 'scroll-to-student' event со своим room_id —
      // плавно прокручивается к указанной секции + жёлтый flash.
      if (!observeMode) {
        firehose.on('broadcast', { event:'scroll-to-student' }, function(p){
          var data = p.payload || {};
          if (data.room_id !== roomId) return;
          var sec = data.section_id ? document.getElementById(data.section_id) : null;
          if (!sec) {
            // fallback по индексу
            var sections = document.querySelectorAll('section.section');
            if (typeof data.idx === 'number' && sections[data.idx]) sec = sections[data.idx];
          }
          if (!sec) return;
          sec.scrollIntoView({behavior:'smooth', block:'start'});
          if (!document.getElementById('lab-teleport-style')) {
            var ts = document.createElement('style');
            ts.id = 'lab-teleport-style';
            ts.textContent = '@keyframes labTeleport{0%{box-shadow:0 0 0 0 rgba(251,191,36,.85)}'+
              '40%{box-shadow:0 0 0 14px rgba(251,191,36,.0)}100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}}'+
              '.lab-teleport-flash{animation:labTeleport 1.3s ease-out 2;border-radius:14px}';
            document.head.appendChild(ts);
          }
          sec.classList.add('lab-teleport-flash');
          setTimeout(function(){ sec.classList.remove('lab-teleport-flash'); }, 2700);
        });
      }

      // TEACHER mode прямо в уроке (без cabinet, без iframe)
      // Жёлтая полоса уже отрисована СВЫШЕ (до loadSDK). Здесь только
      // wire-up broadcast'а на уже существующий input+кнопку, dom-state
      // подписки, и flush очереди слов накопившейся до connect.
      if (teacherMode) {
        window.__labFirehoseReady = true;
        // Переопределяем sender — теперь broadcast'ит через firehose.
        window.__labVocabSend = function(w){
          try {
            firehose.send({ type:'broadcast', event:'vocab-push', payload: {
              word: w, lesson_path: location.pathname, ts: Date.now()
            }});
          } catch(e){}
        };
        // Flush накопленную очередь слов (пришедших до connect)
        try {
          if (Array.isArray(pendingWordQueue) && pendingWordQueue.length) {
            pendingWordQueue.forEach(function(w){ window.__labVocabSend(w); });
            pendingWordQueue.length = 0;
          }
        } catch(e){}
        // Слушаем dom-state events от учеников на этом же уроке
        firehose.on('broadcast', { event:'dom-state' }, function(p){
          var data = p.payload || {};
          if (data.lesson_path !== location.pathname) return;
          if (data.role === 'teacher' || data.role === 'observer') return;
          var el = resolvePath(data.path);
          if (!el) return;
          muteOutgoing = true;
          TRACK_CLASSES.forEach(function(c){ if (el.classList) el.classList.remove(c); });
          (data.classes || []).forEach(function(c){ el.classList && el.classList.add(c); });
          if ('value' in data && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
            el.value = data.value;
          }
          if (data.text && el.matches && (el.matches('.gap') || el.matches('.match-item'))) {
            el.textContent = data.text;
          }
          if (el.classList) {
            el.classList.add('lab-observe-flash');
            setTimeout(function(){ el.classList.remove('lab-observe-flash'); }, 800);
          }
          setTimeout(function(){ muteOutgoing = false; }, 200);
        });
        // Стиль flash для подсветки изменений ученика
        if (!document.getElementById('lab-teacher-flash-style')) {
          var fs = document.createElement('style');
          fs.id = 'lab-teacher-flash-style';
          fs.textContent = '.lab-observe-flash{box-shadow:0 0 0 3px rgba(251,191,36,.55) !important;transition:box-shadow .8s ease-out}';
          document.head.appendChild(fs);
        }
        if (!document.getElementById('lab-teacher-style')) {
          var ts2 = document.createElement('style');
          ts2.id = 'lab-teacher-style';
          ts2.textContent = '.lab-teacher-banner{position:fixed;top:0;left:0;right:0;z-index:100000;'+
            'padding:6px 10px;background:linear-gradient(90deg,#f59e0b,#fbbf24);'+
            'color:#1a1a2e;font:800 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.14em;'+
            'text-transform:uppercase;display:flex;align-items:center;justify-content:center;'+
            'gap:8px;box-shadow:0 2px 12px rgba(0,0,0,.3);flex-wrap:wrap}'+
            /* Mobile — компактнее, в две строки */
            '@media(max-width:600px){.lab-teacher-banner{padding:6px 8px;font-size:10px;letter-spacing:.08em;gap:6px}'+
            '.lab-teacher-banner #labTeacherWord{width:160px !important;font-size:11px !important}'+
            '.lab-teacher-banner a[href*="teacher=off"]{padding:3px 8px !important;font-size:9px !important}}'+
            '.lab-click-flash{background:#fbbf24 !important;color:#1a1a2e !important;'+
            'border-radius:4px;padding:1px 5px;transition:background .15s,color .15s;'+
            'box-shadow:0 0 0 3px rgba(251,191,36,.45)}';
          document.head.appendChild(ts2);
        }
        // Банер уже отрисован СВЫШЕ (до loadSDK). Здесь его НЕ дублируем.
        if (!document.querySelector('.lab-teacher-banner')) {
          var tBanner = document.createElement('div');
          tBanner.className = 'lab-teacher-banner';
          tBanner.innerHTML =
            '<span>🎓 Teacher · ' + (function(p){var m=p.match(/lingua-boost-lab\/([^?#]+)/i);if(m)return m[1].replace(/\/$/,'').slice(0,40);var last=p.split('/').filter(Boolean).slice(-3).join('/');return (last.replace(/%[0-9A-F]{2}/gi,'').slice(-40))||'lesson';})(location.pathname) + '</span>' +
            '<span style="display:inline-flex;align-items:center;gap:6px;margin-left:14px">'+
              '<input id="labTeacherWord" type="text" placeholder="+ слово в корзиночку (или кликни в текст)" '+
                'style="padding:5px 12px;border-radius:50px;border:0;background:rgba(255,255,255,.92);color:#1a1a2e;'+
                'font:700 12px/1.3 \'Manrope\',sans-serif;outline:none;width:280px">'+
              '<button id="labTeacherAdd" type="button" '+
                'style="padding:6px 12px;border-radius:50px;border:0;cursor:pointer;'+
                'background:#1a1a2e;color:#fbbf24;font:800 11px/1 \'JetBrains Mono\',monospace;letter-spacing:.12em;text-transform:uppercase">'+
                '➕ enter</button>'+
            '</span>'+
            '<span style="margin-left:14px;opacity:.85">click слово в тексте → в корзинку</span>'+
            '<a href="?teacher=off" style="margin-left:14px;padding:4px 10px;border-radius:50px;background:rgba(26,26,46,.8);color:#fbbf24;text-decoration:none;font:800 10px/1 \'JetBrains Mono\',monospace;letter-spacing:.12em">выкл</a>';
          document.body.appendChild(tBanner);
          document.body.style.paddingTop = '40px';
        }

        function pushWord(w){
          if (!w || w.length < 2) return;
          w = w.replace(/[^a-zA-Zа-яА-ЯёЁ\- ]/g,'').trim();
          if (!w) return;
          firehose.send({ type:'broadcast', event:'vocab-push', payload: {
            word: w, lesson_path: location.pathname, ts: Date.now()
          }});
          window.dispatchEvent(new CustomEvent('lab-local-vocab-push', { detail: { word: w }}));
        }
        function teacherEnter(){
          var inp = document.getElementById('labTeacherWord');
          var w = (inp.value || '').trim();
          if (!w) return;
          pushWord(w);
          inp.value = '';
          var orig = inp.style.background;
          inp.style.background = '#22c55e';
          inp.placeholder = '✓ ' + w + ' — в корзинке у всех';
          setTimeout(function(){
            inp.style.background = orig || 'rgba(255,255,255,.92)';
            inp.placeholder = '+ слово в корзиночку (или кликни в текст)';
          }, 1300);
        }
        document.getElementById('labTeacherAdd').addEventListener('click', teacherEnter);
        document.getElementById('labTeacherWord').addEventListener('keydown', function(e){ if (e.key === 'Enter') teacherEnter(); });

        // SELECTION-based add: только если Маша выделила слово мышью.
        // Никакого click-to-vocab по любому слову — слишком хаотично.
        document.addEventListener('mouseup', function(){
          setTimeout(function(){
            var sel = window.getSelection();
            var text = sel ? sel.toString().trim() : '';
            if (!text || text.length < 2 || text.length > 40) return;
            if (/\s{2,}/.test(text)) return;
            // floating "+ в словарь" near selection
            var existing = document.querySelector('.lab-teacher-add-float');
            if (existing) existing.remove();
            var range = sel.getRangeAt(0);
            var r = range.getBoundingClientRect();
            var fb = document.createElement('button');
            fb.className = 'lab-teacher-add-float';
            fb.type = 'button';
            fb.textContent = '+ в словарь · ' + text;
            fb.style.cssText = 'position:absolute;z-index:99996;'+
              'padding:8px 14px;border-radius:50px;border:0;cursor:pointer;'+
              'background:linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%);color:#1a1a2e;'+
              'font:800 .82rem/1 "Manrope",sans-serif;'+
              'box-shadow:0 8px 22px rgba(245,158,11,.42);'+
              'left:' + Math.min(window.innerWidth - 220, r.right + 8) + 'px;'+
              'top:' + (r.top + window.scrollY - 8) + 'px';
            document.body.appendChild(fb);
            fb.addEventListener('click', function(){
              pushWord(text);
              fb.remove();
              window.getSelection().removeAllRanges();
            });
            setTimeout(function(){ if (fb.parentNode) fb.remove(); }, 5000);
          }, 80);
        });
      }

      // Observer mode (teacher iframe) — listen и применять к локальному DOM
      if (observeMode) {
        // Перехват TOC-кликов в iframe — вместо локального scroll, broadcast'им ученику
        setTimeout(function bindTocTeleport(){
          var toc = document.querySelector('.lp-toc');
          if (!toc) return setTimeout(bindTocTeleport, 400);
          var sectionEls = [].slice.call(document.querySelectorAll('section.section'));
          toc.querySelectorAll('.lp-toc-btn').forEach(function(btn, i){
            btn.addEventListener('click', function(e){
              e.stopPropagation();
              var sec = sectionEls[i];
              if (!sec || !sec.id) return;
              firehose.send({ type:'broadcast', event:'scroll-to-student', payload: {
                room_id: observeId, section_id: sec.id, idx: i, ts: Date.now()
              }});
              // Локально тоже скроллим в iframe чтобы Маша видела куда отправила
              sec.scrollIntoView({behavior:'smooth', block:'start'});
              // Жёлтый burst в углу iframe
              var pop = document.createElement('div');
              pop.style.cssText = 'position:fixed;left:50%;top:60px;transform:translateX(-50%);'+
                'z-index:99999;padding:8px 18px;border-radius:50px;'+
                'background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1a2e;'+
                'font:800 11px/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;'+
                'box-shadow:0 8px 22px rgba(245,158,11,.42)';
              pop.textContent = '🛸 teleported ученика к ' + sec.id;
              document.body.appendChild(pop);
              setTimeout(function(){ pop.remove(); }, 1800);
            }, true);
          });
        }, 600);

        firehose.on('broadcast', { event:'dom-state' }, function(p){
          var data = p.payload || {};
          if (data.room_id !== observeId) return;
          var el = resolvePath(data.path);
          if (!el) return;
          muteOutgoing = true;
          TRACK_CLASSES.forEach(function(c){ if (el.classList) el.classList.remove(c); });
          (data.classes || []).forEach(function(c){ el.classList && el.classList.add(c); });
          if ('value' in data && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
            el.value = data.value;
          }
          if (data.text && el.matches && (el.matches('.gap') || el.matches('.match-item'))) {
            el.textContent = data.text;
          }
          // Visual ping — мягкий жёлтый flash чтобы Маша видела что обновилось
          if (el.classList) {
            el.classList.add('lab-observe-flash');
            setTimeout(function(){ el.classList.remove('lab-observe-flash'); }, 800);
          }
          setTimeout(function(){ muteOutgoing = false; }, 200);
        });
        // Indicator стиль
        if (!document.getElementById('lab-observe-style')) {
          var os = document.createElement('style');
          os.id = 'lab-observe-style';
          os.textContent = '.lab-observe-flash{box-shadow:0 0 0 3px rgba(251,191,36,.55) !important;'+
            'transition:box-shadow .8s ease-out}'+
            '.lab-observe-banner{position:fixed;top:0;left:0;right:0;z-index:100000;'+
            'padding:6px 14px;background:linear-gradient(90deg,#f59e0b,#fbbf24);'+
            'color:#1a1a2e;font:800 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.16em;'+
            'text-transform:uppercase;display:flex;align-items:center;justify-content:center;'+
            'gap:8px;box-shadow:0 2px 12px rgba(0,0,0,.3);flex-wrap:wrap}';
          document.head.appendChild(os);
          var banner = document.createElement('div');
          banner.className = 'lab-observe-banner';
          banner.innerHTML =
            '<span>👁 Observer · ' + observeId.replace(/^student-/, '') + '</span>' +
            '<span style="display:inline-flex;align-items:center;gap:6px;margin-left:18px">'+
              '<input id="labQuickWord" type="text" placeholder="+ слово ученику" '+
                'style="padding:5px 12px;border-radius:50px;border:0;background:rgba(255,255,255,.92);color:#1a1a2e;'+
                'font:700 12px/1.3 \'Manrope\',sans-serif;outline:none;width:220px">'+
              '<button id="labQuickAdd" type="button" '+
                'style="padding:6px 12px;border-radius:50px;border:0;cursor:pointer;'+
                'background:#1a1a2e;color:#fbbf24;font:800 11px/1 \'JetBrains Mono\',monospace;letter-spacing:.12em;text-transform:uppercase">'+
                '➕ enter</button>'+
            '</span>';
          document.body.appendChild(banner);
          document.body.style.paddingTop = '40px';
          // Quick add — пушит слово ученику через firehose
          function quickPush(){
            var inp = document.getElementById('labQuickWord');
            var w = (inp.value || '').trim();
            if (w.length < 2) return;
            // 1. Broadcast ученику через firehose
            firehose.send({ type:'broadcast', event:'vocab-push', payload: {
              room_id: observeId, word: w, ts: Date.now()
            }});
            // 2. Локально (в iframe Маши) — пинаем lab-vocab-builder синхронно
            window.dispatchEvent(new CustomEvent('lab-local-vocab-push', { detail: { word: w }}));
            inp.value = '';
            var orig = inp.style.background;
            inp.style.background = '#22c55e';
            inp.placeholder = '✓ отправлено: ' + w;
            setTimeout(function(){
              inp.style.background = orig || 'rgba(255,255,255,.92)';
              inp.placeholder = '+ слово ученику';
            }, 1100);
          }
          document.getElementById('labQuickAdd').addEventListener('click', quickPush);
          document.getElementById('labQuickWord').addEventListener('keydown', function(e){
            if (e.key === 'Enter') quickPush();
          });
        }
      }

      firehose.subscribe(function(status){
        if (status === 'SUBSCRIBED' && !observeMode) {
          // Heartbeat — урок открыт (только от ученика, не от observer)
          firehose.send({
            type: 'broadcast', event: 'lesson-open',
            payload: {
              room_id: roomId, name: name || '', role: role,
              lesson_path: location.pathname,
              lesson_title: (document.querySelector('.lab-hero h1, .hero h1, h1')?.textContent || document.title || '').trim().slice(0,120),
              ua: navigator.userAgent.slice(0,60), ts: Date.now()
            }
          });
        }
      });

      // ---- Sync-room (двусторонний urok) ----
      if (!soloMode) {
        channel = client.channel('lab-sync:'+roomId, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'scroll-to' }, function(payload){
            var p = payload.payload || {};
            var el = document.getElementById(p.id);
            if (el) {
              muteOutgoing = true;
              el.scrollIntoView({ behavior:'smooth', block:'start' });
              setTimeout(function(){ muteOutgoing = false; }, 1200);
            }
          })
          .on('broadcast', { event: 'section-submit' }, function(payload){
            var p = payload.payload || {};
            if (role !== 'teacher') return;
            var note = badge('📋 '+p.role+' сдал '+p.section_title+' · '+p.score+'/'+p.total, '#0033A0');
            setTimeout(function(){ note.remove(); }, 5000);
          })
          .on('broadcast', { event:'dom-state' }, function(p){
            var data = p.payload || {};
            var el = resolvePath(data.path);
            if (!el) return;
            muteOutgoing = true;
            TRACK_CLASSES.forEach(function(c){ if (el.classList) el.classList.remove(c); });
            (data.classes || []).forEach(function(c){ el.classList && el.classList.add(c); });
            if ('value' in data && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
              el.value = data.value;
            }
            if (data.text && el.matches && (el.matches('.gap') || el.matches('.match-item'))) {
              el.textContent = data.text;
            }
            setTimeout(function(){ muteOutgoing = false; }, 200);
          })
          .subscribe(function(status){
            if (status === 'SUBSCRIBED') {
              statusBadge.textContent = '🟢 '+role+' · room '+roomId;
              statusBadge.style.background = role === 'teacher' ? '#D52B1E' : '#2E7D32';
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              statusBadge.textContent = '🔴 sync error';
              statusBadge.style.background = '#6b7280';
            }
          });
      }

      // ---- Live broadcast ученика — ВСЕГДА в firehose + (если sync) в room ----
      var sendThrottle = {};
      function maybeSend(el){
        if (role === 'teacher' || observeMode) return; // учитель и observer не транслируют
        var path = pathOf(el);
        if (!path) return;
        var now = Date.now();
        if (sendThrottle[path] && now - sendThrottle[path] < 180) return;
        sendThrottle[path] = now;
        var ctx = elContext(el);
        var basePayload = {
          path: path, classes: pickFlags(el),
          kind: ctx.kind, section_id: ctx.section_id, section_title: ctx.section_title, tag: ctx.tag
        };
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') basePayload.value = (el.value || '').slice(0,160);
        if (el.tagName === 'SELECT') basePayload.value = el.value || '';
        if (el.textContent && el.matches && (el.matches('.gap') || el.matches('.match-item'))) {
          basePayload.text = el.textContent.slice(0, 80);
        }
        if (channel) channel.send({ type:'broadcast', event:'dom-state', payload: basePayload });
        // В firehose добавляем identity + lesson context
        var fhPayload = Object.assign({
          room_id: roomId, name: name || '', role: role,
          lesson_path: location.pathname, ts: now
        }, basePayload);
        firehose.send({ type:'broadcast', event:'dom-state', payload: fhPayload });
      }

      function bindLiveSync(){
        document.querySelectorAll(TRACK_SEL).forEach(function(el){
          if (el.__syncBound) return;
          el.__syncBound = true;
          var mo = new MutationObserver(function(){ if (!muteOutgoing) maybeSend(el); });
          mo.observe(el, { attributes:true, attributeFilter:['class'], childList:true, characterData:true, subtree:true });
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            el.addEventListener('input', function(){ if (!muteOutgoing) maybeSend(el); });
            el.addEventListener('change', function(){ if (!muteOutgoing) maybeSend(el); });
          }
        });
      }
      bindLiveSync();
      var bodyObs = new MutationObserver(function(){ bindLiveSync(); });
      bodyObs.observe(document.body, { childList:true, subtree:true });

      // ---- TOC broadcast (только sync) ----
      if (!soloMode) {
        (function bindTocBroadcast(){
          var toc = document.querySelector('.lp-toc');
          if (!toc) return setTimeout(bindTocBroadcast, 300);
          var sectionEls = [].slice.call(document.querySelectorAll('section.section'));
          toc.querySelectorAll('.lp-toc-btn').forEach(function(btn, i){
            btn.addEventListener('click', function(){
              if (muteOutgoing) return;
              var sec = sectionEls[i];
              if (sec && sec.id) {
                channel.send({
                  type: 'broadcast', event: 'scroll-to',
                  payload: { id: sec.id, idx: i, role: role }
                });
              }
            }, true);
          });
        })();
      }

      // --- Submit handler — работает В ОБОИХ режимах.
      //     Solo: спросить имя на первом submit, потом persist в lab_submissions.
      //     Sync: broadcast + persist.
      //     Observer: silent (учитель не сдаёт за ученика).
      document.addEventListener('click', function(e){
        if (observeMode) return;
        var b = e.target.closest('.lp-submit');
        if (!b) return;
        setTimeout(async function(){
          var sec = b.closest('section.section');
          if (!sec) return;
          var report = sec.querySelector('.lp-report');
          if (!report) return;
          var stats = report.querySelector('.lp-stats');
          var m = (stats && stats.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
          if (!m) return;

          // В solo-режиме — на первом submit без имени всплывёт модалка.
          if (soloMode && /^solo-/.test(roomId)) {
            var nm = await askName();
            if (nm) {
              roomId = 'student-' + slugify(nm);
              role = 'solo:' + nm;
              name = nm;
            }
          }

          var title = (sec.querySelector('h2') || {textContent:sec.id}).textContent.trim();
          var misses = [];
          report.querySelectorAll('.lp-item').forEach(function(item){
            misses.push(item.textContent.replace(/\s+/g,' ').trim().slice(0, 200));
          });
          var payload = {
            section_id: sec.id, section_title: title.slice(0,80),
            score: +m[1], total: +m[2], role: role, name: name||'', ts: Date.now(),
            room_id: roomId, lesson_path: location.pathname
          };
          if (channel) {
            channel.send({ type:'broadcast', event:'section-submit', payload: payload });
          }
          if (firehose) {
            firehose.send({ type:'broadcast', event:'section-submit', payload: payload });
          }
          try {
            await client.from('lab_submissions').insert({
              room_id: roomId,
              lesson_path: location.pathname,
              section_id: sec.id,
              section_title: title.slice(0,80),
              student_role: role,
              score: +m[1], total: +m[2],
              misses: misses
            });
          } catch (e) { console.warn('[lab-sync] persist failed', e); }
        }, 400);
      });
    }).catch(function(err){
      if (statusBadge) {
        statusBadge.textContent = '🔴 '+err.message;
        statusBadge.style.background = '#6b7280';
      }
    });
  });
})();
