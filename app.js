(function () {
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
    records: [],
    map: null,
    markers: [],
    poblacionesGps: {},
    charts: {},
    users: [],
    editingUserId: null
  };

  // Mapeo unificado sincronizado al 100% con los IDs reales de index.html
  const els = {
    // Vistas principales
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    
    // Login
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    loginError: document.getElementById('loginError'),
    userBadge: document.getElementById('userBadge'),

    // KPIs Dashboard
    kpiTotal: document.getElementById('kpiTotal'),
    kpiPending: document.getElementById('kpiPending'),
    kpiDone: document.getElementById('kpiDone'),

    // Filtros Avanzados (Sección Dashboard)
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

    // Tablas contenedoras
    recordsBody: document.getElementById('recordsBody'),         // Dashboard
    recordsBodyFull: document.getElementById('recordsBodyFull'), // Base de Datos Completa

    // Dropzone / Importación
    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),

    // Gestión de Usuarios
    userSearch: document.getElementById('userSearch'),
    userRoleFilter: document.getElementById('userRoleFilter'),
    usersBody: document.getElementById('usuariosBody'),          // Sincronizado con id="usuariosBody" del HTML
    usuariosMsg: document.getElementById('usuariosMsg'),
    
    // Modales (Ficha detalle e Info de usuario)
    modalFicha: document.getElementById('modal-ficha'),
    modalContenido: document.getElementById('modal-contenido'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
  };

  const log = (text) => { console.log(`[LOG] ${text}`); };
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
  // 🔐 AUTENTICACIÓN Y NAVEGACIÓN
  // ==========================================
  const ejecutarLogin = async () => {
    if (!els.loginEmail || !els.loginPassword) return;
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (els.loginError) els.loginError.textContent = '';

    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (els.loginError) els.loginError.textContent = `Error del servidor (${res.status}): ${errBody.message || 'sin detalle'}`;
        return;
      }
      const userArray = await res.json();
      if (Array.isArray(userArray) && userArray.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(userArray[0]));
        inicializarSesionDeUsuario(userArray[0]);
      } else {
        if (els.loginError) els.loginError.textContent = 'Credenciales no válidas en PostgreSQL.';
      }
    } catch (err) {
      if (els.loginError) els.loginError.textContent = 'Fallo de red: ' + err.message;
    }
  };

  const inicializarSesionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `${user.email} (${user.rol || 'tasador'})`;
    
    // Cambios de vista SPA nativos sin alterar rutas absolutas
    if (els.authView) els.authView.style.display = 'none';
    if (els.appView) els.appView.style.display = 'flex';
    
    inicializarMapaGis();
    cargarTasacionesDesdeBBDD();
    cargarUsuarios();
  };

  const verificarPersistenciaSesion = () => {
    const sesionGuardada = localStorage.getItem('session_user');
    if (sesionGuardada) {
      inicializarSesionDeUsuario(JSON.parse(sesionGuardada));
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
  // 🗺️ MAPA GIS
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    state.map = L.map('map').setView([36.8381, -2.4597], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);
  };

  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const actualizarSelectorPoblaciones = () => {
    if (!els.advDistanceTown) return;
    const valorSeleccionadoPrevio = els.advDistanceTown.value;
    els.advDistanceTown.innerHTML = '<option value="">— Sin ordenar por Cercanía —</option>';
    Object.keys(state.poblacionesGps).sort().forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio;
      option.textContent = municipio;
      els.advDistanceTown.appendChild(option);
    });
    els.advDistanceTown.value = valorSeleccionadoPrevio;
  };

  const actualizarSelectorMunicipios = () => {
    if (!els.advMunicipio) return;
    const valorSeleccionadoPrevio = els.advMunicipio.value;
    els.advMunicipio.innerHTML = '<option value="">Todos los municipios</option>';
    const municipios = [...new Set(state.records.map(r => r.localidad).filter(Boolean))].sort();
    municipios.forEach(m => {
      const option = document.createElement('option');
      option.value = m;
      option.textContent = m;
      els.advMunicipio.appendChild(option);
    });
    els.advMunicipio.value = valorSeleccionadoPrevio;
  };

  // ==========================================
  // 📊 GRÁFICAS (Chart.js v4) - EVITA ESTIRAMIENTO INFINITO
  // ==========================================
  const destroyCharts = () => {
    Object.values(state.charts).forEach(chart => chart.destroy());
    state.charts = {};
  };

  const renderCharts = () => {
    destroyCharts();
    const ctx = {
      type: document.getElementById('chartType')?.getContext('2d'),
      status: document.getElementById('chartStatus')?.getContext('2d'),
      municipios: document.getElementById('chartMunicipios')?.getContext('2d'),
      valorSuperficie: document.getElementById('chartValorSuperficie')?.getContext('2d'),
    };
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

    if (ctx.type) {
      const typeCounts = {};
      state.records.forEach(r => { if(r.tipo) typeCounts[r.tipo] = (typeCounts[r.tipo] || 0) + 1; });
      state.charts.type = new Chart(ctx.type, {
        type: 'doughnut',
        data: {
          labels: Object.keys(typeCounts),
          datasets: [{ data: Object.values(typeCounts), backgroundColor: colors, borderWidth: 0 }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: true, 
          aspectRatio: 1.5,
          plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter', size: 11 } } } } 
        }
      });
    }

    if (ctx.status) {
      const statusCounts = {};
      state.records.forEach(r => { if(r.estado) statusCounts[r.estado] = (statusCounts[r.estado] || 0) + 1; });
      const statusColors = { 'Finalizado': '#22c55e', 'En proceso': '#3b82f6', 'Pendiente': '#f59e0b' };
      state.charts.status = new Chart(ctx.status, {
        type: 'pie',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(k => statusColors[k] || '#64748b'), borderWidth: 0 }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: true, 
          aspectRatio: 1.5,
          plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter', size: 11 } } } } 
        }
      });
    }

    if (ctx.municipios) {
      const muniCounts = {};
      state.records.forEach(r => { if (r.localidad) muniCounts[r.localidad] = (muniCounts[r.localidad] || 0) + 1; });
      const sorted = Object.entries(muniCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
      state.charts.municipios = new Chart(ctx.municipios, {
        type: 'bar',
        data: {
          labels: sorted.map(s => s[0]),
          datasets: [{ label: 'Expedientes', data: sorted.map(s => s[1]), backgroundColor: '#3b82f6', borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true, 
          aspectRatio: 2,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
          }
        }
      });
    }

    if (ctx.valorSuperficie) {
      const scatterData = state.records
        .filter(r => r.valor && r.superficie)
        .map(r => ({ x: Number(r.superficie), y: Number(r.valor) }))
        .slice(0, 200);
      state.charts.valorSuperficie = new Chart(ctx.valorSuperficie, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Valor (€) vs Superficie (m²)',
            data: scatterData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true, 
          aspectRatio: 2,
          plugins: { legend: { labels: { color: '#f8fafc' } } },
          scales: {
            x: { title: { display: true, text: 'Superficie (m²)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { title: { display: true, text: 'Valor (€)', color: '#94a3b8' }, ticks: { color: '#94a3b8', callback: v => (v/1000).toFixed(0)+'k' }, grid: { color: '#334155' } }
          }
        }
      });
    }
  };

  // ==========================================
  // 📑 DATOS Y RENDERS DE TABLAS
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
        renderSistemaCompleto();
        renderRecordsFull();
        renderCharts();
      }
    } catch (error) {
      console.error("Error cargando BBDD:", error);
    }
  };

  const renderSistemaCompleto = () => {
    if (!els.recordsBody) return;
    state.markers.forEach(m => state.map?.removeLayer(m));
    state.markers = [];

    const query = els.advSearch?.value.trim().toLowerCase() || '';
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

    let filtrados = state.records.map(r => {
      let distancia = null;
      if (r.lote && coordenadasCentro) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          distancia = calcularDistanciaKm(coordenadasCentro.lat, coordenadasCentro.lng, parseFloat(c[0]), parseFloat(c[1]));
        }
      }
      return { ...r, _distancia: distancia };
    }).filter(r => {
      const coincideTexto = !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query));
      const coincideTipo = !filterType || r.tipo === filterType;
      const coincideMunicipio = !filterMunicipio || r.localidad === filterMunicipio;
      const coincideEstado = !filterStatus || r.estado === filterStatus;
      const coincideValor = inRange(r.valor, valueRange);
      const coincideSuperficie = inRange(r.superficie, surfaceRange);
      const coincideFecha = inDateRange(r.fecha, dateFrom, dateTo);
      
      // CORREGIDO: "coincideValor" (sin erratas de ejecución)
      return coincideTexto && coincideTipo && coincideMunicipio && coincideEstado && 
             coincideValor && coincideSuperficie && coincideFecha;
    });

    if (coordenadasCentro) {
      filtrados.sort((a, b) => {
        if (a._distancia === null) return 1;
        if (b._distancia === null) return -1;
        return a._distancia - b._distancia;
      });
    }

    if (els.kpiTotal) els.kpiTotal.textContent = state.records.length;
    if (els.kpiPending) els.kpiPending.textContent = state.records.filter(r => r.estado !== 'Finalizado').length;
    if (els.kpiDone) els.kpiDone.textContent = state.records.filter(r => r.estado === 'Finalizado').length;
    if (els.mapCounter) els.mapCounter.textContent = `${filtrados.length} marcadores activos`;

    if (filtrados.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Ningún expediente coincide con los criterios seleccionados.</td></tr>`;
      return;
    }

    els.recordsBody.innerHTML = filtrados.map(r => {
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente');
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—';
      const valorEuro = formatEuro(r.valor);

      if (r.lote && state.map) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          const marker = L.marker([parseFloat(c[0]), parseFloat(c[1])])
            .addTo(state.map)
            .bindPopup(`<b>Ref: ${escapeHtml(r.referencia)}</b><br>Propietario: ${escapeHtml(r.propietario)}<br>Valor: ${valorEuro}`);
          state.markers.push(marker);
        }
      }

      return `<tr data-id="${escapeHtml(r.id || r.referencia)}">
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td>Polígono / Parcela Física</td>
        <td><span class="badge ${badgeClass}">● ${escapeHtml(r.estado)}</span></td>
        <td style="color:var(--primary); font-weight:600;">${distTexto}</td>
        <td><strong>${valorEuro}</strong></td>
      </tr>`;
    }).join('');

    els.recordsBody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => mostrarDetalleTasacion(tr.dataset.id));
    });
  };

  const renderRecordsFull = () => {
    if (!els.recordsBodyFull) return;
    const query = els.userSearch?.value.trim().toLowerCase() || '';
    
    let filtrados = state.records.filter(r => {
      return !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query));
    });

    els.recordsBodyFull.innerHTML = filtrados.map(r => {
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente');
      const valorEuro = formatEuro(r.valor);
      return `<tr data-id="${escapeHtml(r.id || r.referencia)}">
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td>Polígono / Parcela Física</td>
        <td><span class="badge ${badgeClass}">● ${escapeHtml(r.estado)}</span></td>
        <td>—</td>
        <td><strong>${valorEuro}</strong></td>
        <td>${escapeHtml(r.fecha ? r.fecha.slice(0,10) : '—')}</td>
        <td><button class="btn-ver" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">Ver</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Sin registros</td></tr>`;

    els.recordsBodyFull.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (!e.target.closest('button')) mostrarDetalleTasacion(tr.dataset.id);
      });
      tr.querySelector('button.btn-ver')?.addEventListener('click', (e) => {
        e.stopPropagation();
        mostrarDetalleTasacion(tr.dataset.id);
      });
    });
  };

  const mostrarDetalleTasacion = (id) => {
    const record = state.records.find(r => (r.id || r.referencia) === id);
    if (!record) return;

    const valorEuro = formatEuro(record.valor);
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
        <div class="modal-field"><label>Valor de Tasación</label><div style="font-weight:700; color:var(--success); margin-top:3px;">${valorEuro}</div></div>
        <div class="modal-field"><label>Superficie (m²)</label><div style="margin-top:3px;">${escapeHtml(record.superficie || '—')} m²</div></div>
        <div class="modal-field"><label>Fecha Registro</label><div style="margin-top:3px;">${escapeHtml(record.fecha ? record.fecha.slice(0,10) : '—')}</div></div>
        <div class="modal-field"><label>Latitud</label><div style="margin-top:3px;">${lat}</div></div>
        <div class="modal-field"><label>Longitud</label><div style="margin-top:3px;">${lng}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Ubicación / Paraje / Lote</label><div style="margin-top:3px;">${escapeHtml(record.lote || '—')}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Observaciones</label><div style="margin-top:3px; font-style:italic; color:#cbd5e1;">${escapeHtml(record.observaciones || 'Sin observaciones adicionales.')}</div></div>
      </div>
    `;
    els.modalFicha.classList.add('open');
  };

  // ==========================================
  // 📥 IMPORTACIÓN DE ARCHIVOS JSON
  // ==========================================
  const procesarArchivoJSON = async (file) => {
    if (!file) return;
    try {
      if (els.importProgress) els.importProgress.textContent = "Leyendo archivo...";
      const text = await file.text();
      const rawData = JSON.parse(text);
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      if (els.importProgress) els.importProgress.textContent = `Enviando ${dataArray.length} registros al servidor...`;

      const res = await fetch(`${state.apiBase}/importacion_tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(dataArray)
      });

      if (res.ok) {
        if (els.importProgress) els.importProgress.innerHTML = `<span style="color:var(--success)">¡Importación completada con éxito!</span>`;
        await cargarTasacionesDesdeBBDD();
      } else {
        const err = await res.json().catch(() => ({}));
        if (els.importProgress) els.importProgress.innerHTML = `<span style="color:var(--danger)">Error: ${err.message || 'Error del servidor'}</span>`;
      }
    } catch (e) {
      if (els.importProgress) els.importProgress.innerHTML = `<span style="color:var(--danger)">Error de formato: ${e.message}</span>`;
    }
  };

  const handleFiles = (files) => {
    if (files.length) procesarArchivoJSON(files[0]);
  };

  // ==========================================
  // 👥 GESTIÓN DE USUARIOS
  // ==========================================
  const cargarUsuarios = async () => {
    if (!els.usersBody) return;
    try {
      const response = await fetch(`${state.apiBase}/usuarios?order=email.asc`);
      if (response.ok) {
        state.users = await response.json();
        renderUsuarios();
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  const renderUsuarios = () => {
    if (!els.usersBody) return;

    const query = els.userSearch?.value.trim().toLowerCase() || '';
    const rolFilter = els.userRoleFilter?.value || '';

    const filtrados = state.users.filter(u => {
      const coincideTexto = !query || String(u.email ?? '').toLowerCase().includes(query);
      const coincideRol = !rolFilter || u.rol === rolFilter;
      return coincideTexto && coincideRol;
    });

    if (filtrados.length === 0) {
      els.usersBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">No se encontraron usuarios.</td></tr>`;
      return;
    }

    els.usersBody.innerHTML = filtrados.map(u => `
      <tr>
        <td>
          <div style="font-weight:600;">${escapeHtml(u.email)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Rol: ${escapeHtml(u.rol || 'tasador')}</div>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-edit-user" data-id="${u.id}" style="background:var(--bg-input); color:var(--text-main); border:1px solid var(--border); padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Editar</button>
            <button class="btn-del-user" data-id="${u.id}" style="background:rgba(239,68,68,0.1); color:var(--danger); border:1px solid rgba(239,68,68,0.2); padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

    els.usersBody.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        prepararEdicionUsuario(Number(btn.dataset.id));
      });
    });

    els.usersBody.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        eliminarUsuarioBBDD(Number(btn.dataset.id));
      });
    });
  };

  const prepararEdicionUsuario = (id) => {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    state.editingUserId = id;
    
    const emailInput = document.getElementById('userEmail');
    const passwordInput = document.getElementById('userPassword');
    const rolSelect = document.getElementById('userRole');
    const formTitle = document.getElementById('formUsuarioTitulo');

    if (emailInput) emailInput.value = user.email || '';
    if (passwordInput) passwordInput.value = user.password || '';
    if (rolSelect) rolSelect.value = user.rol || 'tasador';
    if (formTitle) formTitle.textContent = 'Editar Usuario';
  };

  const guardarUsuarioBBDD = async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('userEmail');
    const passwordInput = document.getElementById('userPassword');
    const rolSelect = document.getElementById('userRole');

    if (!emailInput || !passwordInput || !rolSelect) return;

    const payload = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
      rol: rolSelect.value
    };

    if (!payload.email || !payload.password) {
      if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">Por favor, rellena todos los campos.</span>`;
      return;
    }

    try {
      let url = `${state.apiBase}/usuarios`;
      let method = 'POST';
      let headers = { 'Content-Type': 'application/json' };

      if (state.editingUserId) {
        url += `?id=eq.${state.editingUserId}`;
        method = 'PATCH';
      }

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (res.ok) {
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--success)">Usuario guardado correctamente.</span>`;
        resetearFormularioUsuario();
        await cargarUsuarios();
      } else {
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">Error al guardar en el servidor.</span>`;
      }
    } catch (err) {
      if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">Fallo de red: ${err.message}</span>`;
    }
  };

  const eliminarUsuarioBBDD = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const res = await fetch(`${state.apiBase}/usuarios?id=eq.${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--success)">Usuario eliminado.</span>`;
        await cargarUsuarios();
      } else {
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">No se pudo eliminar el usuario.</span>`;
      }
    } catch (err) {
      if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">Error de red: ${err.message}</span>`;
    }
  };

  const resetearFormularioUsuario = () => {
    state.editingUserId = null;
    const form = document.getElementById('form-usuario-git');
    if (form) form.reset();
    const formTitle = document.getElementById('formUsuarioTitulo');
    if (formTitle) formTitle.textContent = 'Crear Nuevo Usuario';
  };

  // ==========================================
  // ⚙️ INICIALIZACIÓN GLOBAL
  // ==========================================
  const inicializarEventosGlobales = () => {
    // Autenticación
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.loginPassword) {
      els.loginPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') ejecutarLogin();
      });
    }
    if (els.btnLogout) els.btnLogout.addEventListener('click', ejecutarLogout);

    // Filtros en Tiempo Real (Dashboard)
    const inputsFiltro = [els.advSearch, els.advType, els.advMunicipio, els.advStatus, els.advValueRange, els.advSurfaceRange, els.advDateFrom, els.advDateTo, els.advDistanceTown];
    inputsFiltro.forEach(input => {
      if (input) input.addEventListener('change', renderSistemaCompleto);
    });
    if (els.advSearch) els.advSearch.addEventListener('input', renderSistemaCompleto);

    // Filtros en Tiempo Real (Usuarios)
    if (els.userSearch) els.userSearch.addEventListener('input', renderUsuarios);
    if (els.userRoleFilter) els.userRoleFilter.addEventListener('change', renderUsuarios);

    // Formulario de altas/cambios de usuarios
    const userForm = document.getElementById('form-usuario-git');
    if (userForm) userForm.addEventListener('submit', guardarUsuarioBBDD);

    const btnCancelarUser = document.getElementById('btnCancelarUser');
    if (btnCancelarUser) btnCancelarUser.addEventListener('click', resetearFormularioUsuario);

    // Control de modales
    if (els.btnCerrarModal) {
      els.btnCerrarModal.addEventListener('click', () => {
        if (els.modalFicha) els.modalFicha.classList.remove('open');
      });
    }
    if (els.modalFicha) {
      els.modalFicha.addEventListener('click', (e) => {
        if (e.target === els.modalFicha) els.modalFicha.classList.remove('open');
      });
    }

    // Drag & Drop / Selección manual de JSON
    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.classList.add('drag-over'); });
      els.dropZone.addEventListener('dragleave', () => { els.dropZone.classList.remove('drag-over'); });
      els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      });
      els.jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFiles(e.target.files);
        e.target.value = '';
      });
    }
  };

  // Disparador principal de arranque
  document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacion();
    inicializarEventosGlobales();
    verificarPersistenciaSesion();
  });
})();
