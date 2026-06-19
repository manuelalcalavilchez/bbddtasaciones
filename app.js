/**
 * Tecnología Alcalá — app.js
 * Dashboard de tasaciones con mapa Leaflet + importación JSON
 * API: PostgREST en https://n8n-postgrest-api.n9xpuu.easypanel.host
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const API_BASE = 'https://n8n-postgrest-api.n9xpuu.easypanel.host';

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    map: null,
    markers: [],
    expedientes: [],
    selectedId: null,
    view: 'dashboard',
    currentUser: null,
  };

  // ============================================================
  // DOM REFS
  // ============================================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    userInfo: $('#userInfo'),
    searchBox: $('#searchBox'),
    filterTipo: $('#filterTipo'),
    filterEstado: $('#filterEstado'),
    statTotal: $('#statTotal'),
    statActivos: $('#statActivos'),
    statFinalizados: $('#statFinalizados'),
    expedienteList: $('#expedienteList'),
    detailPanel: $('#detailPanel'),
    detailGrid: $('#detailGrid'),
    dashboardView: $('#dashboardView'),
    importView: $('#importView'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    importLog: $('#importLog'),
  };

  // ============================================================
  // API HELPERS (PostgREST)
  // ============================================================
  async function apiGet(table, params = {}) {
    const url = new URL(`${API_BASE}/${table}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v != null) url.searchParams.set(k, v);
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async function apiPost(table, body) {
    const res = await fetch(`${API_BASE}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async function apiPatch(table, id, body) {
    const res = await fetch(`${API_BASE}/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  async function apiDelete(table, filter) {
    const res = await fetch(`${API_BASE}/${table}?${filter}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  async function apiPatchByFilter(table, filter, body) {
    const res = await fetch(`${API_BASE}/${table}?${filter}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  // ============================================================
  // LOAD DATA
  // ============================================================
  async function loadExpedientes() {
    try {
      // Cargar importaciones pendientes
      const importaciones = await apiGet('importacion_tasaciones', {
        order: 'id.asc',
      });

      // Cargar informes de tasación
      const informes = await apiGet('informes_tasacion', {
        order: 'id.desc',
      });

      // Cargar datos catastrales para las referencias
      const catastrales = await apiGet('datos_catastrales');

      // Combinar: cada importación puede tener un informe asociado por referencia
      const catastralMap = {};
      catastrales.forEach(c => {
        catastralMap[c.referencia_catastral] = c;
      });

      state.expedientes = importaciones.map(imp => {
        const cat = catastralMap[imp.referencia] || {};
        const inf = informes.find(i => {
          // Buscar si hay informe con esta referencia catastral
          return catastrales.some(c => c.informe_id === i.id && c.referencia_catastral === imp.referencia);
        });
        return {
          ...imp,
          catastral: cat,
          informe: inf || null,
          estado: inf ? (inf.estado_actual || 'En proceso') : (imp.estado || 'Pendiente'),
        };
      });

      // Añadir informes que no están en importación
      informes.forEach(inf => {
        const already = state.expedientes.find(e => e.informe && e.informe.id === inf.id);
        if (!already) {
          state.expedientes.push({
            id: `inf-${inf.id}`,
            referencia: inf.numero_informe,
            tipo: inf.clase_general || 'Finca Rústica',
            propietario: inf.solicitante_nombre || inf.paraje || 'Sin datos',
            localidad: inf.municipio || '',
            estado: inf.estado_actual || 'Finalizado',
            valor: inf.valor_mercado_adoptado || inf.valor_comparacion_total || 0,
            latitud: inf.latitud,
            longitud: inf.longitud,
            catastral: null,
            informe: inf,
          });
        }
      });

      renderExpedientes();
      renderStats();
      renderMap();
    } catch (err) {
      console.error('Error cargando expedientes:', err);
      els.expedienteList.innerHTML = `<p style="color:var(--bad);padding:12px;">Error: ${err.message}</p>`;
    }
  }

  // ============================================================
  // RENDER — Lista de expedientes
  // ============================================================
  function renderExpedientes() {
    const search = els.searchBox.value.toLowerCase();
    const tipoF = els.filterTipo.value;
    const estadoF = els.filterEstado.value;

    let filtered = state.expedientes.filter(e => {
      if (search) {
        const haystack = `${e.referencia} ${e.propietario} ${e.localidad} ${e.tipo}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (tipoF && e.tipo !== tipoF) return false;
      if (estadoF && e.estado !== estadoF) return false;
      return true;
    });

    if (!filtered.length) {
      els.expedienteList.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px;">Sin resultados</p>';
      return;
    }

    els.expedienteList.innerHTML = filtered.map(e => `
      <div class="expediente-item ${state.selectedId === e.id ? 'selected' : ''}" data-id="${e.id}">
        <div class="expediente-ref">${e.referencia}</div>
        <div class="expediente-owner">${e.propietario || 'Sin propietario'}</div>
        <div class="expediente-loc">${e.localidad || '—'}</div>
        <div class="expediente-val">${formatMoney(e.valor)}</div>
        <span class="expediente-status status-${e.estado.replace(/\s/g, '-')}">${e.estado}</span>
      </div>
    `).join('');

    // Click handler
    $$('.expediente-item').forEach(item => {
      item.addEventListener('click', () => {
        state.selectedId = item.dataset.id;
        renderExpedientes();
        showDetail(state.selectedId);
        centerMap(state.selectedId);
      });
    });
  }

  // ============================================================
  // RENDER — Stats
  // ============================================================
  function renderStats() {
    const total = state.expedientes.length;
    const activos = state.expedientes.filter(e => e.estado === 'Pendiente' || e.estado === 'En proceso').length;
    const finalizados = state.expedientes.filter(e => e.estado === 'Finalizado').length;
    els.statTotal.textContent = total;
    els.statActivos.textContent = activos;
    els.statFinalizados.textContent = finalizados;
  }

  // ============================================================
  // RENDER — Mapa
  // ============================================================
  function initMap() {
    state.map = L.map('map').setView([37.5, -1.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(state.map);
  }

  function renderMap() {
    if (!state.map) return;

    // Limpiar marcadores anteriores
    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];

    state.expedientes.forEach(e => {
      let lat = e.latitud;
      let lng = e.longitud;

      // Si no tiene coords directas, buscar en catastral
      if ((!lat || !lng) && e.catastral) {
        // Sin coords
      }

      if (lat && lng) {
        const marker = L.marker([lat, lng])
          .addTo(state.map)
          .bindPopup(`
            <b>${e.referencia}</b><br>
            ${e.propietario || '—'}<br>
            ${e.localidad || '—'}<br>
            <b>${formatMoney(e.valor)}</b>
          `);
        marker._expedienteId = e.id;
        state.markers.push(marker);
      }
    });

    // Ajustar vista si hay marcadores
    if (state.markers.length > 0) {
      const group = L.featureGroup(state.markers);
      state.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  function centerMap(id) {
    const exp = state.expedientes.find(e => e.id == id);
    if (!exp || !exp.latitud || !exp.longitud) return;
    state.map.setView([exp.latitud, exp.longitud], 14);
    const marker = state.markers.find(m => m._expedienteId == id);
    if (marker) marker.openPopup();
  }

  // ============================================================
  // RENDER — Detalle
  // ============================================================
  function showDetail(id) {
    const exp = state.expedientes.find(e => e.id == id);
    if (!exp) return;

    els.detailPanel.style.display = 'block';

    const fields = [
      { label: 'Referencia', value: exp.referencia },
      { label: 'Propietario', value: exp.propietario },
      { label: 'Tipo', value: exp.tipo },
      { label: 'Localidad', value: exp.localidad },
      { label: 'Estado', value: exp.estado },
      { label: 'Valor', value: formatMoney(exp.valor) },
      { label: 'Latitud', value: exp.latitud || '—' },
      { label: 'Longitud', value: exp.longitud || '—' },
    ];

    if (exp.informe) {
      fields.push(
        { label: 'Nº Informe', value: exp.informe.numero_informe },
        { label: 'Paraje', value: exp.informe.paraje },
        { label: 'Municipio', value: exp.informe.municipio },
        { label: 'Provincia', value: exp.informe.provincia },
        { label: 'Fecha visita', value: exp.informe.fecha_visita },
        { label: 'Valor mercado', value: formatMoney(exp.informe.valor_mercado_adoptado) },
      );
    }

    // Action buttons
    const actionsHtml = (typeof exp.id === 'number') ? `
      <div style="grid-column:1/-1;display:flex;gap:8px;margin-top:8px;">
        <button onclick="window._editFicha(${exp.id})" style="padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--panel2);color:var(--accent);cursor:pointer;font-size:12px;font-weight:600;">Editar</button>
        <button onclick="window._deleteFicha(${exp.id},'${(exp.referencia||'').replace(/'/g,'')}')" style="padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--panel2);color:var(--bad);cursor:pointer;font-size:12px;font-weight:600;">Eliminar</button>
      </div>` : '';

    els.detailGrid.innerHTML = fields.map(f => `
      <div class="detail-field">
        <div class="label">${f.label}</div>
        <div class="value ${!f.value || f.value === '—' ? 'empty' : ''}">${f.value || '—'}</div>
      </div>
    `).join('') + actionsHtml;
  }

  // ============================================================
  // IMPORT — JSON
  // ============================================================
  function initImport() {
    const dz = els.dropZone;
    const fi = els.fileInput;

    dz.addEventListener('click', () => fi.click());

    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });

    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));

    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleJSONFile(file);
    });

    fi.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleJSONFile(file);
    });
  }

  async function handleJSONFile(file) {
    const log = els.importLog;
    log.textContent = `Leyendo ${file.name}...\n`;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      log.textContent += 'JSON válido. Procesando...\n';

      const result = await importarInforme(json);
      log.textContent += `\n✅ Importado correctamente!\n`;
      log.textContent += `Informe: ${result.numero_informe}\n`;
      log.textContent += `Referencia: ${result.referencia_catastral}\n`;
      log.textContent += `ID: ${result.informe_id}\n`;

      // Recargar datos
      loadExpedientes();
    } catch (err) {
      log.textContent += `\n❌ Error: ${err.message}\n`;
    }
  }

  // ============================================================
  // IMPORT — Procesar JSON → BD
  // ============================================================
  async function importarInforme(json) {
    const id = json.identificacion_informe || {};
    const sol = json.solicitante_y_finalidad || {};
    const loc = json.identificacion_y_localizacion || {};
    const urb = json.urbanismo || {};
    const desc = json.descripcion_y_superficies || {};
    const car = desc.caracteristicas_morfologicas || {};
    const infra = desc.infraestructuras_interiores || {};
    const prod = desc.produccion || {};
    const unidades = json.unidades_y_mejoras || {};
    const valores = json.valores_tasacion || {};
    const vc = valores.valor_comparacion || {};
    const va = valores.valor_actualizacion_rentas || {};
    const vr = valores.valor_residual || {};
    const vf = valores.resumen_final || {};
    const reg = json.datos_registrales || {};
    const cat = json.datos_catastrales || {};
    const riesgos = (json.localidad_y_entorno || {}).riesgos_medioambientales || {};
    const reservas = json.reservas_y_observaciones || {};

    // 1. Tasador — buscar o crear
    let tasadorId = null;
    if (id.tasador && id.tasador.nombre) {
      try {
        const existing = await apiGet('tasadores', { nombre: `eq.${id.tasador.nombre}` });
        if (existing.length > 0) {
          tasadorId = existing[0].id;
        } else {
          const created = await apiPost('tasadores', {
            nombre: id.tasador.nombre,
            titulacion: id.tasador.titulacion || null,
            colegiado: id.tasador.colegiado || null,
          });
          tasadorId = created[0]?.id || created.id;
        }
      } catch (e) {
        console.warn('Error tasador:', e);
      }
    }

    // 2. Crear informe principal
    const informeBody = {
      numero_informe: id.numero_informe || null,
      fecha_emision: parseDate(id.fecha_emision),
      referencia_cliente: id.referencia_cliente || null,
      tasador_id: tasadorId,
      fecha_visita: parseDate(id.tasador?.fecha_visita),
      fecha_validez: parseDate(id.tasador?.fecha_validez),
      sociedad_nombre: id.sociedad_tasacion?.nombre || 'Valoraciones Mediterráneo, S.A.',
      sociedad_registro_b_e: id.sociedad_tasacion?.registro_banco_espana || '4350',
      sociedad_cif: id.sociedad_tasacion?.cif || 'A-03319530',
      domicilio_social: id.sociedad_tasacion?.domicilio_social || null,
      solicitante_nombre: sol.solicitante?.nombre || null,
      solicitante_dni: sol.solicitante?.dni || null,
      solicitante_direccion: sol.solicitante?.direccion || null,
      solicitante_cp: sol.solicitante?.cp || null,
      solicitante_municipio: sol.solicitante?.municipio || null,
      solicitante_provincia: sol.solicitante?.provincia || null,
      solicitante_pais: sol.solicitante?.pais || 'España',
      entidad_mandataria: sol.entidad_mandataria || null,
      finalidad: sol.finalidad || 'Asesoramiento - Valor de mercado',
      observaciones_generales: sol.observaciones || null,
      municipio: loc.municipio || null,
      provincia: loc.provincia || null,
      paraje: loc.paraje || null,
      direccion: loc.direccion || null,
      estado_actual: loc.estado_actual || 'En explotación agrícola',
      clase_general: loc.clase_general_inmueble || 'Finca Rústica',
      ocupacion: loc.ocupacion || null,
      latitud: loc.coordenadas_gps?.latitud ? parseFloat(loc.coordenadas_gps.latitud) : null,
      longitud: loc.coordenadas_gps?.longitud ? parseFloat(loc.coordenadas_gps.longitud) : null,
      planeamiento_vigente: urb.planeamiento_vigente || null,
      uso_predominante: urb.uso_predominante || null,
      clasificacion_suelo: urb.clasificacion_suelo || null,
      calificacion_suelo: urb.calificacion_suelo || null,
      aprovechamiento_urbanistico: urb.aprovechamiento_urbanistico || null,
      servidumbres: urb.servidumbres || null,
      protecciones: urb.protecciones || null,
      orografia: car.orografia || null,
      pendiente_media_porcentaje: car.pendiente_media ? parseFloat(car.pendiente_media) : null,
      textura_suelo: car.textura || null,
      clima: car.clima || null,
      profundidad: car.profundidad || null,
      salinidad: car.salinidad || null,
      contaminacion: car.contaminacion || null,
      energia_electrica: parseBool(infra.energia_electrica),
      agua_regadio: parseBool(infra.agua_regadio),
      procedencia_agua: infra.procedencia_agua || null,
      sistema_riego: infra.sistema_riego || null,
      red_viaria: infra.red_viaria || null,
      otros_infraestructuras: infra.otros || null,
      descripcion_agrologica: desc.descripcion_agrologica || null,
      descripcion_finca: desc.descripcion_finca || null,
      produccion_ultimos_3_anos: prod.produccion_ultimos_3_anios || null,
      cultivos_recomendados: prod.cultivos_recomendados || null,
      valor_comparacion_total: parseMoney(vc.valor_total),
      valor_comparacion_detalles: joinArray(vc.detalles),
      valor_actualizacion_rentas: parseMoney(va.valor_actualizado),
      valor_actualizacion_detalles: joinArray(va.detalles),
      valor_residual_estatico: parseMoney(vr.residual_estatico),
      valor_residual_dinamico: parseMoney(vr.residual_dinamico),
      valor_residual_detalles: joinArray(vr.detalles),
      mejoras_deducciones: valores.mejoras_deducciones || null,
      valor_mercado: parseMoney(vf.valor_mercado),
      valor_hipotecario: parseMoney(vf.valor_hipotecario),
      valor_mercado_adoptado: parseMoney(vf.valor_adoptado),
      metodo_principal: vf.metodo_principal || null,
      riesgos_medioambientales: Object.keys(riesgos).length > 0 ? riesgos : null,
    };

    const informeResult = await apiPost('informes_tasacion', informeBody);
    const informeId = informeResult[0]?.id || informeResult.id;

    // 3. Datos catastrales
    if (cat.referencias && cat.referencias.length > 0) {
      for (const ref of cat.referencias) {
        await apiPost('datos_catastrales', {
          informe_id: informeId,
          referencia_catastral: ref.referencia_catastral,
          poligono: ref.poligono || null,
          parcela: ref.parcela || null,
          superficie_catastral_m2: ref.superficie_catastral ? parseFloat(ref.superficie_catastral) : null,
          superficie_terreno_m2: ref.superficie_terreno ? parseFloat(ref.superficie_terreno) : null,
          ano_edificacion: ref.ano_edificacion ? parseInt(ref.ano_edificacion) : null,
          uso_catastral: ref.uso || null,
          observaciones: ref.observaciones || null,
        });
      }
    }

    // 4. Cultivos
    if (unidades.cultivos && unidades.cultivos.length > 0) {
      for (const c of unidades.cultivos) {
        await apiPost('cultivos_informe', {
          informe_id: informeId,
          sector: c.sector || null,
          tipo_cultivo: c.tipo_cultivo,
          superficie_ha: parseFloat(c.superficie_ha) || 0,
          ano_plantacion: c.ano_plantacion ? parseInt(c.ano_plantacion) : null,
          estado_produccion: c.estado || null,
        });
      }
    }

    // 5. Mejoras
    if (unidades.mejoras && unidades.mejoras.length > 0) {
      for (const m of unidades.mejoras) {
        await apiPost('mejoras_informe', {
          informe_id: informeId,
          tipo_mejora: m.tipo_mejora,
          material: m.material || null,
          dimensiones: m.dimensiones || null,
          superficie_m2: m.superficie_m2 ? parseFloat(m.superficie_m2) : null,
          ano_instalacion: m.ano_instalacion ? parseInt(m.ano_instalacion) : null,
          ano_instalacion_construccion: m.ano_construccion ? parseInt(m.ano_construccion) : null,
          vida_util_restante_anos: m.vida_util_restante_anos ? parseInt(m.vida_util_restante_anos) : null,
        });
      }
    }

    // 6. Reservas
    if (reservas.reservas && reservas.reservas.length > 0) {
      for (const r of reservas.reservas) {
        await apiPost('reservas_informe', {
          informe_id: informeId,
          codigo: r.codigo || null,
          descripcion: r.descripcion,
        });
      }
    }

    // 7. Datos registrales
    if (reg.fincas && reg.fincas.length > 0) {
      for (const f of reg.fincas) {
        await apiPost('datos_registrales', {
          informe_id: informeId,
          numero_finca: f.numero_finca || null,
          descripcion_registral: f.descripcion_registral || null,
          superficie_registral: f.superficie_registral ? parseFloat(f.superficie_registral) : null,
          titularidad: f.titularidad || null,
          cargas: f.cargas || null,
          coincidencia_con_catastro: f.coincidencia_con_catastro || null,
          observaciones: f.observaciones || null,
        });
      }
    }

    return {
      informe_id: informeId,
      numero_informe: id.numero_informe,
      referencia_catastral: cat.referencias?.[0]?.referencia_catastral || null,
    };
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  function formatMoney(val) {
    if (!val && val !== 0) return '—';
    const n = typeof val === 'string' ? parseMoney(val) : val;
    if (n == null || isNaN(n)) return '—';
    return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
  }

  function parseMoney(str) {
    if (!str) return null;
    // "146.916,37 €" → 146916.37
    const cleaned = str.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  function parseDate(str) {
    if (!str) return null;
    // "07/12/2025" → "2025-12-07"
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return str;
  }

  function parseBool(val) {
    if (!val) return null;
    if (val === 'Sí' || val === 'Yes' || val === true) return true;
    if (val === 'No' || val === false) return false;
    return null;
  }

  function joinArray(arr) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return arr.join('\n');
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  function initNav() {
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.view = tab.dataset.view;

        // Hide all views
        els.dashboardView.style.display = 'none';
        els.importView.classList.remove('active');
        document.getElementById('crudView').classList.remove('active');
        document.getElementById('usuariosView').classList.remove('active');

        if (state.view === 'dashboard') {
          els.dashboardView.style.display = 'flex';
          els.dashboardView.style.flexDirection = 'column';
          els.dashboardView.style.flex = '1';
          setTimeout(() => state.map?.invalidateSize(), 100);
        } else if (state.view === 'import') {
          els.importView.classList.add('active');
        } else if (state.view === 'crud') {
          document.getElementById('crudView').classList.add('active');
          loadCrudTable();
        } else if (state.view === 'usuarios') {
          document.getElementById('usuariosView').classList.add('active');
          loadUsuariosTable();
        }
      });
    });
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function initEvents() {
    els.searchBox.addEventListener('input', renderExpedientes);
    els.filterTipo.addEventListener('change', renderExpedientes);
    els.filterEstado.addEventListener('change', renderExpedientes);
  }

  // ============================================================
  // CRUD — Base de Datos de Fichas (importacion_tasaciones)
  // ============================================================
  const CRUD_FIELDS = [
    { key: 'referencia', label: 'Referencia', required: true },
    { key: 'tipo', label: 'Tipo' },
    { key: 'propietario', label: 'Propietario' },
    { key: 'lote', label: 'Lote' },
    { key: 'localidad', label: 'Localidad' },
    { key: 'estado', label: 'Estado' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'valor', label: 'Valor (€)', type: 'number' },
    { key: 'latitud', label: 'Latitud', type: 'number' },
    { key: 'longitud', label: 'Longitud', type: 'number' },
  ];

  let crudEditingId = null;

  async function loadCrudTable() {
    const container = document.getElementById('crudTable');
    try {
      const data = await apiGet('importacion_tasaciones', { order: 'id.desc' });
      if (!data.length) {
        container.innerHTML = '<p style="color:var(--muted);padding:12px;">No hay fichas en la base de datos.</p>';
        return;
      }
      container.innerHTML = `
        <table>
          <thead><tr>
            <th>ID</th><th>Referencia</th><th>Tipo</th><th>Propietario</th><th>Localidad</th><th>Estado</th><th>Valor</th><th>Acciones</th>
          </tr></thead>
          <tbody>${data.map(r => `
            <tr>
              <td>${r.id}</td>
              <td style="color:var(--accent);font-family:monospace;">${r.referencia || '—'}</td>
              <td>${r.tipo || '—'}</td>
              <td>${r.propietario || '—'}</td>
              <td>${r.localidad || '—'}</td>
              <td><span class="expediente-status status-${(r.estado||'Pendiente').replace(/\s/g,'-')}">${r.estado||'Pendiente'}</span></td>
              <td style="color:var(--good);">${formatMoney(r.valor)}</td>
              <td>
                <button onclick="window._editFicha(${r.id})" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--accent);cursor:pointer;font-size:11px;margin-right:4px;">Editar</button>
                <button onclick="window._deleteFicha(${r.id},'${(r.referencia||'').replace(/'/g,'')}')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--bad);cursor:pointer;font-size:11px;">Borrar</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (err) {
      container.innerHTML = `<p style="color:var(--bad);padding:12px;">Error: ${err.message}</p>`;
    }
  }

  function openFichaModal(data = null) {
    crudEditingId = data ? data.id : null;
    document.getElementById('fichaModalTitle').textContent = data ? `Editar Ficha #${data.id}` : 'Nueva Ficha';
    document.getElementById('fichaDelete').style.display = data ? '' : 'none';

    const container = document.getElementById('fichaFields');
    container.innerHTML = CRUD_FIELDS.map(f => `
      <div class="login-field">
        <label>${f.label}${f.required ? ' *' : ''}</label>
        <input type="${f.type || 'text'}" name="${f.key}" value="${data ? (data[f.key] || '') : ''}" ${f.required ? 'required' : ''} style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;" />
      </div>
    `).join('');

    document.getElementById('fichaModal').style.display = '';
  }

  function closeFichaModal() {
    document.getElementById('fichaModal').style.display = 'none';
    crudEditingId = null;
  }

  async function saveFicha(e) {
    e.preventDefault();
    const form = document.getElementById('fichaForm');
    const body = {};
    CRUD_FIELDS.forEach(f => {
      const val = form.querySelector(`[name="${f.key}"]`).value.trim();
      if (val !== '') {
        body[f.key] = f.type === 'number' ? parseFloat(val) : val;
      }
    });

    if (!body.referencia) { alert('La referencia es obligatoria.'); return; }

    try {
      if (crudEditingId) {
        await apiPatch('importacion_tasaciones', crudEditingId, body);
      } else {
        await apiPost('importacion_tasaciones', body);
      }
      closeFichaModal();
      loadCrudTable();
      loadExpedientes();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  }

  async function deleteFicha(id, ref) {
    if (!confirm(`¿Eliminar la ficha "${ref}" (ID: ${id})? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDelete('importacion_tasaciones', `id=eq.${id}`);
      closeFichaModal();
      loadCrudTable();
      loadExpedientes();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  }

  // Expose for inline onclick
  window._editFicha = async function(id) {
    try {
      const data = await apiGet('importacion_tasaciones', { id: `eq.${id}` });
      if (data.length) openFichaModal(data[0]);
    } catch (err) { alert('Error: ' + err.message); }
  };
  window._deleteFicha = deleteFicha;

  function initCrud() {
    document.getElementById('btnNuevaFicha').addEventListener('click', () => openFichaModal());
    document.getElementById('fichaCancel').addEventListener('click', closeFichaModal);
    document.getElementById('fichaForm').addEventListener('submit', saveFicha);
    document.getElementById('fichaDelete').addEventListener('click', () => {
      if (crudEditingId) deleteFicha(crudEditingId, '');
    });
  }

  // ============================================================
  // USUARIOS — Gestión completa
  // ============================================================
  let editingUserEmail = null;

  async function loadUsuariosTable() {
    const container = document.getElementById('usuariosTable');
    try {
      const data = await apiGet('usuarios');
      container.innerHTML = `
        <table>
          <thead><tr><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
          <tbody>${data.map(u => `
            <tr>
              <td style="font-family:monospace;">${u.email}</td>
              <td><span style="padding:2px 8px;border-radius:4px;background:${u.role==='admin'?'rgba(96,165,250,0.15)':u.role==='editor'?'rgba(52,211,153,0.15)':'rgba(251,191,36,0.15)'};color:${u.role==='admin'?'var(--accent)':u.role==='editor'?'var(--good)':'var(--warn)'};font-size:11px;font-weight:600;">${u.role}</span></td>
              <td>
                <button onclick="window._editUser('${u.email.replace(/'/g,'\\\'')}')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--accent);cursor:pointer;font-size:11px;margin-right:4px;">Editar</button>
                <button onclick="window._deleteUser('${u.email.replace(/'/g,'\\\'')}')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--bad);cursor:pointer;font-size:11px;">Borrar</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (err) {
      container.innerHTML = `<p style="color:var(--bad);padding:12px;">Error: ${err.message}</p>`;
    }
  }

  function openUserModal(data = null) {
    editingUserEmail = data ? data.email : null;
    document.getElementById('userModalTitle').textContent = data ? `Editar: ${data.email}` : 'Nuevo Usuario';
    document.getElementById('userDelete').style.display = data ? '' : 'none';
    document.getElementById('uf_email').value = data ? data.email : '';
    document.getElementById('uf_email').disabled = !!data;
    document.getElementById('uf_password').value = '';
    document.getElementById('uf_role').value = data ? data.role : 'viewer';
    document.getElementById('userModal').style.display = '';
  }

  function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    editingUserEmail = null;
  }

  async function saveUser(e) {
    e.preventDefault();
    const email = document.getElementById('uf_email').value.trim();
    const password = document.getElementById('uf_password').value;
    const role = document.getElementById('uf_role').value.trim();

    if (!email || !role) { alert('Email y rol son obligatorios.'); return; }

    try {
      if (editingUserEmail) {
        const body = { role };
        if (password) body.password = password;
        await apiPatchByFilter('usuarios', `email=eq.${encodeURIComponent(editingUserEmail)}`, body);
      } else {
        if (!password) { alert('La contraseña es obligatoria para nuevos usuarios.'); return; }
        await apiPost('usuarios', { email, password, role });
      }
      closeUserModal();
      loadUsuariosTable();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function deleteUser(email) {
    if (state.currentUser && state.currentUser.email === email) {
      alert('No puedes eliminar tu propia cuenta.');
      return;
    }
    if (!confirm(`¿Eliminar el usuario "${email}"?`)) return;
    try {
      await apiDelete('usuarios', `email=eq.${encodeURIComponent(email)}`);
      closeUserModal();
      loadUsuariosTable();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  window._editUser = async function(email) {
    try {
      const data = await apiGet('usuarios', { email: `eq.${email}` });
      if (data.length) openUserModal(data[0]);
    } catch (err) { alert('Error: ' + err.message); }
  };
  window._deleteUser = deleteUser;

  function initUsuarios() {
    document.getElementById('btnNuevoUsuario').addEventListener('click', () => openUserModal());
    document.getElementById('userCancel').addEventListener('click', closeUserModal);
    document.getElementById('userForm').addEventListener('submit', saveUser);
    document.getElementById('userDelete').addEventListener('click', () => {
      if (editingUserEmail) deleteUser(editingUserEmail);
    });
  }

  // ============================================================
  // LOGIN
  // ============================================================
  const loginState = { attempts: 0, lockedUntil: null };
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 60000;

  function initLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPass = document.getElementById('loginPass');

    // Check saved session
    const saved = sessionStorage.getItem('ta_user');
    if (saved) {
      showApp(JSON.parse(saved));
      return;
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check lockout
      if (loginState.lockedUntil && Date.now() < loginState.lockedUntil) {
        const secs = Math.ceil((loginState.lockedUntil - Date.now()) / 1000);
        showLoginError(`Cuenta bloqueada. Espera ${secs}s.`);
        return;
      }

      const email = loginEmail.value.trim();
      const pass = loginPass.value;

      if (!email || !pass) {
        showLoginError('Introduce email y contraseña.');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Verificando...';

      try {
        const res = await fetch(`${API_BASE}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(pass)}`);
        const data = await res.json();

        if (data && data.length > 0) {
          // Login correcto
          loginState.attempts = 0;
          const user = data[0];
          sessionStorage.setItem('ta_user', JSON.stringify(user));
          showApp(user);
        } else {
          loginState.attempts++;
          if (loginState.attempts >= MAX_ATTEMPTS) {
            loginState.lockedUntil = Date.now() + LOCKOUT_MS;
            showLoginError(`Demasiados intentos (${MAX_ATTEMPTS}). Bloqueado 60s.`);
          } else {
            showLoginError(`Credenciales incorrectas. Intento ${loginState.attempts}/${MAX_ATTEMPTS}.`);
          }
        }
      } catch (err) {
        showLoginError('Error de conexión con el servidor.');
      }

      loginBtn.disabled = false;
      loginBtn.textContent = 'Iniciar Sesión';
    });

    function showLoginError(msg) {
      loginError.textContent = msg;
      loginError.style.display = 'block';
    }
  }

  function showApp(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appTopbar').style.display = '';
    document.getElementById('appMain').style.display = '';
    state.currentUser = user;
    initApp();
  }

  function logout() {
    sessionStorage.removeItem('ta_user');
    state.currentUser = null;
    document.getElementById('loginScreen').style.display = '';
    document.getElementById('appTopbar').style.display = 'none';
    document.getElementById('appMain').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').style.display = 'none';
  }

  document.addEventListener('app-logout', logout);

  // ============================================================
  // INIT
  // ============================================================
  function initApp() {
    initMap();
    initNav();
    initImport();
    initCrud();
    initUsuarios();
    initEvents();
    loadExpedientes();
    els.userInfo.textContent = state.currentUser ? state.currentUser.email : '';
  }

  function init() {
    initLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
