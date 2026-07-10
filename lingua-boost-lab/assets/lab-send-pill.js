/* lab-send-pill.js v1 · 2026-07-10
   Большой видимый блок «📤 Отправить учителю» в конце каждого Lab-урока.
   Собирает labPersist.snap() → INSERT в lab_submissions (section_id='full-lesson-submit')
   + upsert lab_state + broadcast firehose. Никакого hover, никакого поиска.
   Ученик открыл урок, решил, докрутил вниз, нажал → учитель видит в кабинете.

   Кооперирует с существующим homework flow (не заменяет lab-homework):
   — Ссылка «Открыть мою домашку» ведёт на .homework/?lesson=<path> как обычно.
   — Основная кнопка сразу отправляет snapshot урока — для случая когда ученик
     не разбирался с «+ в домашку». Всё что решил уже уходит.
*/
(function(){
  if (window.__labSendPillLoaded) return;
  window.__labSendPillLoaded = true;

  var SUPABASE_URL  = "https://iqzlphbvmfgoygnozbya.supabase.co";
  var SUPABASE_ANON = "sb_publishable_hYhBk3xS90uouUFd_DZWUw_sOv-6JGO";

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function slugify(s){
    return (s||'').toLowerCase().replace(/[^a-zа-яё0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,30);
  }
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function loadSDK(){
    return new Promise(function(resolve, reject){
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var existing = document.querySelector('script[src*="@supabase/supabase-js"]');
      if (existing) {
        existing.addEventListener('load', function(){ resolve(window.supabase); });
        existing.addEventListener('error', function(){ reject(new Error('sdk fail')); });
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.async = true;
      s.onload = function(){ resolve(window.supabase); };
      s.onerror = function(){ reject(new Error('sdk fail')); };
      document.head.appendChild(s);
    });
  }

  function scorePct(state){
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

  function skipPage(){
    /* Skip on homework page and observe mode */
    if (/[?&]observe=/.test(location.search)) return true;
    if (/\/\.homework\//.test(location.pathname)) return true;
    if (/[?&]teacher=on/.test(location.search)) return true;
    /* Skip if lesson already has a manual send block */
    if (document.querySelector('.lp-final-send, .lab-send-block, [data-lp-final-send]')) return true;
    return false;
  }

  function injectStyle(){
    if (document.getElementById('lp-final-send-style')) return;
    var st = document.createElement('style');
    st.id = 'lp-final-send-style';
    st.textContent = [
      '.lp-final-send{',
        'max-width:1200px;margin:36px auto 72px;padding:32px 28px;',
        'border-radius:22px;',
        'background:linear-gradient(135deg,#fef7ea 0%,#fde8b4 100%);',
        'border:2px solid #f5b83a;',
        'box-shadow:0 10px 34px rgba(217,119,6,.18);',
        'text-align:center;font-family:"Manrope",system-ui,sans-serif;',
        'position:relative;overflow:hidden}',
      '.lp-final-send::before{',
        'content:"";position:absolute;top:-40px;right:-40px;width:180px;height:180px;',
        'background:radial-gradient(circle,rgba(255,255,255,.55) 0%,transparent 70%);',
        'pointer-events:none}',
      '[data-lab-theme="dark"] .lp-final-send{',
        'background:linear-gradient(135deg,#2a1e0f 0%,#1c1408 100%);',
        'border-color:#b57a24;',
        'box-shadow:0 10px 34px rgba(0,0,0,.5)}',
      '.lp-final-title{',
        'font:800 clamp(1.2rem,3vw,1.55rem)/1.25 "Manrope",system-ui,sans-serif;',
        'color:#4a2d0a;margin:0 0 8px;letter-spacing:-.01em}',
      '[data-lab-theme="dark"] .lp-final-title{color:#f6d689}',
      '.lp-final-sub{',
        'font:500 clamp(.9rem,2vw,1rem)/1.55 "Manrope",system-ui,sans-serif;',
        'color:#7a5522;margin:0 auto 22px;max-width:600px}',
      '[data-lab-theme="dark"] .lp-final-sub{color:#c2a068}',
      '.lp-final-actions{',
        'display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap}',
      '.lp-final-btn{',
        'padding:15px 34px;border-radius:50px;border:0;',
        'background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;',
        'font:800 1rem/1 "Manrope",system-ui,sans-serif;letter-spacing:.02em;',
        'cursor:pointer;box-shadow:0 8px 22px rgba(217,119,6,.4);',
        'transition:transform .15s,box-shadow .15s}',
      '.lp-final-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(217,119,6,.5)}',
      '.lp-final-btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}',
      '.lp-final-hw-link{',
        'padding:14px 22px;border-radius:50px;',
        'background:transparent;color:#a06207;border:1.5px solid #d69836;',
        'font:700 .88rem/1 "Manrope",system-ui,sans-serif;letter-spacing:.02em;',
        'text-decoration:none;cursor:pointer;transition:background .15s,color .15s}',
      '.lp-final-hw-link:hover{background:#d69836;color:#fff}',
      '[data-lab-theme="dark"] .lp-final-hw-link{color:#e6b968;border-color:#a17124}',
      '[data-lab-theme="dark"] .lp-final-hw-link:hover{background:#a17124;color:#fff}',
      '.lp-final-status{',
        'margin-top:18px;font:700 .95rem/1.45 "Manrope",system-ui,sans-serif;',
        'padding:12px 18px;border-radius:12px;display:inline-block;min-width:280px}',
      '.lp-final-status.info{background:rgba(255,255,255,.5);color:#5a4014}',
      '.lp-final-status.ok{background:rgba(34,197,94,.14);color:#116a34;border:1.5px solid rgba(34,197,94,.3)}',
      '.lp-final-status.err{background:rgba(239,68,68,.14);color:#a02222;border:1.5px solid rgba(239,68,68,.3)}',
      '[data-lab-theme="dark"] .lp-final-status.info{background:rgba(0,0,0,.35);color:#e2c98f}',
      '[data-lab-theme="dark"] .lp-final-status.ok{background:rgba(34,197,94,.14);color:#7ee19e;border-color:rgba(34,197,94,.35)}',
      '[data-lab-theme="dark"] .lp-final-status.err{background:rgba(239,68,68,.14);color:#f79a9a;border-color:rgba(239,68,68,.35)}',
      /* Modal for name entry */
      '.lp-name-overlay{position:fixed;inset:0;background:rgba(20,15,40,.55);backdrop-filter:blur(8px);z-index:99998;display:flex;align-items:center;justify-content:center;animation:lpFadeIn .25s ease-out}',
      '@keyframes lpFadeIn{from{opacity:0}to{opacity:1}}',
      '.lp-name-modal{background:linear-gradient(135deg,#fef7ea 0%,#fde8b4 100%);border:2px solid #f5b83a;border-radius:20px;padding:28px 32px;max-width:440px;width:92vw;box-shadow:0 24px 60px rgba(217,119,6,.4);font-family:"Manrope",system-ui,sans-serif}',
      '.lp-name-modal h3{margin:0 0 6px;font:800 1.2rem/1.25 "Manrope",system-ui;color:#4a2d0a}',
      '.lp-name-modal p{margin:0 0 16px;font:500 .92rem/1.55 "Manrope",system-ui;color:#7a5522}',
      '.lp-name-input{width:100%;box-sizing:border-box;padding:13px 16px;border-radius:12px;border:1.5px solid #f5b83a;background:#fff;font:700 1rem/1.3 "Manrope",system-ui;color:#4a2d0a;outline:none;transition:border-color .15s}',
      '.lp-name-input:focus{border-color:#d97706;box-shadow:0 0 0 4px rgba(217,119,6,.14)}',
      '.lp-name-actions{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}',
      '.lp-name-btn{padding:11px 20px;border-radius:12px;border:0;cursor:pointer;font:700 .9rem/1 "Manrope",system-ui;transition:transform .15s,box-shadow .15s}',
      '.lp-name-cancel{background:transparent;color:#a06207;border:1.5px solid #d69836}',
      '.lp-name-ok{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff}',
      '.lp-name-ok:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(217,119,6,.42)}',
      '.lp-name-ok:disabled{opacity:.5;cursor:not-allowed}'
    ].join('');
    document.head.appendChild(st);
  }

  function askName(){
    return new Promise(function(resolve){
      var overlay = document.createElement('div');
      overlay.className = 'lp-name-overlay';
      overlay.innerHTML =
        '<div class="lp-name-modal">' +
          '<h3>Как тебя зовут?</h3>' +
          '<p>Учитель будет видеть твоё имя рядом с работой. Впишем один раз — дальше система запомнит.</p>' +
          '<input type="text" class="lp-name-input" placeholder="Например, Тимофей" maxlength="40">' +
          '<div class="lp-name-actions">' +
            '<button type="button" class="lp-name-btn lp-name-cancel">Отмена</button>' +
            '<button type="button" class="lp-name-btn lp-name-ok" disabled>Продолжить</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      var input = overlay.querySelector('.lp-name-input');
      var ok = overlay.querySelector('.lp-name-ok');
      var cancel = overlay.querySelector('.lp-name-cancel');
      setTimeout(function(){ input.focus(); }, 30);
      function finish(name){
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
      cancel.addEventListener('click', function(){ finish(''); });
    });
  }

  function inject(){
    if (skipPage()) return;
    injectStyle();

    var block = document.createElement('section');
    block.className = 'lp-final-send';
    block.setAttribute('data-lp-final-send', '1');
    block.setAttribute('aria-label', 'Отправить работу учителю');
    block.innerHTML =
      '<div class="lp-final-title">Готово! Отправить работу учителю?</div>' +
      '<div class="lp-final-sub">Учитель откроет твой урок у себя в кабинете и увидит всё что ты решил(а). Ничего фотографировать не нужно.</div>' +
      '<div class="lp-final-actions">' +
        '<button type="button" class="lp-final-btn">📤 Отправить учителю</button>' +
        '<a href="../.homework/?lesson=' + encodeURIComponent(location.pathname) + '" class="lp-final-hw-link">📚 Открыть мою домашку</a>' +
      '</div>' +
      '<div class="lp-final-status info" style="display:none">…</div>';

    /* Homework link — правильный относительный путь на .homework/index.html */
    var hwLink = block.querySelector('.lp-final-hw-link');
    var depth = (location.pathname.match(/\//g) || []).length - 2; /* /lingua-boost-lab/... */
    var relPrefix = '';
    /* /lingua-boost-lab/a1/a1-01-x.html → depth 3 → ../ */
    /* /lingua-boost-lab/b1/anyas-postcards/index.html → depth 4 → ../../ */
    /* Строим относительный путь от текущей страницы до /lingua-boost-lab/.homework/ */
    var here = location.pathname;
    var labIdx = here.indexOf('/lingua-boost-lab/');
    if (labIdx >= 0) {
      var afterLab = here.substring(labIdx + '/lingua-boost-lab/'.length);
      var parts = afterLab.split('/').filter(Boolean);
      /* последняя часть — html, её не считаем при подъёме */
      var upLevels = parts.length - 1;
      relPrefix = new Array(upLevels + 1).join('../');
    }
    hwLink.href = relPrefix + '.homework/?lesson=' + encodeURIComponent(location.pathname);

    document.body.appendChild(block);

    var btn = block.querySelector('.lp-final-btn');
    var status = block.querySelector('.lp-final-status');

    function setStatus(cls, text){
      status.className = 'lp-final-status ' + cls;
      status.style.display = '';
      status.textContent = text;
    }

    btn.addEventListener('click', async function(){
      btn.disabled = true;
      btn.textContent = '⏳ Отправляю…';
      setStatus('info', 'Собираю всё что ты сделал(а)…');

      try {
        /* Имя ученика */
        var name = '';
        try { name = localStorage.getItem('lab-student-name') || ''; } catch(e){}
        if (!name) {
          name = await askName();
          if (!name) {
            btn.disabled = false;
            btn.textContent = '📤 Отправить учителю';
            status.style.display = 'none';
            return;
          }
          try { localStorage.setItem('lab-student-name', name); } catch(e){}
        }
        var roomId = 'student-' + slugify(name);

        /* Snapshot из lab-persist v3 (если нет — пустой state) */
        var state = {};
        try {
          if (window.labPersist && typeof window.labPersist.snap === 'function') {
            state = window.labPersist.snap();
          }
        } catch(e){ state = {}; }

        var meta = scorePct(state);
        var stateKeys = Object.keys(state);

        /* Human-readable misses для teacher-live ленты */
        var misses = [];
        stateKeys.slice(0, 200).forEach(function(k){
          var s = state[k];
          var parts = [];
          if (s.c && s.c.length) parts.push(s.c.join(','));
          if (s.v) parts.push('=' + String(s.v).slice(0, 60));
          if (s.t) parts.push('«' + String(s.t).slice(0, 60) + '»');
          misses.push(k.slice(0, 60) + ' → ' + parts.join(' '));
        });

        /* Заголовок урока */
        var titleEl = document.querySelector('h1.hero-title, h1.friendly-title, .hero h1, h1');
        var title = (titleEl && titleEl.textContent || document.title || 'Lab lesson').replace(/\s+/g, ' ').trim().slice(0, 120);

        setStatus('info', 'Отправляю учителю…');

        /* Supabase SDK */
        var sb = await loadSDK();
        var client = sb.createClient(SUPABASE_URL, SUPABASE_ANON);

        /* 1. INSERT в lab_submissions как full-lesson-submit */
        var insRes = await client.from('lab_submissions').insert({
          room_id:       roomId,
          lesson_path:   location.pathname,
          section_id:    'full-lesson-submit',
          section_title: title.slice(0, 80),
          student_role:  'submit:' + name,
          score:         meta.score,
          total:         meta.total,
          misses:        misses
        });
        if (insRes && insRes.error) throw insRes.error;

        /* 2. Upsert lab_state — гарантированный snapshot для teacher-live «📥 state» */
        try {
          await client.from('lab_state').upsert({
            room_id:      roomId,
            lesson_path:  location.pathname,
            state:        state,
            score:        meta.score,
            total:        meta.total,
            pct:          meta.pct,
            last_section: null,
            name:         name
          }, { onConflict: 'room_id,lesson_path' });
        } catch(e){ /* silent — не блокируем UX если lab_state недоступна */ }

        /* 3. Broadcast firehose section-submit → teacher-live лента */
        try {
          var ch = client.channel('lab-firehose-v1', { config: { broadcast: { self: false }}});
          await new Promise(function(res){
            var done = false;
            ch.subscribe(function(status){
              if (!done && status === 'SUBSCRIBED') { done = true; res(); }
            });
            setTimeout(function(){ if (!done) { done = true; res(); } }, 2500);
          });
          ch.send({
            type: 'broadcast', event: 'section-submit',
            payload: {
              room_id: roomId, name: name, role: 'submit:' + name,
              lesson_path:   location.pathname,
              lesson_title:  title,
              section_id:    'full-lesson-submit',
              section_title: title.slice(0, 80),
              score:         meta.score, total: meta.total,
              ts:            Date.now()
            }
          });
        } catch(e){ /* silent */ }

        /* Success */
        btn.disabled = true;
        btn.textContent = '✓ Отправлено!';
        var msg;
        if (meta.total > 0) {
          msg = '✓ Готово! Учитель уже видит твою работу — ' + meta.score + '/' + meta.total +
                (meta.pct != null ? ' (' + meta.pct + '%)' : '') + '. Молодец!';
        } else {
          msg = '✓ Отправила учителю что ты открывал(а) урок. В следующий раз реши хотя бы одно упражнение 😊';
        }
        setStatus('ok', msg);
      } catch(err){
        var msg = (err && err.message) || String(err);
        btn.disabled = false;
        btn.textContent = '📤 Попробовать ещё раз';
        if (/lab_submissions/i.test(msg) || /42P01/i.test(msg)) {
          setStatus('err', '⚠ Не долетело. Может быть проблема с интернетом. Попробуй ещё раз через минуту.');
        } else {
          setStatus('err', '⚠ Не удалось отправить: ' + msg.slice(0, 120));
        }
      }
    });
  }

  ready(function(){
    /* Wait a beat так чтобы lab-persist + другие модули поднялись первыми
       и мы могли снепшотить их state honestly */
    setTimeout(inject, 400);
  });
})();
