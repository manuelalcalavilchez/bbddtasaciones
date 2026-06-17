(function () {
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    records: [],
    map: null,
    markers: [],
    heatLayer: null,     // Capa del mapa de calor
    currentMapMode: 'normal', // 'normal' o 'heat'
    poblacionesGps: {},
    charts: { provincias: null, regimen: null } // Instancias de Chart.js
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
    advStatus: document.getElementById('advStatus'),
    advDistanceTown: document.getElementById('advDistanceTown'),
    btnEjecutarFiltro: document.getElementById('btnEjecutarFiltro'),
    recordsBody: document.getElementById('recordsBody'),
    manualRecordForm: document.getElementById('manualRecordForm'),
    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),
    detailsModal: document.getElementById('detailsModal'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
    modalDataContent: document.getElementById('modalDataContent'),
    btnMapNormal: document.getElementById('btnMapNormal'),
    btnMapHeat: document.getElementById('btnMapHeat')
  };

  // ==========================================
  // 🔐 ACCESO INFRAESTRUCTURA
  // ==========================================
  const ejecutarLogin = async () => {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (els.loginError) els.loginError.textContent = ''; 

    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      const userArray = await res.json();
      if (userArray.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(userArray[0]));
        inicializarSesion(userArray[0]);
      } else { els.loginError.textContent = 'Fallo de autenticación.'; }
    } catch { els.loginError.textContent = 'Servidor inaccesible.'; }
  };

  const inicializarSesion = (user) => {
    if (els.userBadge) els.userBadge.textContent = user.email;
    if (els.authView) els.authView.style.display = 'none';
    if (els.appView) els.appView.style.display = 'flex';
    
    setTimeout(() => {
      inicializarMapaGis();
      cargarTasacionesDesdeBBDD();
    }, 100);
  };

  // ==========================================
  // 🗺️ GIS MODULE (CON SOPORTE MAPA DE CALOR)
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    // Centramos el radar técnico en Almería por defecto
    state.map = L.map('map').setView([36.8381, -2.4597], 10);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(state.map); // Capa oscura corporativa elegante
  };

  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  // ==========================================
  // 📊 MOTORES ANALÍTICOS (CHART.JS)
  // ==========================================
  const renderizarGraficasCorporativas = (datosFiltrados) => {
    // 1. Procesar datos para Municipios / Localidades
    const conteoLocalidades = {};
    const conteoRegimen = { "Secano": 0, "Regadío": 0 };

    datosFiltrados.forEach(r => {
      // Localidades
      conteoLocalidades[r.localidad] = (conteoLocalidades[r.localidad] || 0) + 1;
      
      // Clasificación Secano vs Regadío simplificada para tasadores
      if (String(r.tipo).toLowerCase().includes('invernadero') || String(r.tipo).toLowerCase().includes('regadio')) {
        conteoRegimen["Regadío"]++;
      } else {
        conteoRegimen["Secano"]++;
      }
    });

    // Gráfico 1: Barras de Poblaciones
    if (state.charts.provincias) state.charts.provincias.destroy();
    const ctxProv = document.getElementById('chartProvincias').getContext('2d');
    state.charts.provincias = new Chart(ctxProv, {
      type: 'bar',
      data: {
        labels: Object.keys(conteoLocalidades),
        datasets: [{
          label: 'Fincas Mapeadas',
          data: Object.values(conteoLocalidades),
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, x: { ticks: { color: '#64748b' }, grid: { display: false } } }
      }
    });

    // Gráfico 2: Doughnut de Régimen Hidrológico
    if (state.charts.regimen) state.charts.regimen.destroy();
    const ctxReg = document.getElementById('chartRegimen').getContext('2d');
    state.charts.regimen = new Chart(ctxReg, {
      type: 'doughnut',
      data: {
        labels: Object.keys(conteoRegimen),
        datasets: [{
          data: Object.values(conteoRegimen),
          backgroundColor: ['#f97316', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#f1f5f9' } } }
      }
    });
  };

  // ==========================================
  // 🔄 FILTRADO, MAPA DE CALOR Y TABLA
  // ==========================================
  const cargarTasacionesDesdeBBDD = async () => {
    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones?order=fecha.desc`);
      if (response.ok) {
        state.records = await response.json();
        state.records.forEach(r => {
          if (r.localidad && r.lote) {
            const c = r.lote.split(',');
            if (c.length === 2 && !state.poblacionesGps[r.localidad]) {
              state.poblacionesGps[r.localidad] = { lat: parseFloat(c[0]), lng: parseFloat(c[1]) };
            }
          }
        });
        
        // Alimentar selector dinámico
        if (els.advDistanceTown) {
          const prev = els.advDistanceTown.value;
          els.advDistanceTown.innerHTML = '<option value="">— Seleccionar Centro —</option>';
          Object.keys(state.poblacionesGps).sort().forEach(m => {
            els.advDistanceTown.innerHTML += `<option value="${m}">${m}</option>`;
          });
          els.advDistanceTown.value = prev;
        }

        renderSistemaCompleto();
      }
    } catch (err) { console.error(err); }
  };

  const renderSistemaCompleto = () => {
    if (!els.recordsBody) return;

    // Limpiar capas del mapa viejas
    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];
    if (state.heatLayer) state.map.removeLayer(state.heatLayer);

    const query = els.advSearch ? els.advSearch.value.trim().toLowerCase() : '';
    const filterType = els.advType ? els.advType.value : '';
    const filterStatus = els.advStatus ? els.advStatus.value : '';
    const centroReferencia = els.advDistanceTown ? els.advDistanceTown.value : '';

    let coordenadasCentro = centroReferencia ? state.poblacionesGps[centroReferencia] : null;

    let filtrados = state.records.map(r => {
      let dist = null;
      if (r.lote && coordenadasCentro) {
        const c = r.lote.split(',');
        if (c.length === 2) dist = calcularDistanciaKm(coordenadasCentro.lat, coordenadasCentro.lng, parseFloat(c[0]), parseFloat(c[1]));
      }
      return { ...r, _distancia: dist };
    }).filter(r => {
      const matchText = !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query));
      const matchType = !filterType || r.tipo === filterType;
      const estadoReal = r.estado === 'Pendiente' ? 'En proceso' : r.estado;
      const matchStatus = !filterStatus || estadoReal === filterStatus;
      return matchText && matchType && matchStatus;
    });

    if (coordenadasCentro) {
      filtrados.sort((a, b) => (a._distancia === null ? 1 : b._distancia === null ? -1 : a._distancia - b._distancia));
    }

    // Refrescar KPIs de Consola
    if (els.kpiTotal) els.kpiTotal.textContent = state.records.length;
    if (els.kpiPending) els.kpiPending.textContent = state.records.filter(r => r.estado !== 'Finalizado').length;
    if (els.kpiDone) els.kpiDone.textContent = state.records.filter(r => r.estado === 'Finalizado').length;

    // Dibujar Gráficos Corporativos con la muestra actual
    renderizarGraficasCorporativas(filtrados);

    // Preparar puntos de Calor GIS
    const heatPoints = [];

    els.recordsBody.innerHTML = filtrados.map(r => {
      const estadoReal = r.estado === 'Pendiente' ? 'En proceso' : r.estado;
      const badgeClass = estadoReal === 'Finalizado' ? 'finalizado' : 'proceso';
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—';
      const valorEuro = Number(r.valor || 0).toLocaleString('es-ES') + ' €';

      if (r.lote && state.map) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          const lat = parseFloat(c[0]);
          const lng = parseFloat(c[1]);
          
          // Guardamos para mapa de calor (Lat, Lng, Intensidad basada en valor económico)
          heatPoints.push([lat, lng, Math.min(r.valor / 50000, 1)]);

          // Añadimos marcador clásico (solo visible si estamos en modo normal)
          const marker = L.marker([lat, lng]).bindPopup(`<b>Ref: ${r.referencia}</b><br>${valorEuro}`);
          if (state.currentMapMode === 'normal') marker.addTo(state.map);
          state.markers.push(marker);
        }
      }

      return `<tr data-id="${r.id}">
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td><span class="badge ${badgeClass}">● ${escapeHtml(estadoReal)}</span></td>
        <td style="color:var(--brand-orange); font-weight:600;">${distTexto}</td>
        <td><strong>${valorEuro}</strong></td>
      </tr>`;
    }).join('');

    // Si está activo el modo térmico, inyectamos la matriz de calor en Leaflet
    if (state.currentMapMode === 'heat' && heatPoints.length > 0) {
      state.heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 12 }).addTo(state.map);
    }

    // Eventos de clic en la fila para abrir ficha de auditoría
    Array.from(els.recordsBody.querySelectorAll('tr')).forEach(tr => {
      tr.addEventListener('click', () => {
        const item = state.records.find(x => String(x.id) === String(tr.getAttribute('data-id')));
        if (item) abrirFichaCompleta(item);
      });
    });
  };

  const abrirFichaCompleta = (item) => {
    const estadoReal = item.estado === 'Pendiente' ? 'En proceso' : item.estado;
    els.modalDataContent.innerHTML = `
      <div class="modal-field"><span>Referencia Catastral</span><p>${escapeHtml(item.referencia)}</p></div>
      <div class="modal-field"><span>Régimen / Tipo</span><p>${escapeHtml(item.tipo)}</p></div>
      <div class="modal-field"><span>Propietario Legal</span><p>${escapeHtml(item.propietario)}</p></div>
      <div class="modal-field"><span>Paraje / Localidad</span><p>${escapeHtml(item.localidad)}</p></div>
      <div class="modal-field"><span>Ubicación Hardware GPS</span><p>${escapeHtml(item.lote || '—')}</p></div>
      <div class="modal-field"><span>Fecha Registro</span><p>${escapeHtml(item.fecha || '—')}</p></div>
      <div class="modal-field"><span>Estado Interno</span><p>● ${escapeHtml(estadoReal)}</p></div>
      <div class="modal-field"><span>Valoración Adoptada</span><p style="color:var(--success); font-weight:700;">${Number(item.valor || 0).toLocaleString('es-ES')} €</p></div>
    `;
    els.detailsModal.style.display = 'grid';
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const item = Object.fromEntries(new FormData(e.target).entries());
    item.valor = Number(item.valor) || 0;
    item.fecha = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetch(`${state.apiBase}/importacion_tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        alert('Registro indexado con éxito.');
        e.target.reset();
        await cargarTasacionesDesdeBBDD();
        document.querySelector('.nav a[data-page="dashboard"]').click();
      } else { alert('Error: Referencia Catastral duplicada.'); }
    } catch { alert('Error de enlace.'); }
  };

  const procesarArchivoJSON = async (files) => {
    if (!files || files.length === 0) return;
    els.importProgress.style.display = 'block';
    
    for (let i = 0; i < files.length; i++) {
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            let raw = JSON.parse(e.target.result);
            let item = {};
            if (raw.identificacion_informe || raw.datos_catastrales) {
              let vStr = raw.valores_tasacion?.valor_comparacion?.valor_total || "0";
              let vNum = Number(vStr.replace(/\./g, '').split(',')[0].replace(/[^0-9]/g, '')) || 0;
              item = {
                referencia: raw.datos_catastrales?.referencias?.[0]?.referencia_catastral || ("S/R-" + Date.now()),
                tipo: raw.identificacion_y_localizacion?.clase_general_inmueble || "Finca Rústica",
                propietario: raw.identificacion_informe?.tasador?.nombre || "Técnico Corporativo",
                localidad: raw.identificacion_y_localizacion?.paraje || "Almería",
                lote: `${raw.identificacion_y_localizacion?.coordenadas_gps?.latitud || "36.8381"},${raw.identificacion_y_localizacion?.coordenadas_gps?.longitud || "-2.4597"}`,
                estado: "En proceso",
                fecha: new Date().toISOString().slice(0, 10),
                valor: vNum
              };
            } else { item = raw; }
            await fetch(`${state.apiBase}/importacion_tasaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
          } catch {}
          resolve();
        };
        reader.readAsText(files[i]);
      });
    }
    els.importProgress.innerHTML = '<strong>✅ Volcado completado. Actualice el filtro del Dashboard para visualizar los nuevos datos geográficos.</strong>';
    await cargarTasacionesDesdeBBDD();
  };

  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const bindEvents = () => {
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.btnLogout) els.btnLogout.addEventListener('click', () => { localStorage.removeItem('session_user'); location.reload(); });
    
    document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
      document.getElementById(`page-${a.dataset.page}`).classList.add('active');
    }));
    
    if (els.btnEjecutarFiltro) els.btnEjecutarFiltro.addEventListener('click', renderSistemaCompleto);
    if (els.manualRecordForm) els.manualRecordForm.addEventListener('submit', handleManualSubmit);
    if (els.btnCerrarModal) els.btnCerrarModal.addEventListener('click', () => els.detailsModal.style.display = 'none');

    // Controladores del conmutador de mapas (Normal vs Calor)
    if (els.btnMapNormal) els.btnMapNormal.addEventListener('click', () => {
      state.currentMapMode = 'normal';
      els.btnMapNormal.classList.add('active');
      els.btnMapHeat.classList.remove('active');
      renderSistemaCompleto();
    });
    if (els.btnMapHeat) els.btnMapHeat.addEventListener('click', () => {
      state.currentMapMode = 'heat';
      els.btnMapHeat.classList.add('active');
      els.btnMapNormal.classList.remove('active');
      renderSistemaCompleto();
    });

    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.jsonFileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) procesarArchivoJSON(e.target.files); });
    }
  };

  document.addEventListener('DOMContentLoaded', () => { bindEvents(); verificarPersistenciaSesion(); });
})();
