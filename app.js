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
    usersBody: document.getElementById('usersBody'),
    btnAddUser: document.getElementById('btnAddUser'),

    detailModal: document.getElementById('detailModal'),
    detailContent: document.getElementById('detailContent'),
    closeDetailModal: document.getElementById('closeDetailModal'),

    userModal: document.getElementById('userModal'),
    userModalTitle: document.getElementById('userModalTitle'),
    userModalError: document.getElementById('userModalError'),
    userEmail: document.getElementById('userEmail'),
    userPassword: document.getElementById('userPassword'),
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    userActive: document.getElementById('userActive'),
    btnSaveUser: document.getElementById('btnSaveUser'),
    btnCancelUser: document.getElementById('btnCancelUser'),
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
  // 🔐 AUTENTICACIÓN
  // ==========================================
  const ejecutarLogin = async () => {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (els.loginError) els.loginError.textContent = '';

    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        els.loginError.textContent = `Error del servidor (${res.status}): ${errBody.message || 'sin detalle'}`;
        console.error('Respuesta PostgREST:', errBody);
        return;
      }
      const userArray = await res.json();
      if (Array.isArray(userArray) && userArray.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(userArray[0]));
        inicializarSesionDeUsuario(userArray[0]);
      } else {
        els.loginError.textContent = 'Credenciales no válidas en PostgreSQL.';
      }
    } catch (err) {
      els.loginError.textContent = 'Fallo de red: ' + err.message;
      console.error('Error de red en login:', err);
    }
  };

  const inicializarSesionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `Usuario: ${user.email} (${user.rol || 'tasador'})`;
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
  // 📊 GRÁFICAS
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

    // Tipos
    if (ctx.type) {
      const typeCounts = {};
      state.records.forEach(r => { typeCounts[r.tipo] = (typeCounts[r.tipo] || 0) + 1; });
      state.charts.type = new Chart(ctx.type, {
        type: 'doughnut',
        data: {
          labels: Object.keys(typeCounts),
          datasets: [{ data: Object.values(typeCounts), backgroundColor: colors, borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter' } } } } }
      });
    }

    // Estados
    if (ctx.status) {
      const statusCounts = {};
      state.records.forEach(r => { statusCounts[r.estado] = (statusCounts[r.estado] || 0) + 1; });
      const statusColors = { 'Finalizado': '#22c55e', 'En proceso': '#3b82f6', 'Pendiente': '#f59e0b' };
      state.charts.status = new Chart(ctx.status, {
        type: 'pie',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(k => statusColors[k] || '#64748b'), borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter' } } } } }
      });
    }

    // Top 10 Municipios
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
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
          }
        }
      });
    }

    // Valor vs Superficie (scatter)
    if (ctx.valorSuperficie) {
      const scatterData = state.records
        .filter(r => r.valor && r.superficie)
        .map(r => ({ x: Number(r.superficie), y: Number(r.valor), label: r.referencia }))
        .slice(0, 200);
      state.charts.valorSuperficie = new Chart(ctx.valorSuperficie, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Valor (€) vs Superficie (m²)',
            data: scatterData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
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
  // 📑 DATOS Y RENDERIZADO
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
      return coincideTexto && coincideTipo && coincideMunicipio && coincideEstado && coincideValor && coincideSuperficie && coincideFecha;
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

      return `<tr data-id="${escapeHtml(r.id || r.referencia)}" style="cursor:pointer;">
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
      return `<tr data-id="${escapeHtml(r.id || r.referencia)}" style="cursor:pointer;">
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

    els.detailContent.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:15px;">
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Referencia</label><div style="font-weight:600;">${escapeHtml(record.referencia)}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Tipo</label><div>${escapeHtml(record.tipo)}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Propietario</label><div>${escapeHtml(record.propietario)}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Municipio</label><div>${escapeHtml(record.localidad)}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Estado</label><div><span class="badge ${record.estado === 'Finalizado' ? 'finalizado' : (record.estado === 'En proceso' ? 'proceso' : 'pendiente')}">${escapeHtml(record.estado)}</span></div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Valor</label><div style="font-weight:600; color:var(--success);">${valorEuro}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Superficie (m²)</label><div>${escapeHtml(record.superficie || '—')}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Fecha</label><div>${escapeHtml(record.fecha ? record.fecha.slice(0,10) : '—')}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Latitud</label><div>${lat}</div></div>
        <div><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Longitud</label><div>${lng}</div></div>
        <div style="grid-column:1/-1;"><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Paraje / Lote</label><div>${escapeHtml(record.lote || '—')}</div></div>
        <div style="grid-column:1/-1;"><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Dirección Mapeada</label><div>Polígono / Parcela Física</div></div>
        <div style="grid-column:1/-1;"><label style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Observaciones</label><div>${escapeHtml(record.observaciones || 'Sin observaciones')}</div></div>
      </div>
      <div style="margin-top:15px; text-align:right;">
        <button id="btnCloseDetail" style="background:var(--border); color:var(--text-main); border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">Cerrar</button>
      </div>
    `;
    els.detailModal.style.display = 'grid';
    document.getElementById('btnCloseDetail')?.addEventListener('click', () => { els.detailModal.style.display = 'none'; });
  };

  // ==========================================
  // 📥 IMPORTACIÓN MULTI-ARCHIVO
  // ==========================================
  const procesarArchivoJSON = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let rawData = JSON.parse(e.target.result);
          let item = {};

          if (rawData.identificacion_informe || rawData.datos_catastrales) {
            let valorStr = rawData.valores_tasacion?.valor_comparacion?.valor_total || "0";
            let valorLimpio = Number(valorStr.replace(/\./g, '').split(',')[0].replace(/[^0-9]/g, '')) || 0;
            let municipioDinamico = rawData.identificacion_y_localizacion?.paraje || "Almería";
            let lat = rawData.identificacion_y_localizacion?.coordenadas_gps?.latitud || "36.8381";
            let lng = rawData.identificacion_y_localizacion?.coordenadas_gps?.longitud || "-2.4597";
            let superficie = rawData.identificacion_y_localizacion?.superficie_total || rawData.datos_catastrales?.superficie_construida || null;

            item = {
              referencia: rawData.datos_catastrales?.referencias?.[0]?.referencia_catastral || ("S/R-" + Date.now()),
              tipo: rawData.identificacion_y_localizacion?.clase_general_inmueble || "Finca Rústica",
              propietario: rawData.identificacion_informe?.tasador?.nombre || "Técnico Local",
              localidad: municipioDinamico,
              lote: `${lat},${lng}`,
              estado: "Pendiente",
              fecha: new Date().toISOString().slice(0, 10),
              valor: valorLimpio,
              superficie: superficie ? Number(superficie) : null,
              observaciones: rawData.identificacion_informe?.observaciones || null
            };
          } else {
            item = rawData;
          }

          const response = await fetch(`${state.apiBase}/importacion_tasaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });

          if (response.ok) {
            resolve({ ok: true, file: file.name });
          } else {
            const err = await response.json().catch(() => ({}));
            resolve({ ok: false, file: file.name, error: err.message || 'Duplicado' });
          }
        } catch (err) {
          resolve({ ok: false, file: file.name, error: err.message });
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    els.importProgress.style.display = 'block';
    els.importProgress.innerHTML = `Procesando ${fileArray.length} archivo(s)...`;

    let success = 0, failed = 0;
    const results = [];

    for (const file of fileArray) {
      els.importProgress.innerHTML = `Procesando: ${file.name} (${success + failed + 1}/${fileArray.length})`;
      const result = await procesarArchivoJSON(file);
      results.push(result);
      if (result.ok) success++; else failed++;
    }

    let html = `<strong>${success} subidos, ${failed} fallidos</strong><br><br>`;
    results.forEach(r => {
      html += `<div style="color:${r.ok ? 'var(--success)' : 'var(--danger)'}; font-size:13px; margin:4px 0;">${r.file}: ${r.ok ? '✅ OK' : '❌ ' + r.error}</div>`;
    });
    els.importProgress.innerHTML = html;

    if (success > 0) {
      await cargarTasacionesDesdeBBDD();
    }
  };

  // ==========================================
  // 👥 GESTIÓN DE USUARIOS
  // ==========================================
  const cargarUsuarios = async () => {
    try {
      const res = await fetch(`${state.apiBase}/usuarios?order=id.desc`);
      if (res.ok) {
        state.users = await res.json();
        renderUsers();
      }
    } catch (e) { console.error(e); }
  };

  const renderUsers = () => {
    if (!els.usersBody) return;
    const query = els.userSearch?.value.trim().toLowerCase() || '';
    const roleFilter = els.userRoleFilter?.value || '';
    let filtrados = (state.users || []).filter(u => {
      return (!query || (u.email?.toLowerCase().includes(query)) || (u.nombre?.toLowerCase().includes(query)))
        && (!roleFilter || u.rol === roleFilter);
    });

    els.usersBody.innerHTML = filtrados.map(u => `
      <tr>
        <td>${escapeHtml(u.id)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.nombre || '—')}</td>
        <td><span class="badge" style="background:rgba(59,130,246,0.15); color:var(--primary);">${escapeHtml(u.rol || 'tasador')}</span></td>
        <td><span class="badge" style="background:rgba(34,197,94,0.15); color:var(--success);">${u.activo ? 'Sí' : 'No'}</span></td>
        <td>${u.ultimo_acceso ? escapeHtml(u.ultimo_acceso.slice(0,10)) : '—'}</td>
        <td>
          <button class="btn-edit-user" data-id="${u.id}" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:8px;">Editar</button>
          <button class="btn-delete-user" data-id="${u.id}" style="background:none; border:none; color:var(--danger); cursor:pointer;">Eliminar</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Sin usuarios</td></tr>`;

    els.usersBody.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModalUsuario(btn.dataset.id); }));
    els.usersBody.querySelectorAll('.btn-delete-user').forEach(btn => btn.addEventListener('click', async (e) => { e.stopPropagation(); if (confirm('Eliminar este usuario?')) await eliminarUsuario(btn.dataset.id); }));
  };

  const abrirModalUsuario = (id = null) => {
    state.editingUserId = id;
    els.userModalError.textContent = '';
    els.userEmail.value = '';
    els.userPassword.value = '';
    els.userName.value = '';
    els.userRole.value = 'tasador';
    els.userActive.checked = true;

    if (id) {
      const user = state.users.find(u => u.id == id);
      if (user) {
        els.userModalTitle.textContent = 'Editar Usuario';
        els.userEmail.value = user.email || '';
        els.userName.value = user.nombre || '';
        els.userRole.value = user.rol || 'tasador';
        els.userActive.checked = user.activo !== false;
        els.userPassword.placeholder = 'Dejar en blanco para no cambiar';
      }
    } else {
      els.userModalTitle.textContent = 'Nuevo Usuario';
      els.userPassword.placeholder = '••••••••';
    }
    els.userModal.style.display = 'grid';
  };

  const guardarUsuario = async () => {
    const email = els.userEmail.value.trim();
    const password = els.userPassword.value;
    const nombre = els.userName.value.trim();
    const rol = els.userRole.value;
    const activo = els.userActive.checked;

    if (!email || (!state.editingUserId && !password) || !nombre) {
      els.userModalError.textContent = 'Completa todos los campos obligatorios.';
      return;
    }

    const payload = { email, nombre, rol, activo };
    if (password) payload.password = password;

    try {
      let res;
      if (state.editingUserId) {
        res = await fetch(`${state.apiBase}/usuarios?id=eq.${state.editingUserId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${state.apiBase}/usuarios`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(payload) });
      }
      if (res.ok) {
        els.userModal.style.display = 'none';
        await cargarUsuarios();
      } else {
        const err = await res.json().catch(() => ({}));
        els.userModalError.textContent = err.message || 'Error guardando usuario';
      }
    } catch (e) {
      els.userModalError.textContent = 'Error de red: ' + e.message;
    }
  };

  const eliminarUsuario = async (id) => {
    try {
      const res = await fetch(`${state.apiBase}/usuarios?id=eq.${id}`, { method: 'DELETE' });
      if (res.ok) await cargarUsuarios();
      else alert('Error eliminando usuario');
    } catch (e) { alert('Error de red'); }
  };

  // ==========================================
  // 🔗 NAVEGACIÓN Y EVENTOS
  // ==========================================
  const navigate = (page) => {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    if (page === 'dashboard') { renderSistemaCompleto(); renderCharts(); }
    if (page === 'records') { renderRecordsFull(); }
    if (page === 'users') { renderUsers(); }
  };

  const bindEvents = () => {
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.btnLogout) els.btnLogout.addEventListener('click', () => { localStorage.removeItem('session_user'); location.reload(); });

    document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.page); }));

    [els.advSearch, els.advType, els.advMunicipio, els.advStatus, els.advValueRange, els.advSurfaceRange, els.advDateFrom, els.advDateTo, els.advDistanceTown].forEach(el => {
      if (el) el.addEventListener('input', renderSistemaCompleto);
      if (el) el.addEventListener('change', renderSistemaCompleto);
    });

    if (els.userSearch) els.userSearch.addEventListener('input', renderUsers);
    if (els.userRoleFilter) els.userRoleFilter.addEventListener('change', renderUsers);

    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.style.borderColor = 'var(--primary)'; els.dropZone.style.background = '#222f43'; });
      els.dropZone.addEventListener('dragleave', () => { els.dropZone.style.borderColor = 'var(--border)'; els.dropZone.style.background = 'transparent'; });
      els.dropZone.addEventListener('drop', (e) => { e.preventDefault(); els.dropZone.style.borderColor = 'var(--border)'; els.dropZone.style.background = 'transparent'; if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
      els.jsonFileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; });
    }

    if (els.closeDetailModal) els.closeDetailModal.addEventListener('click', () => { els.detailModal.style.display = 'none'; });
    if (els.detailModal) els.detailModal.addEventListener('click', (e) => { if (e.target === els.detailModal) els.detailModal.style.display = 'none'; });

    if (els.btnAddUser) els.btnAddUser.addEventListener('click', () => abrirModalUsuario(null));
    if (els.btnSaveUser) els.btnSaveUser.addEventListener('click', guardarUsuario);
    if (els.btnCancelUser) els.btnCancelUser.addEventListener('click', () => { els.userModal.style.display = 'none'; });
    if (els.userModal) els.userModal.addEventListener('click', (e) => { if (e.target === els.userModal) els.userModal.style.display = 'none'; });
  };

  const init = () => {
    bindEvents();
    verificarPersistenciaSesion();
  };

  document.addEventListener('DOMContentLoaded', init);
})();