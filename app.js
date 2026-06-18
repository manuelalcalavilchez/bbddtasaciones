(function () {
  // ===== ESTADO CENTRALIZADO DE LA APLICACIÓN SPA =====
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    records: [],
    filteredRecords: [], 
    map: null,
    markers: [],
    poblacionesGps: {},
    charts: {},
    users: []
  };

  // ===== MAPEO DE ELEMENTOS DEL DOM (Estructura index.html) =====
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
    btnCancelarUser: document.getElementById('btnCancelarUser'),
    
    modalFicha: document.getElementById('modal-ficha'),
    modalContenido: document.getElementById('modal-contenido'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
  };

  // ===== FUNCIONES UTILIDADES Y LIMPIEZA DE CADENAS =====
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
  // 🔐 CONTROL DE ACCESO (AUTENTICACIÓN)
  // ==========================================
  const ejecutarLogin = async () => {
    if (!els.loginEmail || !els.loginPassword) return;
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (els.loginError) els.loginError.textContent = '';

    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      if (!res.ok) {
        if (els.loginError) els.loginError.textContent = 'Error crítico de comunicación con el backend.';
        return;
      }
      const userArray = await res.json();
      if (Array.isArray(userArray) && userArray.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(userArray[0]));
        inicializarSessionDeUsuario(userArray[0]);
      } else {
        if (els.loginError) els.loginError.textContent = 'Credenciales técnicas incorrectas.';
      }
    } catch (err) {
      if (els.loginError) els.loginError.textContent = 'Fallo de conexión o red inalcanzable.';
    }
  };

  const inicializarSessionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">account_circle</span> ${escapeHtml(user.email)} (${escapeHtml(user.rol || 'tasador')})`;
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

  const inicializarNavegacionSPA = () => {
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
  // 🗺️ ENTORNO GEOGRÁFICO (LEAFLET GIS)
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    state.map = L.map('map').setView([36.8381, -2.4597], 10); // Centrado por defecto en Almería
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
  // 📊 COMPONENTES ANALÍTICOS (CHART.JS V4)
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
      const scatterData = dataSrc
        .filter(r => r.valor && r.superficie && !isNaN(r.valor) && !isNaN(r.superficie))
        .map(r => ({ x: Number(r.superficie), y: Number(r.valor) }))
        .slice(0, 200);

      state.charts.valorSuperficie = new Chart(ctxScatter, {
        type: 'scatter',
        data: { datasets: [{ label: 'Valor (€) vs Superficie (m²)', data: scatterData, backgroundColor: 'rgba(59, 130, 246, 0.6)' }] },
        options: { responsive: true, aspectRatio: 2, plugins: { legend: { labels: { color: '#f8fafc' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } }
      });
    }
  };

  // ==========================================
  // 📑 MANIPULACIÓN DE TABLAS Y APERTURA DE FICHAS
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
      console.error("Error leyendo PostgREST:", error);
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
      els.recordsBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">Ninguna tasación coincide con los filtros establecidos.</td></tr>`;
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

    // Escucha activa de clics en filas de tabla corta
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
        <td><button class="btn-view-ficha" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Ver Ficha</button></td>
      </tr>`;
    }).join('');

    // Escucha activa de clics en la tabla de Base de Datos global
    els.recordsBodyFull.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        mostrarDetalleTasacion(tr.getAttribute('data-id'));
      });
      // Asegurar que pinchar directamente en el botón también funcione limpiamente
      tr.querySelector('.btn-view-ficha')?.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitamos duplicidad de llamada por burbujeo
        mostrarDetalleTasacion(tr.getAttribute('data-id'));
      });
    });
  };

  const mostrarDetalleTasacion = (uid) => {
    const record = state.records.find(r => String(r.id) === String(uid) || String(r.referencia) === String(uid));
    if (!record) return;

    const coords = record.lote ? record.lote.split(',') : [];
    const lat = coords[0] ? parseFloat(coords[0]).toFixed(6) : '—';
    const lng = coords[1] ? parseFloat(coords[1]).toFixed(6) : '—';

    if (!els.modalContenido || !els.modalFicha) return;

    els.modalContenido.innerHTML = `
      <h3 style="font-size:18px; font-weight:700; margin-bottom:18px; border-bottom:1px solid var(--border); padding-bottom:10px;">Ficha Técnica de Expediente</h3>
      <div class="modal-grid">
        <div class="modal-field"><label>Referencia Catastral / Interna</label><div style="font-weight:600; margin-top:3px; color:var(--primary);">${escapeHtml(record.referencia)}</div></div>
        <div class="modal-field"><label>Tipología Constructiva</label><div style="margin-top:3px;">${escapeHtml(record.tipo)}</div></div>
        <div class="modal-field"><label>Propietario / Solicitante</label><div style="margin-top:3px;">${escapeHtml(record.propietario)}</div></div>
        <div class="modal-field"><label>Término Municipal</label><div style="margin-top:3px;">${escapeHtml(record.localidad)}</div></div>
        <div class="modal-field"><label>Estado Operativo</label><div style="margin-top:3px;"><span class="badge ${record.estado === 'Finalizado' ? 'finalizado' : (record.estado === 'En proceso' ? 'proceso' : 'pendiente')}">${escapeHtml(record.estado)}</span></div></div>
        <div class="modal-field"><label>Valor Concluido (€)</label><div style="font-weight:700; color:var(--success); margin-top:3px;">${formatEuro(record.valor)}</div></div>
        <div class="modal-field"><label>Superficie Útil Computable</label><div style="margin-top:3px; font-weight:600;">${escapeHtml(record.superficie || '—')} m²</div></div>
        <div class="modal-field"><label>Fecha Entrada</label><div style="margin-top:3px;">${escapeHtml(record.fecha ? record.fecha.slice(0,10) : '—')}</div></div>
        <div class="modal-field"><label>Coordenada Latitud (WGS84)</label><div style="margin-top:3px; color:var(--text-muted); font-family:monospace;">${lat}</div></div>
        <div class="modal-field"><label>Coordenada Longitud (WGS84)</label><div style="margin-top:3px; color:var(--text-muted); font-family:monospace;">${lng}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Localización / Paraje / Lote Geográfico</label><div style="margin-top:3px;">${escapeHtml(record.lote || '—')}</div></div>
        <div class="modal-field" style="grid-column: 1 / -1;"><label>Observaciones del Tasador Técnico</label><div style="margin-top:3px; font-style:italic; color:#cbd5e1; line-height:1.4;">${escapeHtml(record.observaciones || 'Sin observaciones documentadas.')}</div></div>
      </div>
    `;
    els.modalFicha.classList.add('open');
  };

  // ==========================================
  // 📥 COLA DE IMPORTACIONES Y ALTAS DE PERSONAL
  // ==========================================
  const procesarArchivoJSON = async (file) => {
    if (!file || !els.importProgress) return;
    try {
      els.importProgress.textContent = "Analizando e inyectando colecciones en PostgREST...";
      const rawData = JSON.parse(await file.text());
      
      // Convertimos a array si es un objeto único
      const rawArray = Array.isArray(rawData) ? rawData : [rawData];
      
      // Mapeamos y aplanamos los elementos si detectamos el formato del informe técnico
      const dataArray = rawArray.map(item => {
        // Verificación: si tiene el nodo 'identificacion_informe', es la plantilla compleja
        if (item.identificacion_informe && item.valores_tasacion) {
          
          // 1. Extraer Referencia Catastral (Buscamos en el array de referencias)
          const refObj = item.datos_catastrales?.referencias?.[0];
          const referencia = refObj?.referencia_catastral || "S/REF-" + Math.floor(Math.random() * 10000);
          
          // 2. Extraer Tipo de Inmueble
          const tipo = item.identificacion_y_localizacion?.clase_general_inmueble || "Urbano";
          
          // 3. Extraer Propietario o Solicitante
          const propietario = item.solicitante_y_finalidad?.solicitante?.nombre || 
                              item.identificacion_informe?.tasador?.nombre || "Desconocido";
          
          // 4. Extraer Localidad / Municipio
          const localidad = item.identificacion_y_localizacion?.municipio || 
                            item.solicitante_y_finalidad?.solicitante?.municipio || "Almería";
          
          // 5. Extraer Estado Operativo del expediente
          const estado = "Finalizado"; // Al ser un informe con valores concluidos, se asume Finalizado
          
          // 6. Extraer y limpiar Valor Económico
          // El JSON tiene "146.916,37 €", necesitamos dejarlo como un float puro: 146916.37
          let valorRaw = item.valores_tasacion?.valor_comparacion?.valor_total || "0";
          let valor = parseFloat(valorRaw.replace(/[.\s€]/g, '').replace(',', '.'));
          if (isNaN(valor)) valor = 0.00;
          
          // 7. Extraer Superficie
          // El JSON tiene "15720" en superficie_catastral como string
          let superficie = parseFloat(refObj?.superficie_catastral || "0");
          
          // 8. Concatenar Coordenadas GPS para el campo 'lote' -> "latitud,longitud"
          const lat = item.identificacion_y_localizacion?.coordenadas_gps?.latitud || "";
          const lng = item.identificacion_y_localizacion?.coordenadas_gps?.longitud || "";
          const lote = (lat && lng) ? `${lat},${lng}` : null;
          
          // 9. Extraer observaciones o parajes
          const paraje = item.identificacion_y_localizacion?.paraje || "";
          const descCargas = item.datos_registrales?.fincas?.[0]?.descripcion_registral || "";
          const observaciones = `Paraje: ${paraje}. Obs: ${descCargas}`.slice(0, 500);

          // Retornamos el objeto plano perfectamente estructurado para la tabla SQL
          return {
            referencia,
            tipo,
            propietario,
            localidad,
            estado,
            valor,
            superficie,
            lote,
            observaciones,
            fecha: new Date().toISOString()
          };
        }
        
        // Si ya era un objeto plano estándar del panel, lo dejamos intacto
        return item;
      });

      // Envío de los datos limpios a PostgREST
      const res = await fetch(`${state.apiBase}/importacion_tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(dataArray)
      });

      if (res.ok) {
        els.importProgress.innerHTML = `<span style="color:var(--success); font-weight:600;">✓ Inyección completada con éxito. ${dataArray.length} expediente(s) procesados.</span>`;
        await cargarTasacionesDesdeBBDD();
      } else {
        els.importProgress.innerHTML = `<span style="color:var(--danger); font-weight:600;">✕ Error de persistencia en la API de base de datos.</span>`;
      }
    } catch (e) {
      console.error(e);
      els.importProgress.innerHTML = `<span style="color:var(--danger); font-weight:600;">✕ Error estructural: El archivo no cumple el estándar JSON.</span>`;
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
    } catch (e) { console.error("Error al leer operarios:", e); }
  };

  const renderUsuarios = () => {
    if (!els.usersBody) return;
    
    const query = els.userSearch?.value?.trim().toLowerCase() || '';
    const roleFilter = els.userRoleFilter?.value || '';

    const usuariosFiltrados = state.users.filter(u => {
      const matchEmail = !query || u.email.toLowerCase().includes(query);
      const matchRol = !roleFilter || u.rol === roleFilter;
      return matchEmail && matchRol;
    });

    if (usuariosFiltrados.length === 0) {
      els.usersBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:16px;">Ningún operario coincide con la búsqueda.</td></tr>`;
      return;
    }

    els.usersBody.innerHTML = usuariosFiltrados.map(u => `
      <tr>
        <td>
          <div style="font-weight:600; color:#e2e8f0;">${escapeHtml(u.email)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px; font-weight:500;">Rol asignado: ${escapeHtml(u.rol || 'tasador')}</div>
        </td>
        <td style="text-align:center;"><button class="btn-del-user" data-id="${u.id}" style="background:rgba(239,68,68,0.1); color:var(--danger); border:1px solid rgba(239,68,68,0.2); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; transition: var(--transition);">Eliminar</button></td>
      </tr>
    `).join('');

    // Adjuntar listeners de eliminación por ID
    els.usersBody.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', () => eliminarUsuarioBBDD(btn.getAttribute('data-id')));
    });
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
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--success)">✓ Operario creado con éxito.</span>`;
      } else {
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--danger)">✕ Error al guardar el operario.</span>`;
      }
    } catch (err) { console.error(err); }
  };

  const eliminarUsuarioBBDD = async (id) => {
    if (!confirm('¿Estás seguro de que deseas revocar el acceso a este operario?')) return;
    try {
      const res = await fetch(`${state.apiBase}/usuarios?id=eq.${id}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarUsuarios();
        if (els.usuariosMsg) els.usuariosMsg.innerHTML = `<span style="color:var(--warning)">✓ Operario eliminado del sistema.</span>`;
      }
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // ⚙️ INICIALIZACIÓN MÓDULO LISTENERS GLOBAL
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
    if (els.btnCancelarUser) {
      els.btnCancelarUser.addEventListener('click', () => {
        userForm?.reset();
        if (els.usuariosMsg) els.usuariosMsg.textContent = '';
      });
    }

    // Búsqueda en tiempo real de usuarios
    if (els.userSearch) els.userSearch.addEventListener('input', renderUsuarios);
    if (els.userRoleFilter) els.userRoleFilter.addEventListener('change', renderUsuarios);

    // Comportamiento del modal
    if (els.btnCerrarModal) els.btnCerrarModal.addEventListener('click', () => els.modalFicha?.classList.remove('open'));
    if (els.modalFicha) {
      els.modalFicha.addEventListener('click', (e) => {
        if (e.target === els.modalFicha) els.modalFicha.classList.remove('open');
      });
    }

    // Drag & Drop modular
    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.classList.add('drag-over'); });
      els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag-over'));
      els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) procesarArchivoJSON(e.dataTransfer.files[0]);
      });
      els.jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) procesarArchivoJSON(e.target.files[0]);
      });
    }
  };

  // Arranque seguro de ciclo de vida de la SPA
  document.addEventListener('DOMContentLoaded', () => {
    inicializarNavegacionSPA();
    inicializarEventosGlobales();
    verificarPersistenciaSesion();
  });
})();
