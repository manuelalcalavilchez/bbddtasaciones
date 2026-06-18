(function () {
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
    records: [],
    filteredRecords: [], 
    map: null,
    markers: [],
    poblacionesGps: {},
    charts: {},
    users: [],
    editingUserId: null
  };

  const els = {
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    loginError: document.getElementById('loginError'),
    userBadge: document.getElementById('userBadge'),

    kpiTotal: document.getElementById('kpiTotal'),
    kpiPending: document.getElementById('kpiPending'),
    kpiDone: document.getElementById('kpiDone'),

    btnAplicarFiltros: document.getElementById('btnAplicarFiltros'), 
    btnBorrarFiltros: document.getElementById('btnBorrarFiltros'),

    advSearch: document.getElementById('advSearch'),
    advType: document.getElementById('advType'),
    advMunicipio: document.getElementById('advMunicipio'),
    advStatus: document.getElementById('advStatus'),
    advValueRange: document.getElementById('advValueRange'),
    advSurfaceRange: document.getElementById('advSurfaceRange'),
    advDateFrom: document.getElementById('advDateFrom'),
    advDateTo: document.getElementById('advDateTo'),
    advDistanceTown: document.getElementById('advDistanceTown'),
    mapCounter: document.getElementById('mapCounter'),

    recordsBody: document.getElementById('recordsBody'),         
    recordsBodyFull: document.getElementById('recordsBodyFull'), 

    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),

    userSearch: document.getElementById('userSearch'),
    userRoleFilter: document.getElementById('userRoleFilter'),
    usersBody: document.getElementById('usuariosBody'),          
    usuariosMsg: document.getElementById('usuariosMsg'),
    
    modalFicha: document.getElementById('modal-ficha'),
    modalContenido: document.getElementById('modal-contenido'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
  };

  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const formatEuro = (val) => Number(val || 0).toLocaleString('es-ES') + ' €';

  const parseRange = (str) => {
    if (!str) return null;
    const parts = str.split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (parts.length === 1) return { min: parts[0], max: null };
    if (parts.length >= 2) return { min: parts[0], max: parts[1] };
    return null;
  };

  const inRange = (val, range) => {
    if (!range) return true;
    const n = Number(val);
    if (isNaN(n)) return false;
    if (range.min !== null && n < range.min) return false;
    if (range.max !== null && n > range.max) return false;
    return true;
  };

  const inDateRange = (dateStr, from, to) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to)) return false;
    return true;
  };

  // ==========================================
  // 🔐 AUTENTICACIÓN
  // ==========================================
  const ejecutarLogin = async () => {
    if (!els.loginEmail || !els.loginPassword) return;
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (els.loginError) els.loginError.textContent = '';

    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      if (!res.ok) {
        if (els.loginError) els.loginError.textContent = 'Error de comunicación.';
        return;
      }
      const userArray = await res.json();
      if (Array.isArray(userArray) && userArray.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(userArray[0]));
        inicializarSessionDeUsuario(userArray[0]);
      } else {
        if (els.loginError) els.loginError.textContent = 'Credenciales no válidas.';
      }
    } catch (err) {
      if (els.loginError) els.loginError.textContent = 'Fallo de red.';
    }
  };

  const inicializarSessionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `${user.email} (${user.rol || 'tasador'})`;
    if (els.authView) els.authView.style.display = 'none';
    if (els.appView) els.appView.style.display = 'flex';
    
    inicializarMapaGis();
    cargarTasacionesDesdeBBDD();
    cargarUsuarios();
  };

  const verificarPersistenciaSesion = () => {
    const sesionGuardada = localStorage.getItem('session_user');
    if (sesionGuardada) {
      inicializarSessionDeUsuario(JSON.parse(sesionGuardada));
    } else {
      if (els.authView) els.authView.style.display = 'grid';
      if (els.appView) els.appView.style.display = 'none';
    }
  };

  const ejecutarLogout = () => {
    localStorage.removeItem('session_user');
    location.reload();
  };

  const inicializarNavegacion = () => {
    const links = document.querySelectorAll('.nav a[data-target]');
    const sections = document.querySelectorAll('.view-section');

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSectionId = link.getAttribute('data-target');

        links.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        link.classList.add('active');
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) targetSection.classList.add('active');

        if (targetSectionId === 'sec-dashboard' && state.map) {
          setTimeout(() => state.map.invalidateSize(), 200);
        }
      });
    });
  };

  // ==========================================
  // 🗺️ MAPA GIS Y ENTORNO GEOGRÁFICO
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    state.map = L.map('map').setView([36.8381, -2.4597], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(state.map);
  };

  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const actualizarSelectorPoblaciones = () => {
    if (!els.advDistanceTown) return;
    const prev = els.advDistanceTown.value;
    els.advDistanceTown.innerHTML = '<option value="">— Sin ordenar por Cercanía —</option>';
    Object.keys(state.poblacionesGps).sort().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      els.advDistanceTown.appendChild(opt);
    });
    els.advDistanceTown.value = prev;
  };

  const actualizarSelectorMunicipios = () => {
    if (!els.advMunicipio) return;
    const prev = els.advMunicipio.value;
    els.advMunicipio.innerHTML = '<option value="">Todos los municipios</option>';
    const munis = [...new Set(state.records.map(r => r.localidad).filter(Boolean))].sort();
    munis.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      els.advMunicipio.appendChild(opt);
    });
    els.advMunicipio.value = prev;
  };

  // ==========================================
  // 📊 RENDERIZADO DE GRÁFICAS (CHART.JS)
  // ==========================================
  const destroyCharts = () => {
    Object.values(state.charts).forEach(c => c.destroy());
    state.charts = {};
  };

  const renderCharts = () => {
    destroyCharts();
    const ctxType = document.getElementById('chartType')?.getContext('2d');
    const ctxStatus = document.getElementById('chartStatus')?.getContext('2d');
    const ctxMuni = document.getElementById('chartMunicipios')?.getContext('2d');
    const ctxScatter = document.getElementById('chartValorSuperficie')?.getContext('2d');
    
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    const dataSrc = state.filteredRecords;

    if (ctxType) {
      const counts = {};
      dataSrc.forEach(r => { if(r.tipo) counts[r.tipo] = (counts[r.tipo] || 0) + 1; });
      state.charts.type = new Chart(ctxType, {
        type: 'doughnut',
        data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: colors, borderWidth: 0 }] },
        options: { responsive: true, aspectRatio: 1.5, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } } }
      });
    }

    if (ctxStatus) {
      const counts = {};
      dataSrc.forEach(r => { if(r.estado) counts[r.estado] = (counts[r.estado] || 0) + 1; });
      const statusColors = { 'Finalizado': '#22c55e', 'En proceso': '#3b82f6', 'Pendiente': '#f59e0b' };
      state.charts.status = new Chart(ctxStatus, {
        type: 'pie',
        data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: Object.keys(counts).map(k => statusColors[k] || '#64748b'), borderWidth: 0 }] },
        options: { responsive: true, aspectRatio: 1.5, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } } }
      });
    }

    if (ctxMuni) {
      const counts = {};
      dataSrc.forEach(r => { if (r.localidad) counts[r.localidad] = (counts[r.localidad] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
      state.charts.municipios = new Chart(ctxMuni, {
        type: 'bar',
        data: { labels: sorted.map(s => s[0]), datasets: [{ label: 'Expedientes', data: sorted.map(s => s[1]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { indexAxis: 'y', responsive: true, aspectRatio: 2, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
      });
    }

    if (ctxScatter) {
      const scatterData = dataSrc.filter(r => r.valor && r.superficie).map(r => ({ x: Number(r.superficie), y: Number(r.valor) })).slice(0, 150);
      state.charts.valorSuperficie = new Chart(ctxScatter, {
        type: 'scatter',
        data: { datasets: [{ label: 'Valor (€) vs Superficie (m²)', data: scatterData, backgroundColor: 'rgba(59, 130, 246, 0.6)' }] },
        options: { responsive: true, aspectRatio: 2, plugins: { legend: { labels: { color: '#f8fafc' } } } }
      });
    }
  };

  // ==========================================
  // 📑 PROCESADO Y APERTURA DE FICHAS (CORREGIDO)
  // ==========================================
  const cargarTasacionesDesdeBBDD = async () => {
    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones?order=fecha.desc&limit=1000`);
      if (response.ok) {
        state.records = await response.json();
        state.records.forEach(r => {
          if (r.localidad && r.lote) {
            const coords = r.lote.split(',');
            if (coords.length === 2 && !state.poblacionesGps[r.localidad]) {
              state.poblacionesGps[r.localidad] = { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) };
            }
          }
        });
        actualizarSelectorPoblaciones();
        actualizarSelectorMunicipios();
        
        state.filteredRecords = [...state.records];
        ejecutarFiltradoYRenderizado();
        renderRecordsFull();
      }
    } catch (error) {
      console.error("Error en BBDD:", error);
    }
  };

  const ejecutarFiltradoYRenderizado = () => {
    if (!els.recordsBody) return;
    state.markers.forEach(m => state.map?.removeLayer(m));
    state.markers = [];

    const query = els.advSearch?.value?.trim().toLowerCase() || '';
    const filterType = els.advType?.value || '';
    const filterMunicipio = els.advMunicipio?.value || '';
    const filterStatus = els.advStatus?.value || '';
    const valueRange = parseRange(els.advValueRange?.value);
    const surfaceRange = parseRange(els.advSurfaceRange?.value);
    const dateFrom = els.advDateFrom?.value || '';
    const dateTo = els.advDateTo?.value || '';
    const centroReferencia = els.advDistanceTown?.value || '';

    let coordenadasCentro = null;
    if (centroReferencia && state.poblacionesGps[centroReferencia]) {
      coordenadasCentro = state.poblacionesGps[centroReferencia];
    }

    state.filteredRecords = state.records.map(r => {
      let distancia = null;
      if (r.lote && coordenadasCentro) {
        const c = r.lote.split(',');
        if (c.length === 2) distancia = calcularDistanciaKm(coordenadasCentro.lat, coordenadasCentro.lng, parseFloat(c[0]), parseFloat(c[1]));
      }
      return { ...r, _distancia: distancia };
    }).filter(r => {
      const inc = !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query));
      return inc && (!filterType || r.tipo === filterType) && 
                 (!filterMunicipio || r.localidad === filterMunicipio) && 
                 (!filterStatus || r.estado === filterStatus) && 
                 inRange(r.valor, valueRange) && 
                 inRange(r.superficie, surfaceRange) && 
                 inDateRange(r.fecha, dateFrom, dateTo);
    });

    if (coordenadasCentro) {
      state.filteredRecords.sort((a, b) => (a._distancia ?? Infinity) - (b._distancia ?? Infinity));
    }

    if (els.kpiTotal) els.kpiTotal.textContent = state.records.length;
    if (els.kpiPending) els.kpiPending.textContent = state.records.filter(r => r.estado !== 'Finalizado').length;
    if (els.kpiDone) els.kpiDone.textContent = state.records.filter(r => r.estado === 'Finalizado').length;
    if (els.mapCounter) els.mapCounter.textContent = `${state.filteredRecords.length} marcadores activos`;

    if (state.filteredRecords.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Ningún expediente coincide.</td></tr>`;
      destroyCharts();
      return;
    }

    els.recordsBody.innerHTML = state.filteredRecords.map(r => {
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente');
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—';
      const valorEuro = formatEuro(r.valor);

      if (r.lote && state.map) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          const marker = L.marker([parseFloat(c[0]), parseFloat(c[1])]).addTo(state.map)
            .bindPopup(`<b>Ref: ${escapeHtml(r.referencia)}</b><br>Valor: ${valorEuro}`);
          state.markers.push(marker);
        }
      }

      // IMPORTANTE: id o referencia metido de forma estricta en el dataset
      const uid = r.id || r.referencia;
      return `<tr data-id="${escapeHtml(uid)}">
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td><span class="badge ${badgeClass}">● ${escapeHtml(r.estado)}</span></td>
        <td style="color:var(--primary); font-weight:600;">${distTexto}</td>
        <td><strong>${valorEuro}</strong></td>
      </tr>`;
    }).join('');

    // ENGANCHE DIRECTO DE EVENTOS CLICK PARA ABRIR FICHA EN LA TABLA DEL PANEL
    els.recordsBody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => mostrarDetalleTasacion(tr.getAttribute('data-id')));
    });

    renderCharts();
  };

  const renderRecordsFull = () => {
    if (!els.recordsBodyFull) return;
    
    els.recordsBodyFull.innerHTML = state.records.map(r => {
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente');
      const uid = r.id || r.referencia;
      return `<tr data-id="${escapeHtml(uid)}">
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td><span class="badge ${badgeClass}">● ${escapeHtml(r.estado)}</span></td>
        <td><strong>${formatEuro(r.valor)}</strong></td>
        <td>${escapeHtml(r.fecha ? r.fecha.slice(0,10) : '—')}</td>
        <td><button style="background:var(--primary); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Ver</button></td>
      </tr>`;
    }).join('');

    // ENGANCHE EN LA BASE DE DATOS COMPLETA
    els.recordsBodyFull.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => mostrarDetalleTasacion(tr.getAttribute('data-id')));
    });
  };

  const mostrarDetalleTasacion = (uid) => {
    // Buscar por string o número de forma segura
    const record = state.records.find(r => String(r.id) === String(uid) || String(r.referencia) === String(uid));
    if (!record) return;

    const coords = record.lote ? record.lote.split(',') : [];
    const lat = coords[0] ? parseFloat(coords[0]).toFixed(6) : '—';
    const lng = coords[1] ? parseFloat(coords[1]).toFixed(6) : '—';

    if (!els.modalContenido || !els.modalFicha) return;

    els.modalContenido.innerHTML = `
      <h3 style="font-size:18px; font-weight:700; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:8px;">Detalle del Expediente</h3>
      <div class="modal-grid">
        <div class="modal-field"><label>Referencia</label><div style="font-weight:600; margin-top:3px;">${escapeHtml(record.referencia)}</div></div>
        <div class="modal-field"><label>Tipo de Inmueble</label><div style="margin-top:3px;">${escapeHtml(record.tipo)}</div></div>
        <div class="modal-field"><label>Propietario / Solicitante</label><div style="margin-top:3px;">${escapeHtml(record.propietario)}</div></div>
        <div class="modal-field"><label>Municipio / Localidad</label><div style="margin-top:3px;">${escapeHtml(record.localidad)}</div></div>
        <div class="modal-field"><label>Estado</label><div style="margin-top:3px;"><span class="badge ${record.estado === 'Finalizado' ? 'finalizado' : (record.estado === 'En proceso' ? 'proceso' : 'pendiente')}">${escapeHtml(record.estado)}</span></div></div>
        <div class="modal-field"><label>Valor de Tasación</label><div style="font-weight:700; color:var(--success); margin-top:3px;">${formatEuro(record.valor)}</div></div>
        <div class="modal-field"><label>Superficie (m²)</label><div style="margin-top:3px;">${escapeHtml(record.superficie || '—')} m²</div></div>
        <div class="modal-field"><label>Fecha Registro</label><div style="margin-top:3px;">${escapeHtml(record.fecha ? record.fecha.slice(0,10) : '—')}</div></div>
        <div class="modal-field"><label>Latitud</label><div style="margin-top:3px;">${lat}</div></div>
        <div class="modal-field"><label>Longitud</label><div style="margin-top:3px;">${lng}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Ubicación / Paraje / Lote</label><div style="margin-top:3px;">${escapeHtml(record.lote || '—')}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Observaciones</label><div style="margin-top:3px; font-style:italic; color:#cbd5e1;">${escapeHtml(record.observaciones || 'Sin observaciones.')}</div></div>
      </div>
    `;
    els.modalFicha.classList.add('open');
  };

  // ==========================================
  // 📥 IMPORTACIONES Y USUARIOS
  // ==========================================
  const procesarArchivoJSON = async (file) => {
    if (!file || !els.importProgress) return;
    try {
      els.importProgress.textContent = "Procesando...";
      const rawData = JSON.parse(await file.text());
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      const res = await fetch(`${state.apiBase}/importacion_tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(dataArray)
      });

      if (res.ok) {
        els.importProgress.innerHTML = `<span style="color:var(--success)">¡Completado!</span>`;
        await cargarTasacionesDesdeBBDD();
      } else {
        els.importProgress.innerHTML = `<span style="color:var(--danger)">Error de inserción.</span>`;
      }
    } catch (e) {
      els.importProgress.innerHTML = `<span style="color:var(--danger)">Error de formato.</span>`;
    }
  };

  const cargarUsuarios = async () => {
    if (!els.usersBody) return;
    try {
      const response = await fetch(`${state.apiBase}/usuarios?order=email.asc`);
      if (response.ok) {
        state.users = await response.json();
        renderUsuarios();
      }
    } catch (e) { console.error(e); }
  };

  const renderUsuarios = () => {
    if (!els.usersBody) return;
    els.usersBody.innerHTML = state.users.map(u => `
      <tr>
        <td>
          <div style="font-weight:600;">${escapeHtml(u.email)}</div>
          <div style="font-size:11px; color:var(--text-muted);">Rol: ${escapeHtml(u.rol || 'tasador')}</div>
        </td>
        <td><button class="btn-del-user" data-id="${u.id}" style="background:rgba(239,68,68,0.1); color:var(--danger); border:1px solid rgba(239,68,68,0.2); padding:5px 10px; border-radius:6px; cursor:pointer;">Eliminar</button></td>
      </tr>
    `).join('');
  };

  const guardarUsuarioBBDD = async (e) => {
    e.preventDefault();
    const email = document.getElementById('userEmail')?.value.trim();
    const password = document.getElementById('userPassword')?.value;
    const rol = document.getElementById('userRole')?.value;

    if (!email || !password) return;

    try {
      const res = await fetch(`${state.apiBase}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rol })
      });
      if (res.ok) {
        document.getElementById('form-usuario')?.reset();
        await cargarUsuarios();
      }
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // ⚙️ INICIALIZACIÓN DE LISTENERS
  // ==========================================
  const inicializarEventosGlobales = () => {
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.btnLogout) els.btnLogout.addEventListener('click', ejecutarLogout);
    if (els.btnAplicarFiltros) els.btnAplicarFiltros.addEventListener('click', ejecutarFiltradoYRenderizado);
    if (els.btnBorrarFiltros) {
      els.btnBorrarFiltros.addEventListener('click', () => {
        document.querySelectorAll('.panel-filtros input, .panel-filtros select').forEach(i => i.value = '');
        ejecutarFiltradoYRenderizado();
      });
    }

    const userForm = document.getElementById('form-usuario');
    if (userForm) userForm.addEventListener('submit', guardarUsuarioBBDD);

    if (els.btnCerrarModal) els.btnCerrarModal.addEventListener('click', () => els.modalFicha?.classList.remove('open'));
    if (els.modalFicha) {
      els.modalFicha.addEventListener('click', (e) => {
        if (e.target === els.modalFicha) els.modalFicha.classList.remove('open');
      });
    }

    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); });
      els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) procesarArchivoJSON(e.dataTransfer.files[0]);
      });
      els.jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) procesarArchivoJSON(e.target.files[0]);
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacion();
    inicializarEventosGlobales();
    verificarPersistenciaSesion();
  });
})();
