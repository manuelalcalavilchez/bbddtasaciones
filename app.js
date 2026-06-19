(function () {
  const API = 'https://n8n-postgrest-api.n9xpuu.easypanel.host';
  const ADMIN_EMAIL = 'manuel@tecnologiaalcala.es';

  const state = {
    records: [], filtered: [], map: null, markers: [],
    charts: {}, users: [], importQueue: []
  };


  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const fmt = (v) => v ? Number(v).toLocaleString('es-ES') + ' \u20ac' : '\u2014';

  // ===== CONEXION BD =====
  const checkConnection = async () => {
    try {
      const r = await fetch(`${API}/informes_tasacion?select=id&limit=1`, {
        method: 'HEAD', headers: { 'Prefer': 'count=exact' }
      });
      const range = r.headers.get('content-range');
      let count = 0;
      if (range) { const t = range.split('/')[1]; if (t && t !== '*') count = Number(t); }
      return { online: r.ok, count };
    } catch { return { online: false, count: 0 }; }
  };


  const updateConnectionUI = async () => {
    const { online, count } = await checkConnection();
    // Login page
    const loginDot = $('dbStatusLoginDot');
    const loginText = $('dbStatusLoginText');
    if (loginDot) loginDot.className = `db-dot ${online ? 'online' : 'offline'}`;
    if (loginText) loginText.textContent = online ? `BD conectada (${count} informes)` : 'Sin conexi\u00f3n a BD';
    // Sidebar
    const dot = $('connectionDot');
    const label = $('connectionLabel');
    const ccount = $('connectionCount');
    if (dot) dot.className = `db-dot ${online ? 'online' : 'offline'}`;
    if (label) label.textContent = online ? 'BD Conectada' : 'Sin conexi\u00f3n';
    if (ccount) ccount.textContent = online ? `${count} informes` : '';
    const ind = $('connectionIndicator');
    if (ind) ind.className = `connection-indicator ${online ? 'online' : 'offline'}`;
  };

  // ===== LOGIN =====
  const login = async () => {
    const email = $('loginEmail').value.trim();
    const pwd = $('loginPassword').value;
    const err = $('loginError');
    err.textContent = '';
    try {
      const r = await fetch(`${API}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(pwd)}`);
      const data = await r.json();
      if (data.length > 0) {
        localStorage.setItem('session_user', JSON.stringify(data[0]));
        initSession(data[0]);
      } else { err.textContent = 'Credenciales incorrectas.'; }
    } catch { err.textContent = 'Error de conexi\u00f3n con el servidor.'; }
  };


  const initSession = (user) => {
    $('authView').style.display = 'none';
    $('appView').style.display = 'flex';
    $('userBadge').innerHTML = `<span class="material-symbols-outlined">account_circle</span> ${esc(user.email)} (${esc(user.role)})`;
    // Show users nav only for admin
    const navUsers = $('navUsers');
    if (navUsers) navUsers.style.display = (user.email === ADMIN_EMAIL || user.role === 'administrador') ? 'flex' : 'none';
    initMap();
    loadInformes();
    loadUsuarios();
    updateConnectionUI();
    setInterval(updateConnectionUI, 20000);
  };

  const logout = () => { localStorage.removeItem('session_user'); location.reload(); };

  const checkSession = () => {
    const saved = localStorage.getItem('session_user');
    if (saved) { initSession(JSON.parse(saved)); }
    else { $('authView').style.display = 'grid'; $('appView').style.display = 'none'; }
  };

  // ===== NAVEGACION SPA =====
  const initNav = () => {
    document.querySelectorAll('.nav a[data-target]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        link.classList.add('active');
        const sec = $(link.getAttribute('data-target'));
        if (sec) sec.classList.add('active');
        if (link.getAttribute('data-target') === 'sec-dashboard' && state.map) {
          setTimeout(() => state.map.invalidateSize(), 200);
        }
      });
    });
  };


  // ===== MAPA =====
  const initMap = () => {
    if (state.map || !$('map')) return;
    state.map = L.map('map').setView([36.8381, -2.4597], 9);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO'
    }).addTo(state.map);
  };

  // ===== CARGAR INFORMES =====
  const loadInformes = async () => {
    try {
      const r = await fetch(`${API}/informes_tasacion?order=fecha_creacion_registro.desc&limit=5000`);
      if (r.ok) {
        state.records = await r.json();
        populateFilters();
        state.filtered = [...state.records];
        renderAll();
      }
    } catch (e) { console.error('Error cargando informes:', e); }
  };

  const populateFilters = () => {
    const clases = [...new Set(state.records.map(r => r.clase_general).filter(Boolean))].sort();
    const munis = [...new Set(state.records.map(r => r.municipio).filter(Boolean))].sort();
    const provs = [...new Set(state.records.map(r => r.provincia).filter(Boolean))].sort();
    const selClase = $('filtroClase'); const selMuni = $('filtroMunicipio'); const selProv = $('filtroProvincia');
    if (selClase) { selClase.innerHTML = '<option value="">Todas</option>' + clases.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join(''); }
    if (selMuni) { selMuni.innerHTML = '<option value="">Todos</option>' + munis.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join(''); }
    if (selProv) { selProv.innerHTML = '<option value="">Todas</option>' + provs.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join(''); }
  };


  // ===== FILTRADO =====
  const applyFilters = () => {
    const txt = ($('filtroTexto')?.value || '').toLowerCase();
    const clase = $('filtroClase')?.value || '';
    const muni = $('filtroMunicipio')?.value || '';
    const prov = $('filtroProvincia')?.value || '';
    const vMin = parseFloat($('filtroValorMin')?.value) || 0;
    const vMax = parseFloat($('filtroValorMax')?.value) || Infinity;

    state.filtered = state.records.filter(r => {
      if (txt && ![r.numero_informe, r.municipio, r.solicitante_nombre, r.provincia, r.paraje]
        .some(v => String(v || '').toLowerCase().includes(txt))) return false;
      if (clase && r.clase_general !== clase) return false;
      if (muni && r.municipio !== muni) return false;
      if (prov && r.provincia !== prov) return false;
      const val = Number(r.valor_mercado_adoptado || 0);
      if (val < vMin || val > vMax) return false;
      return true;
    });
    renderAll();
  };

  const clearFilters = () => {
    ['filtroTexto','filtroValorMin','filtroValorMax'].forEach(id => { if($(id)) $(id).value = ''; });
    ['filtroClase','filtroMunicipio','filtroProvincia'].forEach(id => { if($(id)) $(id).value = ''; });
    state.filtered = [...state.records];
    renderAll();
  };


  // ===== RENDER TODO =====
  const renderAll = () => {
    renderKPIs();
    renderMap();
    renderTable();
    renderCharts();
    // Contador resultados
    const badge = $('filtroResultados');
    if (badge) badge.textContent = state.filtered.length < state.records.length
      ? `${state.filtered.length} de ${state.records.length} informes`
      : `${state.records.length} informes en total`;
    const dbCount = $('dbResultCount');
    if (dbCount) dbCount.textContent = `${state.filtered.length} resultados`;
  };

  const renderKPIs = () => {
    const data = state.filtered;
    if ($('kpiTotal')) $('kpiTotal').textContent = data.length;
    if ($('kpiValor')) $('kpiValor').textContent = fmt(data.reduce((a, r) => a + (Number(r.valor_mercado_adoptado) || 0), 0));
    if ($('kpiGeo')) $('kpiGeo').textContent = data.filter(r => r.latitud && r.longitud).length;
    if ($('kpiMunicipios')) $('kpiMunicipios').textContent = new Set(data.map(r => r.municipio).filter(Boolean)).size;
  };

  const renderMap = () => {
    if (!state.map) return;
    state.markers.forEach(m => state.map.removeLayer(m));
    state.markers = [];
    let count = 0;
    state.filtered.forEach(r => {
      if (r.latitud && r.longitud) {
        const lat = parseFloat(r.latitud); const lng = parseFloat(r.longitud);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
          const marker = L.circleMarker([lat, lng], { radius: 6, color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.7, weight: 1.5 })
            .addTo(state.map)
            .bindPopup(`<b>${esc(r.numero_informe || 'INF-'+r.id)}</b><br>${esc(r.municipio||'')}<br><strong>${fmt(r.valor_mercado_adoptado)}</strong>`);
          marker.on('click', () => showFicha(r.id));
          state.markers.push(marker);
          count++;
        }
      }
    });
    if ($('mapCounter')) $('mapCounter').textContent = `${count} marcadores`;
  };


  const renderTable = () => {
    const body = $('informesBody');
    if (!body) return;
    if (state.filtered.length === 0) {
      body.innerHTML = '<tr><td colspan="7" class="table-empty">Ning\u00fan informe coincide con los filtros.</td></tr>';
      return;
    }
    body.innerHTML = state.filtered.map(r => `
      <tr data-id="${r.id}" class="clickable-row">
        <td><strong>${esc(r.numero_informe || 'INF-'+r.id)}</strong></td>
        <td>${esc(r.clase_general || '\u2014')}</td>
        <td>${esc(r.solicitante_nombre || '\u2014')}</td>
        <td>${esc(r.municipio || '\u2014')}</td>
        <td>${esc(r.provincia || '\u2014')}</td>
        <td class="val-cell">${fmt(r.valor_mercado_adoptado)}</td>
        <td>${r.fecha_emision || (r.fecha_creacion_registro ? r.fecha_creacion_registro.slice(0,10) : '\u2014')}</td>
      </tr>`).join('');
    body.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => showFicha(tr.getAttribute('data-id')));
    });
  };

  // ===== GRAFICAS =====
  const renderCharts = () => {
    Object.values(state.charts).forEach(c => c.destroy());
    state.charts = {};
    const data = state.filtered;
    // Municipios
    const ctxM = $('chartMunicipios')?.getContext('2d');
    if (ctxM) {
      const counts = {};
      data.forEach(r => { if(r.municipio) counts[r.municipio] = (counts[r.municipio]||0)+1; });
      const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,10);
      state.charts.muni = new Chart(ctxM, { type:'bar',
        data:{ labels:sorted.map(s=>s[0]), datasets:[{label:'Informes',data:sorted.map(s=>s[1]),backgroundColor:'#3b82f6',borderRadius:4}] },
        options:{ indexAxis:'y', responsive:true, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#94a3b8'}},y:{ticks:{color:'#94a3b8'}}} }
      });
    }
    // Clase
    const ctxC = $('chartClase')?.getContext('2d');
    if (ctxC) {
      const counts = {};
      data.forEach(r => { const k = r.clase_general||'Sin clase'; counts[k]=(counts[k]||0)+1; });
      const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#6366f1'];
      state.charts.clase = new Chart(ctxC, { type:'doughnut',
        data:{ labels:Object.keys(counts), datasets:[{data:Object.values(counts),backgroundColor:colors,borderWidth:0}] },
        options:{ responsive:true, plugins:{legend:{position:'bottom',labels:{color:'#f8fafc'}}} }
      });
    }
  };


  // ===== FICHA DETALLE (MODAL) =====
  const showFicha = async (id) => {
    const modal = $('modal-ficha');
    const content = $('modal-contenido');
    if (!modal || !content) return;
    content.innerHTML = '<p style="text-align:center;padding:2rem;">Cargando informe completo...</p>';
    modal.classList.add('open');

    try {
      const [infArr, cats, regs, cult, mej, res] = await Promise.all([
        fetch(`${API}/informes_tasacion?id=eq.${id}`).then(r=>r.json()),
        fetch(`${API}/datos_catastrales?informe_id=eq.${id}`).then(r=>r.json()),
        fetch(`${API}/datos_registrales?informe_id=eq.${id}`).then(r=>r.json()),
        fetch(`${API}/cultivos_informe?informe_id=eq.${id}`).then(r=>r.json()),
        fetch(`${API}/mejoras_informe?informe_id=eq.${id}`).then(r=>r.json()),
        fetch(`${API}/reservas_informe?informe_id=eq.${id}`).then(r=>r.json()),
      ]);
      const inf = infArr[0];
      if (!inf) { content.innerHTML = '<p>Informe no encontrado.</p>'; return; }

      content.innerHTML = `
        <h2 class="modal-title">${esc(inf.numero_informe || 'INF-'+inf.id)}</h2>
        <div class="modal-meta">
          <span class="badge">${esc(inf.clase_general||'')}</span>
          <span class="badge badge-green">${esc(inf.estado_actual||'')}</span>
          <span>${inf.fecha_emision||''}</span>
        </div>
        <div class="modal-valor">${fmt(inf.valor_mercado_adoptado)}</div>

        <div class="modal-grid">
          <div class="modal-section">
            <h4>Solicitante</h4>
            <p><strong>${esc(inf.solicitante_nombre||'\u2014')}</strong></p>
            <p>DNI: ${esc(inf.solicitante_dni||'\u2014')}</p>
            <p>Finalidad: ${esc(inf.finalidad||'\u2014')}</p>
          </div>
          <div class="modal-section">
            <h4>Ubicaci\u00f3n</h4>
            <p>${esc(inf.municipio||'')} (${esc(inf.provincia||'')})</p>
            <p>Paraje: ${esc(inf.paraje||'\u2014')}</p>
            <p>Coords: ${inf.latitud||'\u2014'}, ${inf.longitud||'\u2014'}</p>
          </div>
          <div class="modal-section">
            <h4>Urbanismo</h4>
            <p>Suelo: ${esc(inf.clasificacion_suelo||'\u2014')}</p>
            <p>Uso: ${esc(inf.uso_predominante||'\u2014')}</p>
            <p>Plan: ${esc(inf.planeamiento_vigente||'\u2014')}</p>
          </div>
          <div class="modal-section">
            <h4>Valoraci\u00f3n</h4>
            <p>Comparaci\u00f3n: ${fmt(inf.valor_comparacion_total)}</p>
            <p>Rentas: ${fmt(inf.valor_actualizacion_rentas)}</p>
            <p>Mercado: ${fmt(inf.valor_mercado)}</p>
            <p>Hipotecario: ${fmt(inf.valor_hipotecario)}</p>
            <p>M\u00e9todo: ${esc(inf.metodo_principal||'\u2014')}</p>
          </div>
        </div>

        ${cats.length ? `<div class="modal-subtable"><h4>Datos Catastrales</h4><table><thead><tr><th>Ref.</th><th>Pol.</th><th>Parc.</th><th>Sup. m\u00b2</th><th>Uso</th></tr></thead><tbody>${cats.map(c=>`<tr><td>${esc(c.referencia_catastral)}</td><td>${c.poligono||''}</td><td>${c.parcela||''}</td><td>${c.superficie_catastral_m2||''}</td><td>${esc(c.uso_catastral||'')}</td></tr>`).join('')}</tbody></table></div>` : ''}

        ${cult.length ? `<div class="modal-subtable"><h4>Cultivos</h4><table><thead><tr><th>Sector</th><th>Tipo</th><th>Sup. ha</th><th>Estado</th></tr></thead><tbody>${cult.map(c=>`<tr><td>${esc(c.sector||'')}</td><td>${esc(c.tipo_cultivo)}</td><td>${c.superficie_ha}</td><td>${esc(c.estado_produccion||'')}</td></tr>`).join('')}</tbody></table></div>` : ''}

        ${mej.length ? `<div class="modal-subtable"><h4>Mejoras</h4><table><thead><tr><th>Tipo</th><th>Sup. m\u00b2</th><th>A\u00f1o</th><th>Vida \u00fatil</th></tr></thead><tbody>${mej.map(m=>`<tr><td>${esc(m.tipo_mejora)}</td><td>${m.superficie_m2||''}</td><td>${m.ano_instalacion_construccion||''}</td><td>${m.vida_util_restante_anos ? m.vida_util_restante_anos+' a\u00f1os' : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}

        ${res.length ? `<div class="modal-subtable"><h4>Reservas</h4><table><thead><tr><th>C\u00f3d.</th><th>Descripci\u00f3n</th></tr></thead><tbody>${res.map(r=>`<tr><td><span class="badge">${esc(r.codigo||'')}</span></td><td>${esc(r.descripcion)}</td></tr>`).join('')}</tbody></table></div>` : ''}

        <div class="modal-actions-bottom">
          <button class="btn btn-danger" onclick="window._deleteFicha(${inf.id})"><span class="material-symbols-outlined">delete</span> Eliminar</button>
        </div>
      `;
    } catch(e) { content.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`; }
  };

  window._deleteFicha = async (id) => {
    if (!confirm('\u00bfEliminar este informe y todos sus datos asociados?')) return;
    try {
      await fetch(`${API}/informes_tasacion?id=eq.${id}`, { method: 'DELETE' });
      $('modal-ficha').classList.remove('open');
      await loadInformes();
    } catch(e) { alert('Error al eliminar: ' + e.message); }
  };


  // ===== IMPORTACION MASIVA JSON =====
  const processImportFiles = async (fileList) => {
    state.importQueue = [];
    for (const file of fileList) {
      if (!file.name.endsWith('.json')) continue;
      try {
        const raw = JSON.parse(await file.text());
        const arr = Array.isArray(raw) ? raw : [raw];
        state.importQueue.push(...arr);
      } catch(e) { console.warn('Error parseando', file.name, e); }
    }
    if (state.importQueue.length === 0) {
      $('importProgress').innerHTML = '<span style="color:var(--danger);">No se encontraron informes v\u00e1lidos.</span>';
      return;
    }
    $('importPreview').style.display = 'block';
    $('importCount').textContent = `${state.importQueue.length} informe(s) listos para importar`;
    $('importList').innerHTML = state.importQueue.map((item, i) => {
      const titulo = item.identificacion_informe?.numero_informe || item.numero_informe || `Registro ${i+1}`;
      const muni = item.identificacion_y_localizacion?.municipio || item.municipio || '';
      return `<div class="import-item"><span class="badge badge-accent">#${i+1}</span> <strong>${esc(titulo)}</strong> - ${esc(muni)}</div>`;
    }).join('');
  };

  const executeImport = async () => {
    const prog = $('importProgress');
    prog.innerHTML = 'Importando...';
    let ok = 0; let errors = 0;
    for (let i = 0; i < state.importQueue.length; i++) {
      prog.innerHTML = `Procesando ${i+1} de ${state.importQueue.length}...`;
      try {
        await importSingleInforme(state.importQueue[i]);
        ok++;
      } catch(e) { errors++; console.error('Import error:', e); }
    }
    prog.innerHTML = `<span style="color:var(--success)">\u2713 Importaci\u00f3n completada: ${ok} \u00e9xitos, ${errors} errores.</span>`;
    $('importPreview').style.display = 'none';
    state.importQueue = [];
    await loadInformes();
  };


  const importSingleInforme = async (json) => {
    // Adaptar JSON completo a tabla informes_tasacion
    const d = json;
    const informe = {};
    if (d.identificacion_informe) {
      // Formato completo
      informe.numero_informe = d.identificacion_informe.numero_informe || null;
      informe.fecha_emision = d.identificacion_informe.fecha_emision || null;
      informe.referencia_cliente = d.identificacion_informe.referencia_cliente || null;
      informe.sociedad_nombre = d.identificacion_informe.sociedad_tasacion?.nombre || null;
      informe.sociedad_cif = d.identificacion_informe.sociedad_tasacion?.cif || null;
      informe.solicitante_nombre = d.solicitante_y_finalidad?.solicitante?.nombre || null;
      informe.solicitante_dni = d.solicitante_y_finalidad?.solicitante?.dni || null;
      informe.finalidad = d.solicitante_y_finalidad?.finalidad || null;
      informe.municipio = d.identificacion_y_localizacion?.municipio || null;
      informe.provincia = d.identificacion_y_localizacion?.provincia || null;
      informe.paraje = d.identificacion_y_localizacion?.paraje || null;
      informe.direccion = d.identificacion_y_localizacion?.direccion || null;
      informe.estado_actual = d.identificacion_y_localizacion?.estado_actual || null;
      informe.clase_general = d.identificacion_y_localizacion?.clase_general_inmueble || null;
      const lat = parseFloat(d.identificacion_y_localizacion?.coordenadas_gps?.latitud);
      const lng = parseFloat(d.identificacion_y_localizacion?.coordenadas_gps?.longitud);
      if (!isNaN(lat)) informe.latitud = lat;
      if (!isNaN(lng)) informe.longitud = lng;
      informe.planeamiento_vigente = d.urbanismo?.planeamiento_vigente || null;
      informe.clasificacion_suelo = d.urbanismo?.clasificacion_suelo || null;
      informe.uso_predominante = d.urbanismo?.uso_predominante || null;
      // Valores
      const parseVal = (s) => { const n = parseFloat(String(s||'').replace(/[^\d.,]/g,'').replace(',','.')); return isNaN(n)?null:n; };
      informe.valor_comparacion_total = parseVal(d.valores_tasacion?.valor_comparacion?.valor_total);
      informe.valor_actualizacion_rentas = parseVal(d.valores_tasacion?.valor_actualizacion_rentas?.valor_actualizado);
      informe.valor_mercado_adoptado = parseVal(d.valores_tasacion?.resumen_final?.valor_adoptado);
      informe.valor_mercado = parseVal(d.valores_tasacion?.resumen_final?.valor_mercado);
      informe.valor_hipotecario = parseVal(d.valores_tasacion?.resumen_final?.valor_hipotecario);
      informe.metodo_principal = d.valores_tasacion?.resumen_final?.metodo_principal || null;
    } else {
      // Formato plano
      Object.assign(informe, d);
    }
    // Limpiar nulls
    Object.keys(informe).forEach(k => { if (informe[k] === null || informe[k] === '') delete informe[k]; });

    const res = await fetch(`${API}/informes_tasacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(informe)
    });
    if (!res.ok) throw new Error(await res.text());
    const created = await res.json();
    const informe_id = created[0]?.id;
    if (!informe_id || !d.identificacion_informe) return;

    // Tablas hijas
    const refs = d.datos_catastrales?.referencias || [];
    if (refs.length) {
      await fetch(`${API}/datos_catastrales`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(refs.map(r => ({ informe_id, referencia_catastral: r.referencia_catastral||'', poligono: r.poligono||null, parcela: r.parcela||null, superficie_catastral_m2: parseFloat(r.superficie_catastral)||null, uso_catastral: r.uso||null })))
      });
    }
    const cultivos = d.unidades_y_mejoras?.cultivos || [];
    if (cultivos.length) {
      await fetch(`${API}/cultivos_informe`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(cultivos.map(c => ({ informe_id, sector: c.sector||null, tipo_cultivo: c.tipo_cultivo||'Sin especificar', superficie_ha: parseFloat(c.superficie_ha)||0, estado_produccion: c.estado||null })))
      });
    }
    const mejoras = (d.unidades_y_mejoras?.mejoras||[]).filter(m => m.tipo_mejora);
    if (mejoras.length) {
      await fetch(`${API}/mejoras_informe`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(mejoras.map(m => ({ informe_id, tipo_mejora: m.tipo_mejora, superficie_m2: parseFloat(m.superficie_m2)||null, ano_instalacion_construccion: parseInt(m.ano_construccion)||null, vida_util_restante_anos: parseInt(m.vida_util_restante_anos)||null })))
      });
    }
    const reservas = d.reservas_y_observaciones?.reservas || [];
    if (reservas.length) {
      await fetch(`${API}/reservas_informe`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(reservas.map(r => ({ informe_id, codigo: r.codigo||null, descripcion: typeof r==='string'?r:(r.descripcion||JSON.stringify(r)) })))
      });
    }
  };


  // ===== USUARIOS =====
  const loadUsuarios = async () => {
    const body = $('usuariosBody');
    if (!body) return;
    try {
      const r = await fetch(`${API}/usuarios?order=email.asc`);
      state.users = await r.json();
      renderUsuarios();
    } catch(e) { console.error(e); }
  };

  const renderUsuarios = () => {
    const body = $('usuariosBody');
    if (!body) return;
    if (state.users.length === 0) { body.innerHTML = '<tr><td colspan="3" class="table-empty">Sin usuarios.</td></tr>'; return; }
    body.innerHTML = state.users.map(u => `
      <tr>
        <td><strong>${esc(u.email)}</strong></td>
        <td><span class="badge">${esc(u.role)}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="window._delUser('${esc(u.email)}')">Eliminar</button></td>
      </tr>`).join('');
  };

  const createUser = async (e) => {
    e.preventDefault();
    const email = $('userEmail').value.trim();
    const password = $('userPassword').value;
    const role = $('userRole').value;
    const msg = $('usuariosMsg');
    msg.textContent = '';
    if (!email || !password) { msg.innerHTML = '<span style="color:var(--danger)">Email y contrase\u00f1a requeridos.</span>'; return; }
    try {
      const r = await fetch(`${API}/usuarios`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password,role}) });
      if (r.ok) { msg.innerHTML = '<span style="color:var(--success)">\u2713 Usuario creado.</span>'; $('form-usuario').reset(); loadUsuarios(); }
      else { const t = await r.text(); msg.innerHTML = `<span style="color:var(--danger)">Error: ${esc(t)}</span>`; }
    } catch(e) { msg.innerHTML = `<span style="color:var(--danger)">Error: ${e.message}</span>`; }
  };

  window._delUser = async (email) => {
    const user = JSON.parse(localStorage.getItem('session_user'));
    if (email === user?.email) { alert('No puedes eliminar tu propio usuario.'); return; }
    if (!confirm(`\u00bfEliminar a ${email}?`)) return;
    await fetch(`${API}/usuarios?email=eq.${encodeURIComponent(email)}`, { method:'DELETE' });
    loadUsuarios();
  };


  // ===== EVENTOS =====
  const initEvents = () => {
    $('btnLogin')?.addEventListener('click', login);
    $('loginPassword')?.addEventListener('keydown', e => { if(e.key==='Enter') login(); });
    $('btnLogout')?.addEventListener('click', logout);
    $('btnFiltrar')?.addEventListener('click', applyFilters);
    $('btnLimpiar')?.addEventListener('click', clearFilters);
    $('btnCerrarModal')?.addEventListener('click', () => $('modal-ficha').classList.remove('open'));
    $('modal-ficha')?.addEventListener('click', e => { if(e.target===$('modal-ficha')) $('modal-ficha').classList.remove('open'); });

    // Import
    const dz = $('dropZone'); const fi = $('jsonFileInput');
    if (dz && fi) {
      dz.addEventListener('click', () => fi.click());
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); if(e.dataTransfer.files.length) processImportFiles(e.dataTransfer.files); });
      fi.addEventListener('change', e => { if(e.target.files.length) processImportFiles(e.target.files); });
    }
    $('btnConfirmImport')?.addEventListener('click', executeImport);
    $('btnCancelImport')?.addEventListener('click', () => { $('importPreview').style.display='none'; state.importQueue=[]; });

    // Usuarios
    $('form-usuario')?.addEventListener('submit', createUser);
  };

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initEvents();
    updateConnectionUI();
    checkSession();
  });
})();
