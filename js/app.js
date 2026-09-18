(function () {
  var THEME_KEY = 'pls-theme';
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var savedTheme = localStorage.getItem(THEME_KEY);
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', savedTheme || systemTheme);

  themeToggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });

  var adminGear = document.getElementById('adminGear');
  var adminGate = document.getElementById('adminGate');
  var adminGateInput = document.getElementById('adminGateInput');
  var adminGateGo = document.getElementById('adminGateGo');
  var adminGateErr = document.getElementById('adminGateErr');

  adminGear.addEventListener('click', function () {
    adminGate.hidden = !adminGate.hidden;
    if (!adminGate.hidden) { adminGateInput.value = ''; adminGateErr.hidden = true; adminGateInput.focus(); }
  });

  function tryAdminKey() {
    if (adminGateInput.value.trim().toLowerCase() === 'pls') {
      window.location.href = 'admin.html';
    } else {
      adminGateErr.hidden = false;
      adminGateInput.focus();
    }
  }
  adminGateGo.addEventListener('click', tryAdminKey);
  adminGateInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryAdminKey();
    if (e.key === 'Escape') adminGate.hidden = true;
  });
  document.addEventListener('click', function (e) {
    if (!adminGate.hidden && !adminGate.contains(e.target) && e.target !== adminGear && !adminGear.contains(e.target)) {
      adminGate.hidden = true;
    }
  });

  var q = document.getElementById('q');
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
      empty.hidden = true;
      return;
    }
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

  // ---------- copia de seguridad (json / xlsx con imágenes) ----------
  var PANEL_LABELS = { plscadd: 'PLS-CADD', otras: 'Otras acciones', plspole: 'PLS-POLE' };

  function today() { return new Date().toISOString().slice(0, 10); }

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function withBusy(btn, label, work) {
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    work().catch(function () { btn.textContent = 'No se pudo generar'; return new Promise(function (r) { setTimeout(r, 2500); }); })
      .then(function () { btn.disabled = false; btn.textContent = orig; });
  }

  function loadExcelJs() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'js/vendor/exceljs.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function fetchImage(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path);
      return r.blob();
    }).then(function (blob) {
      return Promise.all([blob.arrayBuffer(), createImageBitmap(blob)]).then(function (res) {
        var ext = /\.png$/i.test(path) ? 'png' : 'jpeg';
        return { buffer: res[0], ext: ext, w: res[1].width, h: res[1].height };
      });
    }).catch(function () { return null; });
  }

  function buildXlsx(data) {
    var wb = new ExcelJS.Workbook();
    var MAX_W = 230, MAX_H = 150;
    var jobs = [];
    Object.keys(PANEL_LABELS).forEach(function (key) {
      var ws = wb.addWorksheet(PANEL_LABELS[key]);
      ws.columns = [
        { header: 'N.º', width: 6 }, { header: 'Título', width: 42 },
        { header: 'Ruta de menú', width: 38 }, { header: 'Comentario', width: 55 },
        { header: 'Capturas', width: 34 }
      ];
      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      var n = 0;
      (data[key] || []).forEach(function (group) {
        var g = ws.addRow([group.title + (group.desc ? ' — ' + group.desc : '')]);
        ws.mergeCells(g.number, 1, g.number, 5);
        g.font = { bold: true, size: 12 };
        g.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEBE2' } };
        (group.steps || []).forEach(function (step) {
          if (!step.sub) n++;
          var comment = step.commentList && step.commentList.length
            ? step.commentList.map(function (l) { return '- ' + l; }).join('\n') : (step.comment || '');
          var row = ws.addRow([step.sub ? '·' : n, step.title, step.route ? step.route.copy : '', comment]);
          row.alignment = { vertical: 'top', wrapText: true };
          (step.images || []).forEach(function (path, i) {
            jobs.push(fetchImage(path).then(function (img) {
              if (!img) return;
              var k = Math.min(MAX_W / img.w, MAX_H / img.h, 1);
              var w = Math.round(img.w * k), h = Math.round(img.h * k);
              var id = wb.addImage({ buffer: img.buffer, extension: img.ext });
              ws.addImage(id, { tl: { col: 4, row: row.number - 1 + 0.02 }, ext: { width: w, height: h } });
              row.height = Math.max(row.height || 0, h * 0.75 + 6);
            }));
          });
        });
      });
    });
    return Promise.all(jobs).then(function () { return wb.xlsx.writeBuffer(); });
  }

  document.getElementById('dlJson').addEventListener('click', function () {
    withBusy(this, 'Preparando…', function () {
      return fetch('steps.json').then(function (r) { return r.blob(); }).then(function (b) {
        saveBlob(b, 'PathPLS-respaldo-' + today() + '.json');
      });
    });
  });

  document.getElementById('dlXlsx').addEventListener('click', function () {
    withBusy(this, 'Generando Excel…', function () {
      return Promise.all([loadExcelJs(), fetch('steps.json').then(function (r) { return r.json(); })])
        .then(function (res) { return buildXlsx(res[1]); })
        .then(function (buf) {
          saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'PathPLS-guia-' + today() + '.xlsx');
        });
    });
  });

  // ---------- render dinámico de tarjetas desde steps.json ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderComment(step) {
    if (step.commentList && step.commentList.length) {
      return '<ul class="cmt">' + step.commentList.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>';
    }
    if (step.comment) {
      return '<p class="cmt">' + esc(step.comment).replace(/&lt;br&gt;/g, '<br>') + '</p>';
    }
    return '';
  }

  function renderRoute(step) {
    if (!step.route) {
      return '<div class="route" data-copy="N/A"><span class="noroute">Sin ruta de menú</span></div>';
    }
    var linesHtml = step.route.lines.map(function (line) {
      var parts = line.alt ? ['<span class="alt">o</span>'] : [];
      line.segments.forEach(function (seg, i) {
        if (i > 0) parts.push('<span class="sep">›</span>');
        parts.push('<span>' + esc(seg) + '</span>');
      });
      return '<div class="routeline">' + parts.join('') + '</div>';
    }).join('');
    return '<div class="route" data-copy="' + esc(step.route.copy) + '">' + linesHtml + '</div>';
  }

  function renderStep(id, step, num) {
    var hasImages = step.images && step.images.length > 0;
    var numHtml = step.sub ? '<span class="num sub">·</span>' : '<span class="num">' + num + '</span>';
    var titleHtml = esc(step.title);
    var head = hasImages
      ? '<button class="step-head" type="button" aria-expanded="false" aria-controls="b-' + id + '">' + numHtml + '<h3>' + titleHtml + '</h3><span class="seehint">Ver captura</span><svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><polyline points="5.5,8 10,12.5 14.5,8"></polyline></svg></button>'
      : '<div class="step-head plain">' + numHtml + '<h3>' + titleHtml + '</h3></div>';
    var body = '';
    if (hasImages) {
      var thumbs = step.images.map(function (img) {
        return '<button class="thumb" type="button" data-full="' + esc(img) + '" aria-label="Ampliar captura"><img src="' + esc(img) + '" alt="Captura del paso: ' + titleHtml + '" loading="lazy"></button>';
      }).join('');
      body = '<div class="step-body" id="b-' + id + '" hidden><div class="shots">' + thumbs + '</div></div>';
    }
    var searchBits = [step.title, step.route ? step.route.copy : '', step.comment || '', (step.commentList || []).join(' ')];
    var dataQ = esc(searchBits.join(' '));
    return '<article class="step' + (hasImages ? ' has-detail' : '') + '" id="' + id + '" data-q="' + dataQ + '">' +
      head + renderRoute(step) + renderComment(step) + body + '</article>';
  }

  function renderGroup(panelId, gi, group, counter) {
    var stepsHtml = group.steps.map(function (step, si) {
      if (!step.sub) counter.n++;
      return renderStep(panelId + '-' + gi + '-' + si, step, counter.n);
    }).join('');
    return '<section class="group" data-group>' +
      '<header class="group-head"><h2>' + esc(group.title) + '</h2><p>' + esc(group.desc) + '</p><span class="gcount">' + group.steps.length + ' pasos</span></header>' +
      '<div class="steps">' + stepsHtml + '</div></section>';
  }

  function renderPanel(panelId, groups) {
    var el = document.getElementById('panel-' + panelId);
    if (!el) return;
    var counter = { n: 0 };
    el.innerHTML = groups.map(function (group, gi) { return renderGroup(panelId, gi, group, counter); }).join('');
  }

  fetch('steps.json').then(function (r) { return r.json(); }).then(function (data) {
    ['plscadd', 'otras', 'plspole'].forEach(function (panelId) {
      renderPanel(panelId, data[panelId] || []);
    });
    activate('plscadd');
  }).catch(function () {
    activate('plscadd');
  });
})();
