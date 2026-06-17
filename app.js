(function () {
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    records: [],
    map: null,
    markers: [],
    heatLayer: null,
    currentMapMode: 'normal',
    poblacionesGps: {},
    charts: { provincias: null, regimen: null }
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
    kpiVolumenEconomico: document.getElementById('kpiVolumenEconomico'),
    advSearch: document.getElementById('advSearch'),
    advType: document.getElementById('advType'),
    advDistanceTown: document.getElementById('advDistanceTown'),
    btnEjecutarFiltro: document.getElementById('btnEjecutarFiltro'),
    recordsBody: document.getElementById('recordsBody'),
    manualRecordForm: document.getElementById('manualRecordForm'),
    userAdminForm: document.getElementById('userAdminForm'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    oldPassword: document.getElementById('oldPassword'),
    newPassword: document.getElementById('newPassword'),
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
  // 🔐 ACCESO E INFRAESTRUCTURA DE SESIÓN
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
    }, 150);
  };

  const verificarPersistenciaSesion = () => {
    const sesionGuardada = localStorage.getItem('session_user');
    if (sesionGuardada) inicializarSesion(JSON.parse(sesionGuardada));
    else if (els.authView) els.authView.style.display = 'grid';
  };

  // ==========================================
  // 🔄 MOTORES DE CAMBIO Y ADM DE CLAVES (RESPUESTA A TU PREGUNTA)
  // ==========================================
  const handleAutogestionPassword = async (e) => {
    e.preventDefault();
    const sesionActual = JSON.parse(localStorage.getItem('session_user'));
    if (!sesionActual) return;

    const claveVieja = els.oldPassword.value;
    const claveNueva = els.newPassword.value.trim();

    if (claveNueva.length < 6) {
      alert("La nueva clave debe tener al menos 6 caracteres.");
      return;
    }

    // 1. Validar que conoce su contraseña actual contrastando la API
    if (sesionActual.password !== claveVieja) {
      alert("La contraseña actual introducida es errónea.");
      return;
    }

    try {
      // 2. Realizar PATCH selectivo usando el ID de la sesión del usuario activo
      const res = await fetch(`${state.apiBase}/usuarios?id=eq.${sesionActual.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: claveNueva })
      });

      if (res.ok) {
        alert("Contraseña modificada con éxito.");
        // Sincronizar estado de sesión local
        sesionActual.password = claveNueva;
        localStorage.setItem('session_user', JSON.stringify(sesionActual));
        els.changePasswordForm.reset();
        document.querySelector('.nav a[data-page="dashboard"]').click();
      } else {
        alert("Error al intentar procesar el cambio en la API central.");
      }
    } catch {
      alert("Fallo de enlace con la base de datos.");
    }
  };

  const handleAltaUsuarioAdmin = async (e) => {
    e.preventDefault();
    const item = Object.fromEntries(new FormData(e.target).entries());

    try {
      const res = await fetch(`${state.apiBase}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        alert('Nuevo operario indexado con éxito.');
        e.target.reset();
        document.querySelector('.nav a[data-page="dashboard"]').click();
      } else { alert('Error: El email técnico ya existe.'); }
    } catch { alert('Error de enlace.'); }
  };

  // ==========================================
  // 🗺️ GIS MODULE (MAPA OSCURO CORPORATIVO)
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    state.map = L.map('map').setView([36.8381, -2.4597], 10);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(state.map);
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
    const conteoLocalidades = {};
    const conteoRegimen = { "Secano": 0, "Regadío": 0 };

    datosFiltrados.forEach(r => {
      if (r.localidad) {
        conteoLocalidades[r.localidad] = (conteoLocalidades[r.localidad] || 0) + 1;
      }
      if (String(r.tipo).toLowerCase().includes('invernadero') || String(r.tipo).toLowerCase().includes('regadio')) {
        conteoRegimen["Regadío"]++;
      } else {
        conteoRegimen["Secano"]++;
      }
    });

    if (state.charts.provincias) state.charts.provincias.destroy();
    const ctxProv = document.getElementById('chartProvincias').getContext('2d');
    state.charts.provincias = new Chart(ctxProv, {
      type: 'bar',
      data: {
        labels: Object.keys(conteoLocalidades),
        datasets: [{
          label: 'Fincas',
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
  // 🔄 FILTRADO PRINCIPAL Y VOLCADO GIS
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

    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];
    if (state.heatLayer) state.map.removeLayer(state.heatLayer);

    const query = els.advSearch ? els.advSearch.value.trim().toLowerCase() : '';
    const filterType = els.advType ? els.advType.value : '';
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
      return matchText && matchType;
    });

    if (coordenadasCentro) {
      filtrados.sort((a, b) => (a._distancia === null ? 1 : b._distancia === null ? -1 : a._distancia - b._distancia));
    }

    if (els.kpiTotal) els.kpiTotal.textContent = filtrados.length;
    
    if (els.kpiVolumenEconomico) {
      const sumaTotal = filtrados.reduce((acc, current) => acc + (Number(current.valor) || 0), 0);
      els.kpiVolumenEconomico.textContent = sumaTotal.toLocaleString('es-ES') + ' €';
    }

    renderizarGraficasCorporativas(filtrados);

    const heatPoints = [];

    if (filtrados.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Sin resultados técnicos en el cuadrante.</td></tr>`;
      return;
    }

    els.recordsBody.innerHTML = filtrados.map(r => {
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—';
      const valorEuro = Number(r.valor || 0).toLocaleString('es-ES') + ' €';

      if (r.lote && state.map) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          const lat = parseFloat(c[0]);
          const lng = parseFloat(c[1]);
          heatPoints.push([lat, lng, 1.0]);

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
        <td style="color:var(--brand-orange); font-weight:600;">${distTexto}</td>
        <td><strong>${valorEuro}</strong></td>
      </tr>`;
    }).join('');

    if (state.currentMapMode === 'heat' && heatPoints.length > 0 && typeof L.heatLayer === 'function') {
      state.heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 10 }).addTo(state.map);
    }

    Array.from(els.recordsBody.querySelectorAll('tr')).forEach(tr => {
      tr.addEventListener('click', () => {
        const targetId = tr.getAttribute('data-id');
        const item = state.records.find(x => String(x.id) === String(targetId));
        if (item) abrirVisorFichaCompleta(item);
      });
    });
  };

  const abrirVisorFichaCompleta = (item) => {
    if (!els.detailsModal || !els.modalDataContent) return;
    els.modalDataContent.innerHTML = `
      <div class="modal-field"><span>Referencia Catastral</span><p>${escapeHtml(item.referencia)}</p></div>
      <div class="modal-field"><span>Clase de Terreno / Régimen</span><p>${escapeHtml(item.tipo)}</p></div>
      <div class="modal-field"><span>Propietario / Solicitante</span><p>${escapeHtml(item.propietario)}</p></div>
      <div class="modal-field"><span>Paraje / Ubicación</span><p>${escapeHtml(item.localidad)}</p></div>
      <div class="modal-field"><span>Coordenadas de Capa (Lat, Lng)</span><p>${escapeHtml(item.lote || '—')}</p></div>
      <div class="modal-field"><span>Fecha Indexación</span><p>${escapeHtml(item.fecha || '—')}</p></div>
      <div class="modal-field"><span>Valor Adoptado Real</span><p style="color:var(--success); font-weight:700;">${Number(item.valor || 0).toLocaleString('es-ES')} €</p></div>
    `;
    els.detailsModal.style.display = 'grid';
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const item = Object.fromEntries(new FormData(e.target).entries());
    item.valor = Number(item.valor) || 0;
    item.fecha = new Date().toISOString().slice(0, 10);
    item.estado = "Finalizado";

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
                estado: "Finalizado",
                fecha: new Date().toISOString().slice(0, 10),
                valor: vNum
              };
            } else { item = raw; item.estado = "Finalizado"; }
            await fetch(`${state.apiBase}/importacion_tasaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
          } catch {}
          resolve();
        };
        reader.readAsText(files[i]);
      });
    }
    els.importProgress.innerHTML = '<strong>✅ Volcado masivo completado. Haz clic en "Filtrar" para actualizar los gráficos y mapas.</strong>';
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
      
      if (a.dataset.page === 'dashboard' && state.map) {
        setTimeout(() => state.map.invalidateSize(), 50);
      }
    }));
    
    if (els.btnEjecutarFiltro) els.btnEjecutarFiltro.addEventListener('click', renderSistemaCompleto);
    if (els.manualRecordForm) els.manualRecordForm.addEventListener('submit', handleManualSubmit);
    if (els.userAdminForm) els.userAdminForm.addEventListener('submit', handleAltaUsuarioAdmin);
    if (els.changePasswordForm) els.changePasswordForm.addEventListener('submit', handleAutogestionPassword);
    if (els.btnCerrarModal) els.btnCerrarModal.addEventListener('click', () => els.detailsModal.style.display = 'none');

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
