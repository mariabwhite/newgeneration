/* lab-send-pill.js v2 · 2026-07-10
   Блок «📤 Отправить учителю» теперь живёт ТОЛЬКО внутри .homework/index.html.
   В основных Lab-уроках блок не показывается — ученик решает урок, набирает
   задания в свою «мою домашку» через lab-homework, приходит на страницу
   домашки → там уже в конце его ждёт финальная кнопка отправки учителю.
   На страницах уроков нет ничего — визуально чище, ничего не путается.

   Собирает labPersist.snap() → INSERT в lab_submissions (section_id='full-lesson-submit')
   + upsert lab_state + broadcast firehose. Ничего другого.
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
    /* v4 2026-07-12 · fallback chain — vendor локал → jsdelivr → unpkg.
       Используется для broadcast'а в realtime channel (INSERT идёт direct fetch
       без SDK). Если SDK не грузится — INSERT всё равно прошёл, просто teacher-live
       не получит push-события в моменте (увидит через SELECT lab_submissions). */
    var SOURCES = [
      '/lingua-boost-lab/assets/vendor/supabase.js',
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
    ];
    return new Promise(function(resolve, reject){
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var idx = 0;
      function tryNext(){
        if (idx >= SOURCES.length) return reject(new Error('sdk fail · all CDN paths dead'));
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
    /* v2: SHOW only inside .homework/ pages. Everywhere else — hide. */
    if (!/\/\.homework\//.test(location.pathname)) return true;
    /* Teacher/observe modes still skip even on homework page */
    if (/[?&]observe=/.test(location.search)) return true;
    if (/[?&]teacher=on/.test(location.search)) return true;
    /* Skip if page already has a manual send block */
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
      '<div class="lp-final-title">Готово! Отправить домашку учителю?</div>' +
      '<div class="lp-final-sub">Учитель увидит всё что ты сделал(а) прямо в кабинете. Ничего фотографировать не нужно.</div>' +
      '<div class="lp-final-actions">' +
        '<button type="button" class="lp-final-btn">📤 Отправить учителю</button>' +
      '</div>' +
      '<div class="lp-final-status info" style="display:none">…</div>';

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
            // v3 2026-07-12: раньше status.style.display='none' — ученик кликал,
            // жал «Отмена» в модалке и не понимал что произошло. Теперь warning.
            btn.disabled = false;
            btn.textContent = '📤 Отправить учителю';
            setStatus('info', 'Учитель должен знать чья работа — впиши имя и нажми ещё раз.');
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

        /* v3 2026-07-12: direct REST fetch вместо supabase-js SDK.
           Причина: SDK грузился с cdn.jsdelivr.net, у ряда учеников CDN резался
           (РФ-block / AdBlock / корпоративный proxy) → SDK не подключался →
           `sb.createClient` падал → кнопка молча писала «Не долетело».
           За 48ч в БД 0 записей `full-lesson-submit` — при этом event-sourced
           push от lab-homework.js (тоже direct fetch) РАБОТАЕТ.
           Значит убираем SDK, идём тем же direct-fetch путём. */

        var restHeaders = {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: 'Bearer ' + SUPABASE_ANON,
          Prefer: 'return=minimal'
        };

        /* 1. INSERT в lab_submissions как full-lesson-submit */
        var insRes = await fetch(SUPABASE_URL + '/rest/v1/lab_submissions', {
          method: 'POST',
          headers: restHeaders,
          body: JSON.stringify({
            room_id:       roomId,
            lesson_path:   location.pathname,
            section_id:    'full-lesson-submit',
            section_title: title.slice(0, 80),
            student_role:  'submit:' + name,
            score:         meta.score,
            total:         meta.total,
            misses:        misses
          })
        });
        if (!insRes.ok) {
          var errText = '';
          try { errText = await insRes.text(); } catch(_){}
          throw new Error(insRes.status + ' ' + insRes.statusText + (errText ? ' · ' + errText.slice(0,120) : ''));
        }

        /* 2. Upsert lab_state — гарантированный snapshot для teacher-live «📥 state».
              PostgREST upsert: header Prefer:'resolution=merge-duplicates' +
              on-conflict через query param on_conflict. */
        try {
          await fetch(
            SUPABASE_URL + '/rest/v1/lab_state?on_conflict=room_id,lesson_path',
            {
              method: 'POST',
              headers: Object.assign({}, restHeaders, {
                Prefer: 'resolution=merge-duplicates,return=minimal'
              }),
              body: JSON.stringify({
                room_id:      roomId,
                lesson_path:  location.pathname,
                state:        state,
                score:        meta.score,
                total:        meta.total,
                pct:          meta.pct,
                last_section: null,
                name:         name
              })
            }
          );
        } catch(e){ /* silent — не блокируем UX если lab_state недоступна */ }

        /* 3. Broadcast firehose section-submit → teacher-live лента.
              Возвращаем SDK channel — REST /realtime/v1/api/broadcast НЕ доставляет
              subscribed clients в стандартном режиме (нужны Realtime Auth policies).
              SDK broadcast работает надёжно. Vendor-локал (см. loadSDK) обеспечивает
              что SDK загружается без CDN. */
        try {
          var sb = await loadSDK();
          var client = sb.createClient(SUPABASE_URL, SUPABASE_ANON);
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
        } catch(e){ /* silent — INSERT уже прошёл, teacher-live увидит через SELECT poll */ }

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
