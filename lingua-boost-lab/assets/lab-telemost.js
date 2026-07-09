/* lab-telemost.js v1 · 2026-07-09
   Floating FAB 🎥 top-right — one-tap вход в Yandex Telemost комнату
   Марии. Одна persistent-ссылка на все уроки.

   Правила:
   - Не работает в observer/teacher-mode (у Марии свой поток).
   - На mobile — сжимается до 36×36, чтоб не залезать на .topbar.
   - Skip если ученик уже открыл вкладку (localStorage flag на 45 минут).
*/
(function(){
  if (window.__labTelemostLoaded) return;
  window.__labTelemostLoaded = true;

  var URL = 'https://telemost.yandex.ru/j/03400912122761';
  var LABEL = '🎥 Урок';
  var TITLE = 'Открыть Яндекс Телемост — урок с Марией';

  // Observer / teacher-режимы — не показываем (у Марии свой поток)
  if (/[?&](observe|role=teacher|as=teacher)/.test(location.search)) return;

  function injectStyle(){
    if (document.getElementById('lab-telemost-style')) return;
    var s = document.createElement('style');
    s.id = 'lab-telemost-style';
    s.textContent =
      '.lab-telemost-fab{position:fixed;top:16px;right:16px;z-index:1000;'+
        'background:linear-gradient(135deg,#ff5a1f,#ff8c42);color:#fff;'+
        'border:0;border-radius:999px;padding:10px 16px;'+
        'font:800 12px/1 "JetBrains Mono","Manrope",monospace;letter-spacing:.10em;'+
        'box-shadow:0 8px 24px rgba(255,90,31,.42),0 0 0 2px rgba(255,255,255,.16) inset;'+
        'cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;'+
        'transition:all .18s ease-out;user-select:none;-webkit-tap-highlight-color:transparent}'+
      '.lab-telemost-fab:hover{transform:translateY(-2px);'+
        'box-shadow:0 14px 30px rgba(255,90,31,.55),0 0 0 2px rgba(255,255,255,.24) inset}'+
      '.lab-telemost-fab:active{transform:translateY(0)}'+
      '.lab-telemost-fab.live{animation:lab-tm-pulse 1.6s ease-in-out infinite}'+
      '@keyframes lab-tm-pulse{'+
        '0%,100%{box-shadow:0 8px 24px rgba(255,90,31,.42),0 0 0 2px rgba(255,255,255,.16) inset}'+
        '50%{box-shadow:0 8px 24px rgba(255,90,31,.42),0 0 0 6px rgba(255,140,66,.32),0 0 0 2px rgba(255,255,255,.24) inset}'+
      '}'+
      // Пропускаем topbar (canon-l-topbar / audience-switch на десктопе) — smaller offset
      '@media(min-width:820px){.lab-telemost-fab{top:66px;right:24px}}'+
      // Mobile: компактный, только иконка если места мало
      '@media(max-width:400px){.lab-telemost-fab{padding:8px 12px;font-size:11px;top:12px;right:12px}}'+
      // Prefer-dark контраст
      '[data-theme="black-lab"] .lab-telemost-fab,'+
      '[data-lab-theme="dark"] .lab-telemost-fab{box-shadow:0 8px 24px rgba(255,90,31,.55),0 0 0 2px rgba(0,0,0,.32) inset}';
    document.head.appendChild(s);
  }

  function build(){
    if (document.querySelector('.lab-telemost-fab')) return;
    var a = document.createElement('a');
    a.className = 'lab-telemost-fab live';
    a.href = URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = TITLE;
    a.setAttribute('aria-label', TITLE);
    a.textContent = LABEL;
    document.body.appendChild(a);
  }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function(){ injectStyle(); build(); });
})();
