/* ============================================================
   LinguaBoost Lab · TOUCH DnD POLYFILL
   Bridges HTML5 drag-and-drop to touch events on iOS/Android.
   Safe to load on every lesson — only activates when touch
   gestures are detected on elements with [draggable="true"].
   ============================================================ */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Skip if no touch support (desktop) — native HTML5 DnD works there
  if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

  var dragEl = null;       // original element being dragged
  var ghost = null;        // floating clone visible under finger
  var lastTarget = null;   // element currently under finger
  var startX = 0, startY = 0;
  var moved = false;
  var moveThreshold = 6;   // pixels before treating as drag (lets taps through)
  var dataStore = {};      // emulated DataTransfer.getData/setData

  function buildDataTransfer() {
    var dt = {
      _data: dataStore,
      effectAllowed: 'all',
      dropEffect: 'move',
      types: [],
      setData: function (type, val) {
        this._data[type] = String(val);
        if (this.types.indexOf(type) < 0) this.types.push(type);
      },
      getData: function (type) {
        return this._data[type] || '';
      },
      clearData: function (type) {
        if (type) delete this._data[type];
        else { this._data = {}; this.types.length = 0; }
      },
      setDragImage: function () {}
    };
    return dt;
  }

  var sharedDT = null;

  function fireEvent(target, type, x, y) {
    if (!target) return false;
    var ev;
    try {
      ev = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        dataTransfer: sharedDT
      });
    } catch (e) {
      // Older Safari: DragEvent constructor may not accept dataTransfer
      ev = document.createEvent('Event');
      ev.initEvent(type, true, true);
      ev.clientX = x;
      ev.clientY = y;
    }
    // Patch dataTransfer if not assigned by constructor
    try { if (!ev.dataTransfer) Object.defineProperty(ev, 'dataTransfer', { value: sharedDT, writable: false }); } catch (e) {}
    return target.dispatchEvent(ev);
  }

  function findDraggable(el) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('draggable') === 'true') return el;
      el = el.parentNode;
    }
    return null;
  }

  function makeGhost(el, x, y) {
    var rect = el.getBoundingClientRect();
    var clone = el.cloneNode(true);
    clone.classList.add('dnd-touch-dragging');
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.left = x + 'px';
    clone.style.top = y + 'px';
    document.body.appendChild(clone);
    return clone;
  }

  function elementUnderTouch(x, y) {
    if (ghost) ghost.style.display = 'none';
    var el = document.elementFromPoint(x, y);
    if (ghost) ghost.style.display = '';
    return el;
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    var d = findDraggable(t.target);
    if (!d) return;
    dragEl = d;
    startX = t.clientX;
    startY = t.clientY;
    moved = false;
    dataStore = {};
    sharedDT = buildDataTransfer();
  }

  function onTouchMove(e) {
    if (!dragEl) return;
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    if (!moved) {
      if (Math.abs(dx) < moveThreshold && Math.abs(dy) < moveThreshold) return;
      moved = true;
      // fire dragstart now
      fireEvent(dragEl, 'dragstart', t.clientX, t.clientY);
      ghost = makeGhost(dragEl, t.clientX, t.clientY);
    }
    e.preventDefault();
    if (ghost) {
      ghost.style.left = t.clientX + 'px';
      ghost.style.top = t.clientY + 'px';
    }
    var under = elementUnderTouch(t.clientX, t.clientY);
    if (under !== lastTarget) {
      if (lastTarget) {
        fireEvent(lastTarget, 'dragleave', t.clientX, t.clientY);
        lastTarget.classList.remove('dnd-drop-target');
      }
      lastTarget = under;
      if (lastTarget) {
        fireEvent(lastTarget, 'dragenter', t.clientX, t.clientY);
      }
    }
    if (lastTarget) {
      var allowed = !fireEvent(lastTarget, 'dragover', t.clientX, t.clientY);
      // If preventDefault was called (return false from fireEvent), it's a valid dropzone
      if (allowed) lastTarget.classList.add('dnd-drop-target');
    }
  }

  function onTouchEnd(e) {
    if (!dragEl) return;
    var t = (e.changedTouches && e.changedTouches[0]) || null;
    var x = t ? t.clientX : startX;
    var y = t ? t.clientY : startY;
    if (moved) {
      var under = lastTarget || elementUnderTouch(x, y);
      if (under) {
        fireEvent(under, 'drop', x, y);
        under.classList.remove('dnd-drop-target');
      }
      fireEvent(dragEl, 'dragend', x, y);
    }
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    if (lastTarget) lastTarget.classList.remove('dnd-drop-target');
    dragEl = null; ghost = null; lastTarget = null;
    sharedDT = null;
    moved = false;
  }

  function onTouchCancel() {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    if (lastTarget) lastTarget.classList.remove('dnd-drop-target');
    dragEl = null; ghost = null; lastTarget = null;
    sharedDT = null;
    moved = false;
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchCancel, { passive: true });
})();
