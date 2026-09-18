(function () {
  var q = document.getElementById('q');
  var stCount = document.getElementById('stCount');
  var stShots = document.getElementById('stShots');
  var stats = document.getElementById('stats');
  var empty = document.getElementById('empty');
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var current = 'plscadd';

  function activate(id) {
    current = id;
    tabs.forEach(function (t) {
      var on = t.dataset.tab === id;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) { p.classList.toggle('on', p.id === 'panel-' + id); });
    closeAll(null);
    filter();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { activate(t.dataset.tab); });
  });

  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function filter() {
    var term = norm(q.value.trim());
    var panel = document.getElementById('panel-' + current);
    if (!panel) return;
    var steps = panel.querySelectorAll('.step');

    if (!steps.length) {                       // panel "De interés": sin filtro
      stCount.textContent = 'Referencias';
      stShots.hidden = true;
      empty.hidden = true;
      return;
    }
    stShots.hidden = false;
    var shown = 0;
    steps.forEach(function (s) {
      var match = !term || norm(s.dataset.q).indexOf(term) !== -1;
      s.hidden = !match;
      if (match) shown++;
    });
    panel.querySelectorAll('[data-group]').forEach(function (g) {
      var vis = g.querySelectorAll('.step:not([hidden])').length;
      var all = g.querySelectorAll('.step').length;
      g.hidden = vis === 0;
      var c = g.querySelector('.gcount');
      if (c) c.textContent = (term && vis !== all ? vis + ' de ' + all : all) + ' pasos';
    });
    var shots = panel.querySelectorAll('.step:not([hidden]) .thumb').length;
    stCount.textContent = term
      ? shown + ' de ' + steps.length + ' pasos'
      : steps.length + ' pasos';
    stShots.textContent = shots + (shots === 1 ? ' captura' : ' capturas');
    stats.classList.toggle('filtering', !!term);
    empty.hidden = shown !== 0;
  }

  q.addEventListener('input', function () { closeAll(null); filter(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== q) {
      e.preventDefault(); q.focus(); q.select();
    }
    if (e.key === 'Escape') {
      if (!lb.hidden) { closeLb(); }
      else if (document.querySelector('.step.open')) { closeAll(null); }
      else if (document.activeElement === q) { q.value = ''; filter(); q.blur(); }
    }
  });

  // acordeón: abrir una tarjeta cierra la anterior
  function closeAll(except) {
    document.querySelectorAll('.step.open').forEach(function (s) {
      if (s === except) return;
      s.classList.remove('open');
      var h = s.querySelector('.step-head');
      var b = s.querySelector('.step-body');
      if (h) h.setAttribute('aria-expanded', 'false');
      if (b) b.hidden = true;
    });
  }

  document.addEventListener('click', function (e) {
    var head = e.target.closest('button.step-head');
    if (!head) return;
    var step = head.closest('.step');
    var body = step.querySelector('.step-body');
    var willOpen = !step.classList.contains('open');
    var before = step.getBoundingClientRect().top;

    closeAll(willOpen ? step : null);
    step.classList.toggle('open', willOpen);
    head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (body) body.hidden = !willOpen;

    // si cerrar la tarjeta anterior desplazó ésta, recolocarla bajo la barra
    if (willOpen) {
      var after = step.getBoundingClientRect().top;
      if (after !== before) window.scrollBy(0, after - before);
      var top = step.getBoundingClientRect().top;
      var bar = document.querySelector('.controls');
      var barH = bar ? bar.getBoundingClientRect().height : 0;
      if (top < barH + 8) window.scrollBy({ top: top - barH - 14, behavior: 'smooth' });
    }
  });

  // copiar ruta al portapapeles
  document.addEventListener('click', function (e) {
    var r = e.target.closest('.route');
    if (!r || !r.dataset.copy) return;
    var txt = r.dataset.copy;
    var done = function () {
      r.classList.add('copied');
      setTimeout(function () { r.classList.remove('copied'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }
  });

  // lightbox
  var lb = document.getElementById('lb');
  var lbimg = document.getElementById('lbimg');
  function closeLb() { lb.hidden = true; lbimg.removeAttribute('src'); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.thumb');
    if (t) { lbimg.src = t.dataset.full; lb.hidden = false; return; }
    if (e.target === lb || e.target.id === 'lbclose') closeLb();
  });

  activate('plscadd');
})();
