/* ══════════════════════════════════════════════════════════════════
   mobile-compact.js · shared mobile behaviour для всех уроков lab
   v1 · 2026-07-14
   1. Inject бургер `☰` перед .canon-l-nav — сворачивает категории
   2. Inject кнопка `1` в .lesson-tabs — раскрывает .lp-toc (лифт)
   3. Клик вне лифта / клик по .lp-toc-btn — закрывает лифт
   Все действия только при viewport <=640px, safe для десктопа.
   ══════════════════════════════════════════════════════════════════ */
(function(){
  var mm = window.matchMedia('(max-width:640px)');

  function injectBurger(){
    if (!mm.matches) return;
    var nav = document.querySelector('.canon-l-nav');
    if (!nav || document.querySelector('.mobile-burger')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-burger';
    btn.setAttribute('aria-label', 'Меню разделов');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '☰';
    btn.onclick = function(){
      var o = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', o);
      btn.textContent = o ? '✕' : '☰';
    };
    nav.parentNode.insertBefore(btn, nav);
  }

  function injectLiftBtn(){
    if (!mm.matches) return;
    var toc = document.querySelector('.lp-toc');
    var tabs = document.querySelector('.lesson-tabs');
    if (!toc || !tabs || document.querySelector('.lp-toc-mobile-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lp-toc-mobile-btn';
    btn.setAttribute('aria-label', 'Оглавление урока');
    btn.textContent = '1';
    btn.onclick = function(e){
      e.stopPropagation();
      var isOpen = toc.classList.toggle('is-open');
      btn.textContent = isOpen ? '✕' : '1';
    };
    tabs.appendChild(btn);
  }

  function ensure(){ injectBurger(); injectLiftBtn(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }
  setTimeout(ensure, 500);
  setTimeout(ensure, 1500);
  setTimeout(ensure, 3000);

  document.addEventListener('click', function(e){
    if (!mm.matches) return;
    var toc = document.querySelector('.lp-toc.is-open');
    if (!toc) return;
    if (e.target.closest('.lp-toc-btn')){
      setTimeout(function(){
        toc.classList.remove('is-open');
        var b = document.querySelector('.lp-toc-mobile-btn'); if (b) b.textContent = '1';
      }, 200);
      return;
    }
    if (!e.target.closest('.lp-toc') && !e.target.closest('.lp-toc-mobile-btn')){
      toc.classList.remove('is-open');
      var b = document.querySelector('.lp-toc-mobile-btn'); if (b) b.textContent = '1';
    }
  }, true);
})();
