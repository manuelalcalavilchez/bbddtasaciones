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

  // Mapeo unificado con los IDs exactos del index.html [cite: 141]
  const els = {
    // Vistas principales [cite: 141]
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    
    // Login [cite: 141]
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'), // [cite: 249]
    btnLogin: document.getElementById('btnLogin'), // [cite: 249]
    btnLogout: document.getElementById('btnLogout'), // [cite: 249]
    loginError: document.getElementById('loginError'), // [cite: 249]
    userBadge: document.getElementById('userBadge'), // [cite: 249]

    // KPIs Dashboard [cite: 141]
    kpiTotal: document.getElementById('kpiTotal'), // [cite: 249]
    kpiPending: document.getElementById('kpiPending'), // [cite: 249]
    kpiDone: document.getElementById('kpiDone'), // [cite: 249]

    // Filtros Avanzados (Sección Dashboard) [cite: 141]
    advSearch: document.getElementById('advSearch'), // [cite: 249]
    advType: document.getElementById('advType'), // [cite: 249]
    advMunicipio: document.getElementById('advMunicipio'), // [cite: 249]
    advStatus: document.getElementById('advStatus'), // [cite: 249]
    advValueRange: document.getElementById('advValueRange'), // [cite: 249]
    advSurfaceRange: document.getElementById('advSurfaceRange'), // [cite: 249]
    advDateFrom: document.getElementById('advDateFrom'), // [cite: 249]
    advDateTo: document.getElementById('advDateTo'), // [cite: 249]
    advDistanceTown: document.getElementById('advDistanceTown'), // [cite: 249]
    mapCounter: document.getElementById('mapCounter'), // [cite: 250]

    // Tablas contenedoras [cite: 141]
    recordsBody: document.getElementById('recordsBody'),         // Dashboard [cite: 141, 142]
    recordsBodyFull: document.getElementById('recordsBodyFull'), // Base de Datos Completa [cite: 141, 142]

    // Dropzone / Importación [cite: 141]
    dropZone: document.getElementById('dropZone'), // [cite: 142]
    jsonFileInput: document.getElementById('jsonFileInput'), // [cite: 142]
    importProgress: document.getElementById('importProgress'), // [cite: 142]

    // Gestión de Usuarios [cite: 141]
    userSearch: document.getElementById('userSearch'), // [cite: 142]
    userRoleFilter: document.getElementById('userRoleFilter'), // [cite: 142]
    usersBody: document.getElementById('usuariosBody'),          // "usuariosBody" en HTML [cite: 141, 142]
    usuariosMsg: document.getElementById('usuariosMsg'), // [cite: 142]
    
    // Modales (Ficha detalle e Info de usuario) [cite: 141, 142]
    modalFicha: document.getElementById('modal-ficha'), // [cite: 142]
    modalContenido: document.getElementById('modal-contenido'), // [cite: 142]
    btnCerrarModal: document.getElementById('btnCerrarModal'), // [cite: 142]
  };

  const log = (text) => { console.log(`[LOG] ${text}`); }; // [cite: 143]
  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); // [cite: 143]
  const formatEuro = (val) => Number(val || 0).toLocaleString('es-ES') + ' €'; // [cite: 144]

  const parseRange = (str) => { // [cite: 145]
    if (!str) return null; // [cite: 145]
    const parts = str.split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)); // [cite: 145]
    if (parts.length === 1) return { min: parts[0], max: null }; // [cite: 146]
    if (parts.length >= 2) return { min: parts[0], max: parts[1] }; // [cite: 147]
    return null; // [cite: 147]
  };

  const inRange = (val, range) => { // [cite: 148]
    if (!range) return true; // [cite: 148]
    const n = Number(val); // [cite: 148]
    if (isNaN(n)) return false; // [cite: 148]
    if (range.min !== null && n < range.min) return false; // [cite: 149]
    if (range.max !== null && n > range.max) return false; // [cite: 149]
    return true; // [cite: 150]
  };

  const inDateRange = (dateStr, from, to) => { // [cite: 150]
    if (!dateStr) return true; // [cite: 150]
    const d = new Date(dateStr); // [cite: 150]
    if (from && d < new Date(from)) return false; // [cite: 151]
    if (to && d > new Date(to)) return false; // [cite: 151]
    return true; // [cite: 151]
  };

  // ==========================================
  // 🔐 AUTENTICACIÓN Y NAVEGACIÓN
  // ==========================================
  const ejecutarLogin = async () => {
    if (!els.loginEmail || !els.loginPassword) return; // [cite: 152]
    const email = els.loginEmail.value.trim(); // [cite: 153]
    const password = els.loginPassword.value; // [cite: 153]
    if (els.loginError) els.loginError.textContent = ''; // [cite: 153]
    try {
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`); // [cite: 153]
      if (!res.ok) { // [cite: 154]
        const errBody = await res.json().catch(() => ({})); // [cite: 154]
        if (els.loginError) els.loginError.textContent = `Error del servidor (${res.status}): ${errBody.message || 'sin detalle'}`; // [cite: 154, 155]
        return; // [cite: 155]
      }
      const userArray = await res.json(); // [cite: 155]
      if (Array.isArray(userArray) && userArray.length > 0) { // [cite: 155]
        localStorage.setItem('session_user', JSON.stringify(userArray[0])); // [cite: 155]
        inicializarSesionDeUsuario(userArray[0]); // [cite: 155]
      } else {
        if (els.loginError) els.loginError.textContent = 'Credenciales no válidas en PostgreSQL.'; // [cite: 156]
      }
    } catch (err) {
      if (els.loginError) els.loginError.textContent = 'Fallo de red: ' + err.message; // [cite: 157]
    }
  };

  const inicializarSesionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `${user.email} (${user.rol || 'tasador'})`; // [cite: 158]
    if (els.authView) els.authView.style.display = 'none'; // [cite: 158]
    if (els.appView) els.appView.style.display = 'flex'; // [cite: 159]
    
    inicializarMapaGis(); // [cite: 159]
    cargarTasacionesDesdeBBDD(); // [cite: 159]
    cargarUsuarios();
  };

  const verificarPersistenciaSesion = () => {
    const sesionGuardada = localStorage.getItem('session_user'); // [cite: 159]
    if (sesionGuardada) { // [cite: 160]
      inicializarSesionDeUsuario(JSON.parse(sesionGuardada)); // [cite: 160]
    } else {
      if (els.authView) els.authView.style.display = 'grid'; // [cite: 160]
      if (els.appView) els.appView.style.display = 'none'; // [cite: 160]
    }
  };

  const ejecutarLogout = () => {
    localStorage.removeItem('session_user'); // [cite: 161]
    location.reload(); // [cite: 161]
  };

  const inicializarNavegacion = () => {
    const links = document.querySelectorAll('.nav a[data-target]'); // [cite: 161]
    const sections = document.querySelectorAll('.view-section'); // [cite: 162]
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSectionId = link.getAttribute('data-target'); // [cite: 162]

        links.forEach(l => l.classList.remove('active')); // [cite: 162]
        sections.forEach(s => s.classList.remove('active')); // [cite: 162]

        link.classList.add('active'); // [cite: 162]
        const targetSection = document.getElementById(targetSectionId); // [cite: 162]
        if (targetSection) targetSection.classList.add('active'); // [cite: 162]

        if (targetSectionId === 'sec-dashboard' && state.map) { // [cite: 162]
          setTimeout(() => state.map.invalidateSize(), 200); // [cite: 162]
        }
      });
    });
  };

  // ==========================================
  // 🗺️ MAPA GIS
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return; // [cite: 163]
    state.map = L.map('map').setView([36.8381, -2.4597], 10); // [cite: 164]
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // [cite: 164]
      attribution: '&copy; OpenStreetMap contributors' // [cite: 164]
    }).addTo(state.map); // [cite: 164]
  };

  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null; // [cite: 165]
    const R = 6371; // [cite: 166]
    const dLat = (lat2 - lat1) * Math.PI / 180; // [cite: 166]
    const dLon = (lon2 - lon1) * Math.PI / 180; // [cite: 167]
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + // [cite: 168]
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); // [cite: 168]
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // [cite: 169]
    return R * c; // [cite: 169]
  };

  const actualizarSelectorPoblaciones = () => {
    if (!els.advDistanceTown) return; // [cite: 170]
    const valorSeleccionadoPrevio = els.advDistanceTown.value; // [cite: 170]
    els.advDistanceTown.innerHTML = '<option value="">— Sin ordenar por Cercanía —</option>'; // [cite: 171]
    Object.keys(state.poblacionesGps).sort().forEach(municipio => { // [cite: 171]
      const option = document.createElement('option'); // [cite: 171]
      option.value = municipio; // [cite: 171]
      option.textContent = municipio; // [cite: 171]
      els.advDistanceTown.appendChild(option); // [cite: 171]
    });
    els.advDistanceTown.value = valorSeleccionadoPrevio; // [cite: 172]
  };

  const actualizarSelectorMunicipios = () => {
    if (!els.advMunicipio) return; // [cite: 172]
    const valorSeleccionadoPrevio = els.advMunicipio.value; // [cite: 172]
    els.advMunicipio.innerHTML = '<option value="">Todos los municipios</option>'; // [cite: 173]
    const municipios = [...new Set(state.records.map(r => r.localidad).filter(Boolean))].sort(); // [cite: 173]
    municipios.forEach(m => { // [cite: 174]
      const option = document.createElement('option'); // [cite: 174]
      option.value = m; // [cite: 174]
      option.textContent = m; // [cite: 174]
      els.advMunicipio.appendChild(option); // [cite: 174]
    });
    els.advMunicipio.value = valorSeleccionadoPrevio; // [cite: 174]
  };

  // ==========================================
  // 📊 GRÁFICAS (Chart.js v4)
  // ==========================================
  const destroyCharts = () => {
    Object.values(state.charts).forEach(chart => chart.destroy()); // [cite: 175]
    state.charts = {}; // [cite: 176]
  };

  const renderCharts = () => {
    destroyCharts(); // [cite: 176]
    const ctx = { // [cite: 177]
      type: document.getElementById('chartType')?.getContext('2d'), // [cite: 177]
      status: document.getElementById('chartStatus')?.getContext('2d'), // [cite: 177]
      municipios: document.getElementById('chartMunicipios')?.getContext('2d'), // [cite: 177]
      valorSuperficie: document.getElementById('chartValorSuperficie')?.getContext('2d'), // [cite: 177]
    };
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']; // [cite: 178]
    
    if (ctx.type) { // [cite: 178]
      const typeCounts = {}; // [cite: 178]
      state.records.forEach(r => { if(r.tipo) typeCounts[r.tipo] = (typeCounts[r.tipo] || 0) + 1; }); // [cite: 179]
      state.charts.type = new Chart(ctx.type, { // [cite: 180]
        type: 'doughnut', // [cite: 180]
        data: { // [cite: 180]
          labels: Object.keys(typeCounts), // [cite: 180]
          datasets: [{ data: Object.values(typeCounts), backgroundColor: colors, borderWidth: 0 }] // [cite: 180]
        }, // [cite: 180]
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter', size: 11 } } } } } // [cite: 180]
      }); // [cite: 180]
    }

    if (ctx.status) { // [cite: 181]
      const statusCounts = {}; // [cite: 181]
      state.records.forEach(r => { if(r.estado) statusCounts[r.estado] = (statusCounts[r.estado] || 0) + 1; }); // [cite: 181]
      const statusColors = { 'Finalizado': '#22c55e', 'En proceso': '#3b82f6', 'Pendiente': '#f59e0b' }; // [cite: 182]
      state.charts.status = new Chart(ctx.status, { // [cite: 183]
        type: 'pie', // [cite: 183]
        data: { // [cite: 183]
          labels: Object.keys(statusCounts), // [cite: 183]
          datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(k => statusColors[k] || '#64748b'), borderWidth: 0 }] // [cite: 183]
        }, // [cite: 183]
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter', size: 11 } } } } } // [cite: 183]
      }); // [cite: 183]
    }

    if (ctx.municipios) { // [cite: 184]
      const muniCounts = {}; // [cite: 184]
      state.records.forEach(r => { if (r.localidad) muniCounts[r.localidad] = (muniCounts[r.localidad] || 0) + 1; }); // [cite: 184]
      const sorted = Object.entries(muniCounts).sort((a,b) => b[1] - a[1]).slice(0, 10); // [cite: 185]
      state.charts.municipios = new Chart(ctx.municipios, { // [cite: 185]
        type: 'bar', // [cite: 185]
        data: { // [cite: 185]
          labels: sorted.map(s => s[0]), // [cite: 185]
          datasets: [{ label: 'Expedientes', data: sorted.map(s => s[1]), backgroundColor: '#3b82f6', borderRadius: 4 }] // [cite: 185]
        }, // [cite: 185]
        options: { // [cite: 185]
          indexAxis: 'y', // [cite: 185]
          responsive: true, // [cite: 185]
          maintainAspectRatio: false, // [cite: 185]
          plugins: { legend: { display: false } }, // [cite: 185]
          scales: { // [cite: 185]
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, // [cite: 185]
            y: { ticks: { color: '#94a3b8' }, grid: { display: false } } // [cite: 185]
          } // [cite: 185]
        } // [cite: 185]
      }); // [cite: 185]
    }

    if (ctx.valorSuperficie) { // [cite: 186]
      const scatterData = state.records // [cite: 186]
        .filter(r => r.valor && r.superficie) // [cite: 186]
        .map(r => ({ x: Number(r.superficie), y: Number(r.valor) })) // [cite: 186]
        .slice(0, 200); // [cite: 186]
      state.charts.valorSuperficie = new Chart(ctx.valorSuperficie, { // [cite: 187]
        type: 'scatter', // [cite: 187]
        data: { // [cite: 187]
          datasets: [{ // [cite: 187]
            label: 'Valor (€) vs Superficie (m²)', // [cite: 187]
            data: scatterData, // [cite: 187]
            backgroundColor: 'rgba(59, 130, 246, 0.6)', // [cite: 187]
            pointRadius: 4 // [cite: 187]
          }] // [cite: 187]
        }, // [cite: 187]
        options: { // [cite: 187]
          responsive: true, // [cite: 187]
          maintainAspectRatio: false, // [cite: 187]
          plugins: { legend: { labels: { color: '#f8fafc' } } }, // [cite: 187]
          scales: { // [cite: 187]
            x: { title: { display: true, text: 'Superficie (m²)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, // [cite: 187]
            y: { title: { display: true, text: 'Valor (€)', color: '#94a3b8' }, ticks: { color: '#94a3b8', callback: v => (v/1000).toFixed(0)+'k' }, grid: { color: '#334155' } } // [cite: 187]
          } // [cite: 187]
        } // [cite: 187]
      }); // [cite: 187]
    }
  };

  // ==========================================
  // 📑 DATOS Y RENDERS DE TABLAS
  // ==========================================
  const cargarTasacionesDesdeBBDD = async () => {
    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones?order=fecha.desc&limit=1000`); // [cite: 188]
      if (response.ok) { // [cite: 189]
        state.records = await response.json(); // [cite: 189]
        state.records.forEach(r => { // [cite: 189]
          if (r.localidad && r.lote) { // [cite: 189]
            const coords = r.lote.split(','); // [cite: 189]
            if (coords.length === 2 && !state.poblacionesGps[r.localidad]) { // [cite: 189]
              state.poblacionesGps[r.localidad] = { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) }; // [cite: 189]
            }
          }
        });
        actualizarSelectorPoblaciones(); // [cite: 190]
        actualizarSelectorMunicipios(); // [cite: 190]
        renderSistemaCompleto(); // [cite: 190]
        renderRecordsFull(); // [cite: 190]
        renderCharts(); // [cite: 190]
      }
    } catch (error) {
      console.error("Error cargando BBDD:", error);
    }
  };

  const renderSistemaCompleto = () => {
    if (!els.recordsBody) return; // [cite: 191]
    state.markers.forEach(m => state.map?.removeLayer(m)); // [cite: 191]
    state.markers = []; // [cite: 191]

    const query = els.advSearch?.value.trim().toLowerCase() || ''; // [cite: 191, 192]
    const filterType = els.advType?.value || ''; // [cite: 192]
    const filterMunicipio = els.advMunicipio?.value || ''; // [cite: 192]
    const filterStatus = els.advStatus?.value || ''; // [cite: 192]
    const valueRange = parseRange(els.advValueRange?.value); // [cite: 193]
    const surfaceRange = parseRange(els.advSurfaceRange?.value); // [cite: 193]
    const dateFrom = els.advDateFrom?.value || ''; // [cite: 193]
    const dateTo = els.advDateTo?.value || ''; // [cite: 193]
    const centroReferencia = els.advDistanceTown?.value || ''; // [cite: 194]

    let coordenadasCentro = null; // [cite: 194]
    if (centroReferencia && state.poblacionesGps[centroReferencia]) { // [cite: 194]
      coordenadasCentro = state.poblacionesGps[centroReferencia]; // [cite: 194]
    }

    let filtrados = state.records.map(r => { // [cite: 195]
      let distancia = null; // [cite: 195]
      if (r.lote && coordenadasCentro) { // [cite: 195]
        const c = r.lote.split(','); // [cite: 195]
        if (c.length === 2) { // [cite: 195]
          distancia = calcularDistanciaKm(coordenadasCentro.lat, coordenadasCentro.lng, parseFloat(c[0]), parseFloat(c[1])); // [cite: 195]
        }
      }
      return { ...r, _distancia: distancia }; // [cite: 195]
    }).filter(r => { // [cite: 195]
      const coincideTexto = !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query)); // [cite: 195]
      const coincideTipo = !filterType || r.tipo === filterType; // [cite: 195]
      const coincideMunicipio = !filterMunicipio || r.localidad === filterMunicipio; // [cite: 195]
      const coincideEstado = !filterStatus || r.estado === filterStatus; // [cite: 195]
      const coincideValor = inRange(r.valor, valueRange); // [cite: 195]
      const coincideSuperficie = inRange(r.superficie, surfaceRange); // [cite: 195]
      const coincideFecha = inDateRange(r.fecha, dateFrom, dateTo); // [cite: 195]
      return coincideTexto && coincideTipo && coincideMunicipio && coincideEstado && coincideValor && coincideSuperficie && coincideFecha; // [cite: 195, 196]
    });

    if (coordenadasCentro) { // [cite: 197]
      filtrados.sort((a, b) => { // [cite: 197]
        if (a._distancia === null) return 1; // [cite: 197]
        if (b._distancia === null) return -1; // [cite: 197]
        return a._distancia - b._distancia; // [cite: 197]
      });
    }

    // Actualización de KPIs en UI
    if (els.kpiTotal) els.kpiTotal.textContent = state.records.length; // [cite: 198]
    if (els.kpiPending) els.kpiPending.textContent = state.records.filter(r => r.estado !== 'Finalizado').length; // [cite: 199]
    if (els.kpiDone) els.kpiDone.textContent = state.records.filter(r => r.estado === 'Finalizado').length; // [cite: 199]
    if (els.mapCounter) els.mapCounter.textContent = `${filtrados.length} marcadores activos`; // [cite: 200]

    if (filtrados.length === 0) { // [cite: 200]
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Ningún expediente coincide con los criterios seleccionados.</td></tr>`; // [cite: 200]
      return; // [cite: 201]
    }

    els.recordsBody.innerHTML = filtrados.map(r => { // [cite: 201]
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente'); // [cite: 201]
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—'; // [cite: 201]
      const valorEuro = formatEuro(r.valor); // [cite: 201]

      if (r.lote && state.map) { // [cite: 201]
        const c = r.lote.split(','); // [cite: 201]
        if (c.length === 2) { // [cite: 201]
          const marker = L.marker([parseFloat(c[0]), parseFloat(c[1])]) // [cite: 201]
            .addTo(state.map) // [cite: 201]
            .bindPopup(`<b>Ref: ${escapeHtml(r.referencia)}</b><br>Propietario: ${escapeHtml(r.propietario)}<br>Valor: ${valorEuro}`); // [cite: 201]
          state.markers.push(marker); // [cite: 201]
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
      </tr>`; // [cite: 201]
    }).join('');

    els.recordsBody.querySelectorAll('tr[data-id]').forEach(tr => { // [cite: 202]
      tr.addEventListener('click', () => mostrarDetalleTasacion(tr.dataset.id)); // [cite: 202]
    });
  };

  const renderRecordsFull = () => {
    if (!els.recordsBodyFull) return; // [cite: 202]
    const query = els.userSearch?.value.trim().toLowerCase() || ''; // [cite: 203]
    
    let filtrados = state.records.filter(r => { // [cite: 203]
      return !query || [r.referencia, r.propietario, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query)); // [cite: 203]
    });

    els.recordsBodyFull.innerHTML = filtrados.map(r => { // [cite: 204]
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente'); // [cite: 204]
      const valorEuro = formatEuro(r.valor); // [cite: 204]
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
      </tr>`; // [cite: 204]
    }).join('') || `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Sin registros</td></tr>`; // [cite: 204, 205]

    els.recordsBodyFull.querySelectorAll('tr[data-id]').forEach(tr => { // [cite: 205]
      tr.addEventListener('click', (e) => { // [cite: 205]
        if (!e.target.closest('button')) mostrarDetalleTasacion(tr.dataset.id); // [cite: 205]
      });
      tr.querySelector('button.btn-ver')?.addEventListener('click', (e) => { // [cite: 205]
        e.stopPropagation(); // [cite: 205]
        mostrarDetalleTasacion(tr.dataset.id); // [cite: 205]
      });
    });
  };

  const mostrarDetalleTasacion = (id) => {
    const record = state.records.find(r => (r.id || r.referencia) === id); // [cite: 206]
    if (!record) return; // [cite: 206]
    const valorEuro = formatEuro(record.valor); // [cite: 207]
    const coords = record.lote ? record.lote.split(',') : []; // [cite: 207]
    const lat = coords[0] ? parseFloat(coords[0]).toFixed(6) : '—'; // [cite: 207]
    const lng = coords[1] ? parseFloat(coords[1]).toFixed(6) : '—'; // [cite: 208]

    if (!els.modalContenido || !els.modalFicha) return; // [cite: 208]
    
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
      </div>`; // [cite: 209, 210, 211, 212, 213, 214, 215]
    
    els.modalFicha.classList.add('open');
  };

  const cargarUsuarios = async () => {
    // Función de respaldo para evitar fallas si no hay backend de usuarios configurado aún
    if (els.usersBody) {
      els.usersBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">Listo</td></tr>`;
    }
  };

  // ==========================================
  // ⚙️ VINCULACIÓN DE EVENTOS E INICIALIZACIÓN
  // ==========================================
  const vincularEventosYFiltros = () => {
    // Evento de Login
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.btnLogout) els.btnLogout.addEventListener('click', ejecutarLogout);

    // Eventos para refrescar filtros del Dashboard en tiempo real
    const inputsFiltro = [els.advSearch, els.advType, els.advMunicipio, els.advStatus, els.advValueRange, els.advSurfaceRange, els.advDateFrom, els.advDateTo, els.advDistanceTown];
    inputsFiltro.forEach(input => {
      if (input) {
        input.addEventListener('input', renderSistemaCompleto);
        input.addEventListener('change', renderSistemaCompleto);
      }
    });

    // Filtro de búsqueda en la Base de Datos completa
    if (els.userSearch) {
      els.userSearch.addEventListener('input', renderRecordsFull);
    }

    // Cierre de Modal Detalle
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
  };

  // Arranque definitivo de la aplicación
  vincularEventosYFiltros();
  inicializarNavegacion();
  verificarPersistenciaSesion();

})();
