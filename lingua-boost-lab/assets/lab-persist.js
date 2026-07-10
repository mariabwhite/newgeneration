/* lab-persist.js v3 — universal exercise state persistence for Lab lessons.
   Captures class flags + input values + textContent on common exercise
   elements. Restores on next page load. Reset via floating button.

   v3 (2026-07-10): + cloud dual-write to Supabase table `lab_state`.
     Local (localStorage) — fastpath, instant restore.
     Cloud (lab_state) — cement per (room_id, lesson_path), throttled 2s.
     On restore: local first (0ms), cloud second (~200ms) → patch missing keys.
     data-lp-key attribute on element = stable identity (survives shuffle).
     Wait for `lab-ready` custom event OR MutationObserver-quiet 500ms
     before restore (was fixed 300ms) — no more racing lesson JS shuffles.
     If Supabase SDK / table absent → graceful degradation, works as v2.
*/
(function(){
  'use strict';

  var KEY = 'lab-persist:' + location.pathname;

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";
  var CLOUD_THROTTLE_MS = 2000;
  var LESSON_PATH = location.pathname;

  /* state-bearing class flags we will persist (broad list — safe to add) */
  var FLAGS = ['done','correct','wrong','filled','miss','missed','used',
               'selected','sel','revealed','visited','picked','guessed',
               'match','show','shown','placed','hit','ok','heard','spoken',
               'lit','bad','hover','active','recording',
               'flipped','scored','show-sample'];
  var FLAG_SET = Object.create(null);
  FLAGS.forEach(function(f){ FLAG_SET[f] = 1; });

  var SEL = [
    '.match-card', '.tf-btn', '.mc-opt', '.mc-q .gap', '.bank-word',
    '.drop-gap', '.gap-input', '.ord-slot', '.ord-pill', '.dict-input',
    '.dict-answer', '.trans-input', '.predict-btn', '.predict-card',
    '.choice-card', '.script-card', '.map-dot', '.postcard',
    '.detective-pill', '.q-row',
    'textarea', '.writing-area', '.oge-transcript', '.oge-results',
    '.utw-card', '.transcript', '.progress-dot', '.rail-step',
    '.vocab-card', '.mic-feedback', '.mic-transcript',
    '.builder-status', '.target-line .slot', '.gapfill input',
    '.mcq-opts button', '.mcq-row', '.write', '.builder',
    '.tutor-input', '.check-result',
    '[data-lp-key]'  /* v3: explicit key overrides all */
  ].join(',');

  /* v3: prefer explicit data-lp-key; then #id; then walk to data-ex / id / section */
  function pathOf(el){
    if (!el || el === document.body) return null;
    if (el.dataset && el.dataset.lpKey) return 'k:' + el.dataset.lpKey;
    if (el.id) return '#' + el.id;
    var parts = [];
    var n = el;
    while (n && n !== document.body) {
      var p = n.parentElement;
      if (!p) return null;
      var idx = Array.prototype.indexOf.call(p.children, n);
      parts.unshift(idx);
      if (p.dataset && p.dataset.lpKey) { parts.unshift('k:' + p.dataset.lpKey); return parts.join('/'); }
      if (p.id) { parts.unshift('#' + p.id); return parts.join('/'); }
      if (p.dataset && p.dataset.ex)  { parts.unshift('ex:' + p.dataset.ex); return parts.join('/'); }
      if (p.dataset && p.dataset.idx) { parts.unshift('idx:' + p.dataset.idx); return parts.join('/'); }
      if (p.tagName === 'SECTION' && p.id) { parts.unshift('#' + p.id); return parts.join('/'); }
      n = p;
    }
    return parts.length ? parts.join('/') : null;
  }

  function resolve(path){
    if (!path) return null;
    if (path.indexOf('k:') === 0) {
      var parts = path.split('/');
      var key = parts[0].slice(2);
      var root = document.querySelector('[data-lp-key="' + key + '"]');
      return root ? walk(root, parts.slice(1)) : null;
    }
    if (path[0] === '#') return document.getElementById(path.slice(1).split('/')[0]) ? walk(document.getElementById(path.slice(1).split('/')[0]), path.split('/').slice(1)) : null;
    if (path.indexOf('ex:') === 0) {
      var parts2 = path.split('/');
      var root2 = document.querySelector('[data-ex="' + parts2[0].slice(3) + '"]');
      return root2 ? walk(root2, parts2.slice(1)) : null;
    }
    return null;
  }
  function walk(root, parts){
    var n = root;
    for (var i=0; i<parts.length; i++){
      var p = parts[i];
      if (p === '' || isNaN(p)) continue;
      n = n.children[+p];
      if (!n) return null;
    }
    return n;
  }

  function pickFlags(el){
    var keep = [];
    if (!el.classList) return keep;
    for (var i=0; i<el.classList.length; i++){
      var c = el.classList[i];
      if (FLAG_SET[c]) keep.push(c);
    }
    return keep;
  }

  function snap(){
    var out = {};
    var nodes = document.querySelectorAll(SEL);
    for (var i=0; i<nodes.length; i++){
      var el = nodes[i];
      var flags = pickFlags(el);
      var hasVal = ('value' in el) && el.value;
      var hasPlaced = el.dataset && el.dataset.placed;
      var savedText = null;
      if (el.classList.contains('drop-gap') || el.classList.contains('gap-input')
          || el.classList.contains('mc-q')
          || el.classList.contains('ord-slot')
          || el.classList.contains('oge-transcript')
          || el.classList.contains('transcript')
          || el.classList.contains('dict-answer')
          || el.classList.contains('mic-feedback')
          || el.classList.contains('mic-transcript')
          || el.classList.contains('builder-status')
          || el.classList.contains('check-result')
          || (el.classList.contains('slot') && el.classList.contains('filled'))) {
        savedText = el.textContent || '';
      }
      if (!flags.length && !hasVal && !hasPlaced && savedText === null) continue;
      var path = pathOf(el);
      if (!path) continue;
      var item = {};
      if (flags.length)  item.c = flags;
      if (hasVal)        item.v = el.value;
      if (hasPlaced)     item.p = el.dataset.placed;
      if (savedText !== null) item.t = savedText;
      out[path] = item;
    }
    return out;
  }

  function applyState(data){
    if (!data) return;
    Object.keys(data).forEach(function(path){
      var el = resolve(path);
      if (!el) return;
      var s = data[path];
      if (s.c)            s.c.forEach(function(c){ el.classList.add(c); });
      if (s.v !== undefined && 'value' in el) el.value = s.v;
      if (s.p)            el.dataset.placed = s.p;
      if (s.t !== undefined && el.children.length === 0) el.textContent = s.t;
    });
  }

  function readLocal(){
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch(e){ return null; }
  }
  function writeLocal(data){
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e){}
  }

  /* -------- Cloud layer (Supabase lab_state) -------- */
  var client = null;
  var cloudReady = false;
  var cloudDisabled = false;   /* true после первого 404/permission-fail — не долбим */
  var lastCloudPushAt = 0;
  var cloudPushTimer = null;
  var lastPushedState = null;   /* дедуп: не отсылать identical */

  function getRoomId(){
    try {
      var nm = localStorage.getItem('lab-student-name') || '';
      if (nm) return 'student-' + nm.toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
      var solo = localStorage.getItem('lab-solo-id');
      if (solo) return solo;
    } catch(e){}
    return null;
  }
  function getName(){
    try { return localStorage.getItem('lab-student-name') || ''; } catch(e){ return ''; }
  }

  function loadSDK(){
    return new Promise(function(resolve, reject){
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var existing = document.querySelector('script[data-lp-sb-sdk]');
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.supabase); });
        existing.addEventListener('error', function(){ reject(new Error('sdk fail')); });
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.async = true;
      s.setAttribute('data-lp-sb-sdk', '1');
      s.onload = function(){ resolve(window.supabase); };
      s.onerror = function(){ reject(new Error('sdk fail')); };
      document.head.appendChild(s);
    });
  }

  function initCloud(){
    if (cloudReady || cloudDisabled) return Promise.resolve();
    return loadSDK().then(function(sb){
      client = sb.createClient(SUPABASE_URL, SUPABASE_ANON);
      cloudReady = true;
    }).catch(function(){ cloudDisabled = true; });
  }

  function scorePct(state){
    /* Best-effort score derivation from a snapshot.
       Counts right/correct/filled/matched vs wrong/miss/missed. */
    var right = 0, wrong = 0;
    Object.keys(state || {}).forEach(function(k){
      var c = (state[k] && state[k].c) || [];
      var isRight = false, isWrong = false;
      for (var i=0; i<c.length; i++){
        var f = c[i];
        if (f === 'right' || f === 'correct' || f === 'filled' || f === 'matched' || f === 'ok' || f === 'hit') isRight = true;
        if (f === 'wrong' || f === 'miss' || f === 'missed' || f === 'bad') isWrong = true;
      }
      if (isRight) right++;
      else if (isWrong) wrong++;
    });
    var total = right + wrong;
    return { score: right, total: total, pct: total ? Math.round(100 * right / total) : null };
  }

  function lastSectionTouched(){
    /* Heuristic: last visited/active section by id */
    var last = null;
    document.querySelectorAll('section.section').forEach(function(sec){
      if (sec.classList.contains('active') || sec.classList.contains('visited')) last = sec.id || last;
    });
    return last;
  }

  function pushCloud(force){
    if (cloudDisabled) return;
    var roomId = getRoomId();
    if (!roomId) return;   /* нет ученика — не пишем в облако */
    var state = snap();
    var serialized = JSON.stringify(state);
    if (!force && serialized === lastPushedState) return;
    var now = Date.now();
    var wait = Math.max(0, CLOUD_THROTTLE_MS - (now - lastCloudPushAt));
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(function(){
      lastCloudPushAt = Date.now();
      lastPushedState = serialized;
      initCloud().then(function(){
        if (!cloudReady || !client) return;
        var meta = scorePct(state);
        client.from('lab_state').upsert({
          room_id:      roomId,
          lesson_path:  LESSON_PATH,
          state:        state,
          score:        meta.score,
          total:        meta.total,
          pct:          meta.pct,
          last_section: lastSectionTouched(),
          name:         getName() || null
        }, { onConflict: 'room_id,lesson_path' })
        .then(function(res){
          if (res && res.error) {
            /* 404 (table missing) / permission fail → disable cloud, keep local */
            var msg = (res.error.message || '').toLowerCase();
            if (msg.indexOf('lab_state') >= 0 || msg.indexOf('not found') >= 0 ||
                msg.indexOf('permission') >= 0 || res.error.code === '42P01') {
              cloudDisabled = true;
            }
          }
        }).catch(function(){});
      });
    }, wait);
  }

  function pullCloud(){
    if (cloudDisabled) return Promise.resolve(null);
    var roomId = getRoomId();
    if (!roomId) return Promise.resolve(null);
    return initCloud().then(function(){
      if (!cloudReady || !client) return null;
      return client.from('lab_state')
        .select('state, updated_at')
        .eq('room_id', roomId)
        .eq('lesson_path', LESSON_PATH)
        .maybeSingle()
        .then(function(res){
          if (res && res.error) {
            var msg = (res.error.message || '').toLowerCase();
            if (msg.indexOf('lab_state') >= 0 || res.error.code === '42P01') cloudDisabled = true;
            return null;
          }
          return (res && res.data) || null;
        })
        .catch(function(){ return null; });
    });
  }

  /* Merge cloud into current local snap:
     - keep every key already present locally (never overwrite fresh input)
     - fill only paths that don't exist yet */
  function mergeInto(existingLocal, cloudState){
    var out = Object.assign({}, cloudState || {});
    Object.keys(existingLocal || {}).forEach(function(k){ out[k] = existingLocal[k]; });
    return out;
  }

  /* -------- Save / restore lifecycle -------- */
  var saveT = null;
  function save(){
    clearTimeout(saveT);
    saveT = setTimeout(function(){
      writeLocal(snap());
      pushCloud(false);
    }, 350);
  }
  function saveNow(){
    clearTimeout(saveT);
    writeLocal(snap());
    pushCloud(true);
  }

  ['click','input','change','keyup'].forEach(function(ev){
    document.addEventListener(ev, save, true);
  });
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('beforeunload', saveNow);
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') saveNow();
  });
  window.addEventListener('blur', saveNow);

  /* v3 restore: local instant, then cloud merge if cloud has extra keys.
     Wait for `lab-ready` event OR MutationObserver-quiet 500ms — whichever fires first. */
  function restoreLocal(){
    var local = readLocal();
    if (local) applyState(local);
    return local;
  }

  function restoreCloud(localSnap){
    return pullCloud().then(function(row){
      if (!row || !row.state) return;
      var cloudState = row.state;
      /* Determine which paths are missing locally — fill only those.
         If path already exists locally, trust local (freshest interaction). */
      var patch = {};
      var localSnapKeys = localSnap ? Object.keys(localSnap) : [];
      var localSet = Object.create(null);
      localSnapKeys.forEach(function(k){ localSet[k] = 1; });
      Object.keys(cloudState).forEach(function(k){
        if (!localSet[k]) patch[k] = cloudState[k];
      });
      applyState(patch);
      /* Merge for future local writes */
      var merged = mergeInto(localSnap || {}, cloudState);
      writeLocal(merged);
    });
  }

  function whenLessonReady(cb){
    var fired = false;
    function go(){ if (fired) return; fired = true; cb(); }

    /* Signal 1: explicit lab-ready event fired by lesson scripts */
    document.addEventListener('lab-ready', go, { once: true });

    /* Signal 2: MutationObserver-quiet 500ms after DOMContentLoaded */
    var quietT = null;
    var mo = new MutationObserver(function(){
      clearTimeout(quietT);
      quietT = setTimeout(function(){
        try { mo.disconnect(); } catch(e){}
        go();
      }, 500);
    });
    try {
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: false });
    } catch(e){}
    /* Prime the quiet timer even if no mutations happen */
    quietT = setTimeout(function(){
      try { mo.disconnect(); } catch(e){}
      go();
    }, 500);

    /* Safety cap: never wait longer than 4s */
    setTimeout(go, 4000);
  }

  function onReady(){
    whenLessonReady(function(){
      var localSnap = restoreLocal();
      restoreCloud(localSnap);
      addResetBtn();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  function addResetBtn(){
    if (document.getElementById('lab-reset-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'lab-reset-btn';
    btn.type = 'button';
    btn.innerHTML = '↺ Reset progress';
    btn.title = 'Сбросить прогресс этого урока';
    btn.style.cssText = [
      'position:fixed','bottom:18px','right:18px','z-index:9999',
      'background:#fff','color:#333','border:1.5px solid #999',
      'border-radius:30px','padding:8px 16px',
      'font-family:"JetBrains Mono",ui-monospace,monospace',
      'font-size:.72rem','font-weight:800','letter-spacing:.06em',
      'cursor:pointer','box-shadow:0 4px 14px rgba(0,0,0,.20)',
      'opacity:.85','transition:opacity .2s,transform .15s'
    ].join(';');
    btn.onmouseenter = function(){ btn.style.opacity = '1'; btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = function(){ btn.style.opacity = '.85'; btn.style.transform = 'translateY(0)'; };
    btn.onclick = function(){
      if (confirm('Сбросить прогресс этого урока?\n\n(все ответы, заполненные пропуски, транскрипты и помеченные карточки очистятся)')) {
        try { localStorage.removeItem(KEY); } catch(e){}
        /* Wipe cloud row too — иначе через 500мс restoreCloud вернёт всё обратно */
        var roomId = getRoomId();
        if (roomId && !cloudDisabled) {
          initCloud().then(function(){
            if (!client) return;
            client.from('lab_state')
              .delete()
              .eq('room_id', roomId)
              .eq('lesson_path', LESSON_PATH)
              .then(function(){ location.reload(); })
              .catch(function(){ location.reload(); });
          });
        } else {
          location.reload();
        }
      }
    };
    document.body.appendChild(btn);
  }

  window.labPersist = {
    snap:    snap,
    save:    save,
    saveNow: saveNow,
    restore: function(){ var s = restoreLocal(); restoreCloud(s); },
    reset: function(){ try { localStorage.removeItem(KEY); } catch(e){} location.reload(); },
    key:     KEY,
    version: 3,
    cloudDisabled: function(){ return cloudDisabled; }
  };
})();
