(function () {
  // Configuración de Endpoints globales del sistema
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
    records: [],          // Datos de las tasaciones devueltos por PostgreSQL
    map: null,            // Objeto del mapa Leaflet
    markers: [],          // Lista de marcadores dibujados en el mapa
    poblacionesGps: {}    // Diccionario dinámico { "Nombre Municipio": { lat, lng } }
  };

  // Mapeo unificado de todos los elementos del DOM (index.html)
  const els = {
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
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

    // Buscador Avanzado y Filtros GIS
    advSearch: document.getElementById('advSearch'),
    advType: document.getElementById('advType'),
    advStatus: document.getElementById('advStatus'),
    advDistanceTown: document.getElementById('advDistanceTown'),
    mapCounter: document.getElementById('mapCounter'),

    // Listado de tasaciones
    recordsBody: document.getElementById('recordsBody'),

    // Importador masivo JSON
    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),
  };

  const log = (text) => { console.log(`[LOG] ${text}`); };

  // ==========================================
  // 🔐 CONTROL DE ACCESO (AUTENTICACIÓN)
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
        inicializarSesionDeUsuario(userArray[0]);
      } else {
        els.loginError.textContent = 'Credenciales no válidas en PostgreSQL.';
      }
    } catch (err) {
      els.loginError.textContent = 'Fallo de red: ' + err.message;
    }
  };

  const inicializarSesionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `Usuario: ${user.email}`;
    if (els.authView) els.authView.style.display = 'none';
    if (els.appView) els.appView.style.display = 'flex';
    
    inicializarMapaGis();
    cargarTasacionesDesdeBBDD();
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
  // 🗺️ MÓDULO GEOGRÁFICO (LEAFLET GIS)
  // ==========================================
  const inicializarMapaGis = () => {
    if (state.map || !document.getElementById('map')) return;
    
    // Centramos el mapa por defecto en la provincia de Almería
    state.map = L.map('map').setView([36.8381, -2.4597], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);
  };

  // Fórmula Haversine para calcular distancia entre dos coordenadas en Km
  const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radio de la Tierra en Km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Actualiza dinámicamente el selector del HTML con las poblaciones detectadas
  const actualizarSelectorPoblaciones = () => {
    if (!els.advDistanceTown) return;
    
    const valorSeleccionadoPrevio = els.advDistanceTown.value;
    
    // Dejamos la opción por defecto limpia
    els.advDistanceTown.innerHTML = '<option value="">— Sin ordenar por Cercanía —</option>';
    
    // Añadimos las poblaciones que el sistema ha ido aprendiendo
    Object.keys(state.poblacionesGps).sort().forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio;
      option.textContent = municipio;
      els.advDistanceTown.appendChild(option);
    });

    els.advDistanceTown.value = valorSeleccionadoPrevio;
  };

  // ==========================================
  // 📑 OPERACIONES DE DATOS Y RENDERIZADO
  // ==========================================
  const cargarTasacionesDesdeBBDD = async () => {
    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones?order=fecha.desc`);
      if (response.ok) {
        state.records = await response.json();
        
        // Alimentar el diccionario de poblaciones dinámicas con los datos guardados en BD
        state.records.forEach(r => {
          if (r.localidad && r.lote) { // Usamos el campo lote para guardar "lat,lng" si procede
            const coords = r.lote.split(',');
            if (coords.length === 2 && !state.poblacionesGps[r.localidad]) {
              state.poblacionesGps[r.localidad] = {
                lat: parseFloat(coords[0]),
                lng: parseFloat(coords[1])
              };
            }
          }
        });
        
        actualizarSelectorPoblaciones();
        renderSistemaCompleto();
      }
    } catch (error) {
      console.error("Error cargando BBDD:", error);
    }
  };

  const renderSistemaCompleto = () => {
    if (!els.recordsBody) return;

    // 1. Limpiar marcadores viejos del mapa
    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];

    // 2. Capturar valores de los filtros avanzados
    const query = els.advSearch ? els.advSearch.value.trim().toLowerCase() : '';
    const filterType = els.advType ? els.advType.value : '';
    const filterStatus = els.advStatus ? els.advStatus.value : '';
    const centroReferencia = els.advDistanceTown ? els.advDistanceTown.value : '';

    let coordenadasCentro = null;
    if (centroReferencia && state.poblacionesGps[centroReferencia]) {
      coordenadasCentro = state.poblacionesGps[centroReferencia];
    }

    // 3. Filtrar y calcular distancias en tiempo real
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
      const coincideEstado = !filterStatus || r.estado === filterStatus;
      return coincideTexto && coincideTipo && coincideEstado;
    });

    // 4. Ordenar por distancia si hay un centro seleccionado
    if (coordenadasCentro) {
      filtrados.sort((a, b) => {
        if (a._distancia === null) return 1;
        if (b._distancia === null) return -1;
        return a._distancia - b._distancia;
      });
    }

    // 5. Actualizar KPIs del Dashboard
    if (els.kpiTotal) els.kpiTotal.textContent = state.records.length;
    if (els.kpiPending) els.kpiPending.textContent = state.records.filter(r => r.estado !== 'Finalizado').length;
    if (els.kpiDone) els.kpiDone.textContent = state.records.filter(r => r.estado === 'Finalizado').length;
    if (els.mapCounter) els.mapCounter.textContent = `${filtrados.length} marcadores activos`;

    // 6. Pintar las filas en la tabla rústica
    if (filtrados.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Ningún expediente coincide con los criterios GIS seleccionados.</td></tr>`;
      return;
    }

    els.recordsBody.innerHTML = filtrados.map(r => {
      const badgeClass = r.estado === 'Finalizado' ? 'finalizado' : (r.estado === 'En proceso' ? 'proceso' : 'pendiente');
      const distTexto = r._distancia !== null ? `${r._distancia.toFixed(2)} Km` : '—';
      const valorEuro = Number(r.valor || 0).toLocaleString('es-ES') + ' €';

      // Dibujar marcador en el mapa de forma paralela si tiene coordenadas válidas
      if (r.lote && state.map) {
        const c = r.lote.split(',');
        if (c.length === 2) {
          const marker = L.marker([parseFloat(c[0]), parseFloat(c[1])])
            .addTo(state.map)
            .bindPopup(`<b>Ref: ${r.referencia}</b><br>Propietario: ${r.propietario}<br>Valor: ${valorEuro}`);
          state.markers.push(marker);
        }
      }

      return `<tr>
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
  };

  // ==========================================
  // 📥 IMPORTACIÓN INTELIGENTE DE NUEVOS JSON
  // ==========================================
  // ==========================================
  // 📥 IMPORTACIÓN MULTI-ARCHIVO JSON (CORREGIDA Y COMPLETA)
  // ==========================================
  const procesarArchivoJSON = async (files) => {
    if (!files || files.length === 0) return;
    
    if (!els.importProgress) return;
    els.importProgress.style.display = 'block';
    els.importProgress.style.color = 'var(--warning)';
    
    let correctos = 0;
    let fallidos = 0;
    const totalArchivos = files.length;

    log(`Iniciando procesamiento masivo de ${totalArchivos} archivos...`);

    // Recorremos cada uno de los archivos cargados uno por uno
    for (let i = 0; i < totalArchivos; i++) {
      const file = files[i];
      els.importProgress.textContent = `Procesando archivo ${i + 1} de ${totalArchivos}: ${file.name}...`;

      // Forzamos una Promesa por archivo para poder usar await secuencialmente
      await new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            let rawData = JSON.parse(e.target.result);
            let item = {};

            // ADAPTADOR: Si es un informe técnico complejo, extraemos los datos clave
            if (rawData.identificacion_informe || rawData.datos_catastrales) {
              let valorStr = rawData.valores_tasacion?.valor_comparacion?.valor_total || "0";
              let valorLimpio = Number(valorStr.replace(/\./g, '').split(',')[0].replace(/[^0-9]/g, '')) || 0;
              
              let municipioDinamico = rawData.identificacion_y_localizacion?.paraje || "Almería";
              let lat = rawData.identificacion_y_localizacion?.coordenadas_gps?.latitud || "36.8381";
              let lng = rawData.identificacion_y_localizacion?.coordenadas_gps?.longitud || "-2.4597";

              item = {
                referencia: rawData.datos_catastrales?.referencias?.[0]?.referencia_catastral || ("S/R-" + Date.now() + "-" + i),
                tipo: rawData.identificacion_y_localizacion?.clase_general_inmueble || "Finca Rústica",
                propietario: rawData.identificacion_informe?.tasador?.nombre || "Técnico Local",
                localidad: municipioDinamico,
                lote: `${lat},${lng}`, // Guardamos las coordenadas planas en el campo lote
                estado: "Pendiente",
                fecha: new Date().toISOString().slice(0, 10),
                valor: valorLimpio
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
              correctos++;
            } else {
              const err = await response.json().catch(() => ({}));
              log(`Error en archivo ${file.name}: ${err.message || 'Posible duplicado'}`);
              fallidos++;
            }
          } catch (err) {
            log(`Error crítico parseando ${file.name}: ${err.message}`);
            fallidos++;
          }
          resolve(); // Continuar con el siguiente archivo del bucle
        };

        reader.onerror = () => {
          log(`Error leyendo el archivo físico: ${file.name}`);
          fallidos++;
          resolve();
        };

        reader.readAsText(file);
      });
    }

    // Al finalizar todo el lote de archivos
    els.importProgress.style.color = 'var(--success)';
    els.importProgress.innerHTML = `<strong>¡Volcado masivo finalizado!</strong><br/>✅ Archivos insertados: ${correctos} | ❌ Errores/Duplicados: ${fallidos}`;
    log(`Lote completado. Éxitos: ${correctos}. Fallidos: ${fallidos}.`);
    
    await cargarTasacionesDesdeBBDD();
  };

  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const navigate = (page) => {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
  };

  // ==========================================
  // 🔌 GESTIÓN DE EVENTOS DE INTERFAZ (RESTAURADA)
  // ==========================================
  const bindEvents = () => {
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.btnLogout) els.btnLogout.addEventListener('click', () => { localStorage.removeItem('session_user'); location.reload(); });

    document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.page);
    }));

    if (els.advSearch) els.advSearch.addEventListener('input', renderSistemaCompleto);
    if (els.advType) els.advType.addEventListener('change', renderSistemaCompleto);
    if (els.advStatus) els.advStatus.addEventListener('change', renderSistemaCompleto);
    if (els.advDistanceTown) els.advDistanceTown.addEventListener('change', renderSistemaCompleto);

    // Lógica e interactividad de la zona Drag & Drop con soporte múltiple
    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      
      els.jsonFileInput.addEventListener('change', (e) => { 
        if (e.target.files.length > 0) procesarArchivoJSON(e.target.files); 
      });

      els.dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        els.dropZone.style.borderColor = 'var(--primary)'; 
        els.dropZone.style.background = '#222f43';
      });

      els.dropZone.addEventListener('dragleave', () => { 
        els.dropZone.style.borderColor = 'var(--border)'; 
        els.dropZone.style.background = 'transparent';
      });

      els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.style.borderColor = 'var(--border)';
        els.dropZone.style.background = 'transparent';
        if (e.dataTransfer.files.length > 0) {
          procesarArchivoJSON(e.dataTransfer.files);
        }
      });
    }
  };

  const init = () => {
    bindEvents();
    verificarPersistenciaSesion();
  };

  document.addEventListener('DOMContentLoaded', init);
})();

