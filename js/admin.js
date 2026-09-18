(function () {
  var PANELS = [
    { id: 'plscadd', label: 'PLS-CADD' },
    { id: 'otras', label: 'Otras acciones' },
    { id: 'plspole', label: 'PLS-POLE' }
  ];

  var state = { data: null, sha: null, panel: 'plscadd' };

  var els = {
    token: document.getElementById('token'),
    owner: document.getElementById('owner'),
    repo: document.getElementById('repo'),
    branch: document.getElementById('branch'),
    path: document.getElementById('path'),
    loadBtn: document.getElementById('loadBtn'),
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status'),
    commitMsg: document.getElementById('commitMsg'),
    tabs: document.getElementById('tabsAdmin'),
    editor: document.getElementById('editorRoot')
  };

  // ---------- persistencia local de config (nunca se envía a ningún lado salvo GitHub) ----------
  ['token', 'owner', 'repo', 'branch', 'path'].forEach(function (k) {
    var saved = localStorage.getItem('gh_admin_' + k);
    if (saved) els[k].value = saved;
    els[k].addEventListener('change', function () { localStorage.setItem('gh_admin_' + k, els[k].value); });
  });
  if (!els.owner.value) els.owner.value = 'wpzprojects';
  if (!els.repo.value) els.repo.value = 'PathPLS';
  if (!els.branch.value) els.branch.value = 'main';
  if (!els.path.value) els.path.value = 'steps.json';

  function setStatus(msg, kind) {
    els.status.textContent = msg;
    els.status.className = 'admin-status' + (kind ? ' ' + kind : '');
  }

  // ---------- base64 UTF-8 safe ----------
  function toBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  function fromBase64(b64) {
    var binary = atob(b64.replace(/\n/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function apiUrl() {
    return 'https://api.github.com/repos/' + els.owner.value.trim() + '/' + els.repo.value.trim() +
      '/contents/' + els.path.value.trim() + '?ref=' + encodeURIComponent(els.branch.value.trim());
  }

  // ---------- parsing texto <-> estructura ----------
  function parseRouteText(text) {
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return null;
    var parsed = lines.map(function (line, i) {
      var alt = false;
      if (i > 0 && /^o\s+/i.test(line)) { alt = true; line = line.replace(/^o\s+/i, ''); }
      var segments = line.split('>').map(function (s) { return s.trim(); }).filter(Boolean);
      return { alt: alt, segments: segments };
    });
    var copy = parsed.map(function (l) { return (l.alt ? 'o ' : '') + l.segments.join(' > '); }).join('\n');
    return { copy: copy, lines: parsed };
  }
  function routeToText(route) {
    if (!route) return '';
    return route.lines.map(function (l) { return (l.alt ? 'o ' : '') + l.segments.join(' > '); }).join('\n');
  }
  function parseCommentText(text) {
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length > 1 && lines.every(function (l) { return l.indexOf('- ') === 0; })) {
      return { comment: '', commentList: lines.map(function (l) { return l.slice(2); }) };
    }
    return { comment: text.trim(), commentList: null };
  }
  function commentToText(step) {
    if (step.commentList && step.commentList.length) return step.commentList.map(function (l) { return '- ' + l; }).join('\n');
    return step.comment || '';
  }
  function imagesToText(step) { return (step.images || []).join(', '); }
  function parseImagesText(text) {
    return text.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // ---------- carga desde GitHub ----------
  els.loadBtn.addEventListener('click', function () {
    if (!els.token.value.trim()) { setStatus('Falta el token de GitHub.', 'err'); return; }
    setStatus('Cargando desde GitHub…');
    fetch(apiUrl(), {
      headers: { 'Authorization': 'Bearer ' + els.token.value.trim(), 'Accept': 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (json) {
      state.data = JSON.parse(fromBase64(json.content));
      ensureCids(state.data);
      state.sha = json.sha;
      setStatus('Cargado correctamente desde GitHub.', 'ok');
      renderTabs();
      renderPanel();
    }).catch(function (err) {
      setStatus('Error al cargar: ' + err.message, 'err');
    });
  });

  // ---------- guardado en GitHub ----------
  els.saveBtn.addEventListener('click', function () {
    if (!state.data) { setStatus('Primero carga los datos desde GitHub.', 'err'); return; }
    if (!els.token.value.trim()) { setStatus('Falta el token de GitHub.', 'err'); return; }
    var msg = els.commitMsg.value.trim() || 'Actualizar pasos de la guía';
    setStatus('Guardando en GitHub…');
    var body = {
      message: msg,
      content: toBase64(JSON.stringify(stripCids(state.data), null, 2)),
      sha: state.sha,
      branch: els.branch.value.trim()
    };
    fetch(apiUrl().split('?')[0], {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + els.token.value.trim(),
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 409) throw new Error('Conflicto: alguien más guardó cambios. Vuelve a cargar antes de guardar.');
      if (!r.ok) return r.json().then(function (j) { throw new Error((j && j.message) || ('HTTP ' + r.status)); });
      return r.json();
    }).then(function (json) {
      state.sha = json.content.sha;
      setStatus('Guardado en GitHub correctamente.', 'ok');
    }).catch(function (err) {
      setStatus('Error al guardar: ' + err.message, 'err');
    });
  });

  // ---------- tabs ----------
  function renderTabs() {
    els.tabs.innerHTML = PANELS.map(function (p) {
      return '<button type="button" class="tab' + (p.id === state.panel ? ' on' : '') + '" data-panel="' + p.id + '"><b>' + p.label + '</b></button>';
    }).join('');
  }
  els.tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-panel]');
    if (!b) return;
    state.panel = b.dataset.panel;
    renderTabs();
    renderPanel();
  });

  // ---------- render del panel activo ----------
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function newCid() { return 'c' + Math.random().toString(36).slice(2, 10); }
  function ensureCids(data) {
    Object.keys(data).forEach(function (panelId) {
      (data[panelId] || []).forEach(function (g) {
        if (!g._cid) g._cid = newCid();
        (g.steps || []).forEach(function (s) { if (!s._cid) s._cid = newCid(); });
      });
    });
  }
  function stripCids(data) {
    var clean = JSON.parse(JSON.stringify(data));
    Object.keys(clean).forEach(function (panelId) {
      (clean[panelId] || []).forEach(function (g) {
        delete g._cid;
        (g.steps || []).forEach(function (s) { delete s._cid; });
      });
    });
    return clean;
  }

  // Animación FLIP: mide posiciones antes de mutar, vuelve a renderizar, y anima la diferencia
  function withFlip(mutateAndRender) {
    var before = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-cid]'), function (el) {
      before[el.dataset.cid] = el.getBoundingClientRect();
    });
    mutateAndRender();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cid]'), function (el) {
      var b = before[el.dataset.cid];
      if (!b) return;
      var a = el.getBoundingClientRect();
      var dx = b.left - a.left, dy = b.top - a.top;
      if (!dx && !dy) return;
      el.style.transition = 'none';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      requestAnimationFrame(function () {
        el.style.transition = 'transform .25s ease';
        el.style.transform = '';
      });
    });
  }

  function renderPanel() {
    var groups = state.data[state.panel] || [];
    var counter = { n: 0 };
    els.editor.innerHTML = groups.map(function (g, gi) { return renderGroupEditor(g, gi, groups.length, counter); }).join('') +
      '<button type="button" class="admin-btn" data-action="add-group">+ Agregar grupo</button>';
  }

  function renderGroupEditor(group, gi, groupCount, counter) {
    var stepsHtml = group.steps.map(function (s, si) {
      if (!s.sub) counter.n++;
      var html = renderStepEditor(s, gi, si, group.steps.length, s.sub ? '·' : counter.n);
      if (si < group.steps.length - 1) {
        html += '<div class="admin-insert-zone"><button type="button" title="Insertar paso aquí" data-action="insert-step" data-gi="' + gi + '" data-at="' + (si + 1) + '">+</button></div>';
      }
      return html;
    }).join('');
    return '<div class="admin-group" data-gi="' + gi + '" data-cid="' + group._cid + '">' +
      '<div class="admin-group-head">' +
      '<span class="admin-group-tag">Grupo</span>' +
      '<input data-field="gtitle" class="admin-group-title" value="' + esc(group.title) + '" placeholder="Título del grupo">' +
      '<div class="admin-move">' +
      '<button type="button" title="Subir grupo" data-action="up-group" ' + (gi === 0 ? 'disabled' : '') + '>▲</button>' +
      '<button type="button" title="Bajar grupo" data-action="down-group" ' + (gi === groupCount - 1 ? 'disabled' : '') + '>▼</button>' +
      '<button type="button" class="admin-danger" data-action="del-group">Eliminar grupo</button>' +
      '</div></div>' +
      '<div class="admin-group-desc-wrap"><textarea data-field="gdesc" placeholder="Descripción del grupo" rows="1">' + esc(group.desc) + '</textarea></div>' +
      '<div class="admin-steps">' + stepsHtml + '</div>' +
      '<button type="button" class="admin-btn" data-action="add-step">+ Agregar paso</button>' +
      '</div>';
  }

  function renderStepEditor(step, gi, si, stepCount, displayNum) {
    return '<div class="admin-step" data-gi="' + gi + '" data-si="' + si + '" data-cid="' + step._cid + '">' +
      '<div class="admin-step-row">' +
      '<span class="admin-step-num" title="Número con el que se mostrará este paso">' + displayNum + '</span>' +
      '<div class="admin-move">' +
      '<button type="button" data-action="up-step" ' + (si === 0 ? 'disabled' : '') + '>▲</button>' +
      '<button type="button" data-action="down-step" ' + (si === stepCount - 1 ? 'disabled' : '') + '>▼</button>' +
      '<button type="button" class="admin-danger" data-action="del-step">Eliminar</button>' +
      '</div></div>' +
      '<input data-field="title" value="' + esc(step.title) + '" placeholder="Título del paso">' +
      '<textarea data-field="route" placeholder="Ruta de menú (una línea por opción; empieza con &quot;o &quot; para ruta alternativa)" rows="2">' + esc(routeToText(step.route)) + '</textarea>' +
      '<textarea data-field="comment" placeholder="Comentario (usa líneas que empiecen con &quot;- &quot; para lista de viñetas)" rows="2">' + esc(commentToText(step)) + '</textarea>' +
      '<input data-field="images" value="' + esc(imagesToText(step)) + '" placeholder="Rutas de imagen, o pega aquí una captura (Ctrl+V)">' +
      '<div class="admin-file-upload"><input type="file" accept="image/*" data-action="upload-image" data-gi="' + gi + '" data-si="' + si + '"><span class="admin-upload-status"></span></div>' +
      '</div>';
  }

  // ---------- edición de campos (sin re-render, para no perder foco) ----------
  function stepAt(gi, si) { return state.data[state.panel][gi].steps[si]; }

  els.editor.addEventListener('input', function (e) {
    var t = e.target;
    var field = t.dataset.field;
    if (!field) return;
    var stepEl = t.closest('[data-si]');
    if (stepEl) {
      var gi = +stepEl.dataset.gi, si = +stepEl.dataset.si;
      var step = stepAt(gi, si);
      if (field === 'title') step.title = t.value;
      else if (field === 'route') step.route = parseRouteText(t.value);
      else if (field === 'comment') { var c = parseCommentText(t.value); step.comment = c.comment; step.commentList = c.commentList; }
      else if (field === 'images') step.images = parseImagesText(t.value);
      return;
    }
    var groupEl = t.closest('[data-gi]');
    if (groupEl) {
      var group = state.data[state.panel][+groupEl.dataset.gi];
      if (field === 'gtitle') group.title = t.value;
      else if (field === 'gdesc') group.desc = t.value;
    }
  });

  // ---------- subir imagen nueva a GitHub (assets/img/) ----------
  function toBase64Raw(bytes) {
    var binary = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function uploadImageFile(file, gi, si, statusEl, imgInput) {
    if (!els.token.value.trim()) { statusEl.textContent = 'Falta el token de GitHub.'; statusEl.className = 'admin-upload-status err'; return; }
    statusEl.textContent = 'Subiendo…'; statusEl.className = 'admin-upload-status';
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      var ext = (file.name && file.name.match(/\.[a-zA-Z0-9]+$/) || ['.png'])[0].toLowerCase();
      var filename = 'upload-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ext;
      var path = 'assets/img/' + filename;
      var url = 'https://api.github.com/repos/' + els.owner.value.trim() + '/' + els.repo.value.trim() + '/contents/' + path;
      fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + els.token.value.trim(),
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Subir imagen ' + filename, content: toBase64Raw(bytes), branch: els.branch.value.trim() })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error((j && j.message) || ('HTTP ' + r.status)); });
        return r.json();
      }).then(function () {
        var step = stepAt(gi, si);
        step.images = step.images || [];
        step.images.push(path);
        statusEl.textContent = 'Subida: ' + path; statusEl.className = 'admin-upload-status ok';
        imgInput.value = imagesToText(step);
      }).catch(function (err) {
        statusEl.textContent = 'Error: ' + err.message; statusEl.className = 'admin-upload-status err';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  els.editor.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.action !== 'upload-image') return;
    var file = t.files && t.files[0];
    if (!file) return;
    var gi = +t.dataset.gi, si = +t.dataset.si;
    var statusEl = t.parentElement.querySelector('.admin-upload-status');
    var imgInput = t.closest('.admin-step').querySelector('[data-field="images"]');
    uploadImageFile(file, gi, si, statusEl, imgInput);
  });

  // pegar una captura de pantalla (Ctrl+V) directamente en el campo de imágenes
  els.editor.addEventListener('paste', function (e) {
    var t = e.target;
    if (!t.matches || !t.matches('[data-field="images"]')) return;
    var items = (e.clipboardData || window.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        e.preventDefault();
        var file = items[i].getAsFile();
        var stepEl = t.closest('[data-si]');
        var gi = +stepEl.dataset.gi, si = +stepEl.dataset.si;
        var statusEl = stepEl.querySelector('.admin-upload-status');
        uploadImageFile(file, gi, si, statusEl, t);
        break;
      }
    }
  });

  // ---------- acciones (agregar/eliminar/mover) ----------
  function moveItem(arr, from, to) {
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
  }

  function newStep() { return { _cid: newCid(), title: 'Nuevo paso', sub: false, route: null, comment: '', commentList: null, images: [] }; }

  // Confirmación en dos clics dentro del mismo botón (evita depender de confirm() nativo)
  function confirmThenRun(btn, label, run) {
    if (!btn.classList.contains('confirming')) {
      btn.classList.add('confirming');
      btn.dataset.origLabel = btn.textContent;
      btn.textContent = label;
      btn._revertTimer = setTimeout(function () {
        btn.classList.remove('confirming');
        btn.textContent = btn.dataset.origLabel;
      }, 3000);
      return;
    }
    clearTimeout(btn._revertTimer);
    run();
  }

  els.editor.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b) return;
    var action = b.dataset.action;
    var groups = state.data[state.panel];

    if (action === 'add-group') {
      withFlip(function () { groups.push({ _cid: newCid(), title: 'Nuevo grupo', desc: '', steps: [] }); renderPanel(); });
      return;
    }
    if (action === 'insert-step') {
      var gi0 = +b.dataset.gi, at = +b.dataset.at;
      withFlip(function () { groups[gi0].steps.splice(at, 0, newStep()); renderPanel(); });
      return;
    }
    var groupEl = b.closest('[data-gi]');
    var gi = +groupEl.dataset.gi;
    var stepEl = b.closest('[data-si]');

    if (action === 'del-group') {
      confirmThenRun(b, '¿Seguro? Sí, eliminar', function () { withFlip(function () { groups.splice(gi, 1); renderPanel(); }); });
      return;
    }
    if (action === 'up-group') { withFlip(function () { if (gi > 0) moveItem(groups, gi, gi - 1); renderPanel(); }); return; }
    if (action === 'down-group') { withFlip(function () { if (gi < groups.length - 1) moveItem(groups, gi, gi + 1); renderPanel(); }); return; }
    if (action === 'add-step') {
      withFlip(function () { groups[gi].steps.push(newStep()); renderPanel(); });
      return;
    }
    if (stepEl) {
      var si = +stepEl.dataset.si;
      var steps = groups[gi].steps;
      if (action === 'del-step') { confirmThenRun(b, '¿Seguro? Sí, eliminar', function () { withFlip(function () { steps.splice(si, 1); renderPanel(); }); }); return; }
      if (action === 'up-step') { withFlip(function () { if (si > 0) moveItem(steps, si, si - 1); renderPanel(); }); return; }
      if (action === 'down-step') { withFlip(function () { if (si < steps.length - 1) moveItem(steps, si, si + 1); renderPanel(); }); return; }
    }
  });

  renderTabs();
})();
