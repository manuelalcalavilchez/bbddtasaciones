(function () {
  // Configuración de Endpoints
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
    records: [], // Aquí se guardarán los datos reales devueltos por PostgreSQL
  };

  // Mapeo de elementos del DOM
  const els = {
    connectionStatus: document.getElementById('connectionStatus'),
    frontendStatus: document.getElementById('frontendStatus'),
    apiStatus: document.getElementById('apiStatus'),
    log: document.getElementById('log'),
    btnPingApi: document.getElementById('btnPingApi'),
    btnReload: document.getElementById('btnReload'),
    recordsBody: document.getElementById('recordsBody'),
    search: document.getElementById('search'),
    filterStatus: document.getElementById('filterStatus'),
    recordForm: document.getElementById('recordForm'),
    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),
  };

  // Auxiliares de interfaz
  const log = (text) => {
    if (!els.log) return;
    const timestamp = new Date().toISOString().slice(11, 19);
    els.log.textContent = `[${timestamp}] ${text}\n` + els.log.textContent;
  };

  const setStatus = (el, text, isOk) => {
    if (!el) return;
    el.textContent = text;
    if (isOk !== undefined) {
      el.className = 'value ' + (isOk ? 'text-success' : 'text-danger');
    }
  };

  // 1. Inicialización del Entorno (Bootstrap)
  const bootstrapFrontend = () => {
    if (els.frontendStatus) {
      els.frontendStatus.textContent = state.frontendBase;
    }
    log('Frontend inicializado correctamente.');
  };

  // 2. Comprobación de salud de la API (Ping)
  const checkApiHealth = async () => {
    if (!state.apiBase) {
      setStatus(els.apiStatus, 'No configurada', false);
      return false;
    }

    try {
      // Intentamos un GET ligero a la raíz de PostgREST para verificar que responde
      const res = await fetch(`${state.apiBase}/`, { method: 'GET' });
      
      if (res.ok) {
        setStatus(els.apiStatus, 'ONLINE', true);
        if (els.connectionStatus) {
          els.connectionStatus.textContent = '● Estado: Conectado a PostgreSQL';
          els.connectionStatus.className = 'text-success';
        }
        log(`Conexión exitosa con la API -> ${state.apiBase}`);
        return true;
      } else {
        throw new Error(`Código de estado del servidor: ${res.status}`);
      }
    } catch (error) {
      setStatus(els.apiStatus, 'OFFLINE', false);
      if (els.connectionStatus) {
        els.connectionStatus.textContent = '● Estado: Desconectado';
        els.connectionStatus.className = 'text-danger';
      }
      log(`Error al conectar con la API: ${error.message}`);
      return false;
    }
  };

  // 3. Consultar Registros (Leer de la BBDD Real)
  const cargarRegistrosDesdeBBDD = async () => {
    if (!els.recordsBody) return;
    
    log('Solicitando datos de tasaciones a PostgreSQL...');
    try {
      // PostgREST expone las tablas como endpoints directos (ej: /tasaciones)
      // Ordenamos por fecha de forma descendente para ver lo último primero
      const response = await fetch(`${state.apiBase}/tasaciones?order=fecha.desc`);
      
      if (response.ok) {
        state.records = await response.json();
        log(`Se han cargado ${state.records.length} registros desde la base de datos.`);
        renderRecordsTable();
      } else {
        els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">Error al obtener datos: ${response.statusText} (Asegúrate de que la tabla 'tasaciones' existe).</td></tr>`;
      }
    } catch (error) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">Error de red al conectar con PostgREST.</td></tr>`;
      log(`Error cargando registros: ${error.message}`);
    }
  };

  // 4. Pintar y Filtrar la Tabla en la interfaz
  const renderRecordsTable = () => {
    if (!els.recordsBody) return;

    const query = els.search ? els.search.value.trim().toLowerCase() : '';
    const filter = els.filterStatus ? els.filterStatus.value : '';

    const filtrados = state.records.filter(r => {
      const coincideTexto = !query || [r.referencia, r.propietario, r.lote, r.localidad].some(v => String(v ?? '').toLowerCase().includes(query));
      const coincideEstado = !filter || r.estado === filter;
      return coincideTexto && coincideEstado;
    });

    if (filtrados.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--muted); text-align:center;">No se encontraron registros que coincidan.</td></tr>`;
      return;
    }

    els.recordsBody.innerHTML = filtrados.map(r => {
      const colorEstado = ({ Pendiente: '#f59e0b', 'En proceso': '#3b82f6', Finalizado: '#22c55e' })[r.estado] || '#9aa4b2';
      const valorFormateado = Number(r.valor).toLocaleString('es-ES', { minimumFractionDigits: 0 });
      
      return `<tr>
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.lote || '-')}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td><span style="color:${colorEstado}">● ${escapeHtml(r.estado)}</span></td>
        <td>${escapeHtml(r.fecha)}</td>
        <td><strong>${valorFormateado} €</strong></td>
      </tr>`;
    }).join('');
  };

  // 5. Envío de un Registro Manual (POST)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    log('Enviando nuevo registro manual a PostgreSQL...');

    const fd = new FormData(e.target);
    const row = Object.fromEntries(fd.entries());
    
    // Tratamiento de tipos de datos
    row.valor = Number(row.valor) || 0;
    row.fecha = new Date().toISOString().slice(0, 10); // Fecha de hoy automática YYYY-MM-DD

    try {
      const response = await fetch(`${state.apiBase}/tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      });

      if (response.ok) {
        log(`Registro [${row.referencia}] guardado con éxito.`);
        alert('¡Insertado correctamente en PostgreSQL real!');
        e.target.reset();
        // Saltamos automáticamente a la pestaña de registros para ver el resultado
        document.querySelector('[data-page="records"]').click();
      } else {
        throw new Error(`Error de la API: ${response.statusText}`);
      }
    } catch (error) {
      log(`Error al guardar registro manual: ${error.message}`);
      alert('Hubo un fallo al comunicar con la base de datos.');
    }
  };

  // 6. PROCESADOR E IMPORTADOR DE ARCHIVOS JSON MASIVOS
  const procesarArchivoJSON = (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const datos = JSON.parse(e.target.result);
        const registrosAImportar = Array.isArray(datos) ? datos : [datos];
        
        log(`Archivo cargado. Detectados ${registrosAImportar.length} registros para importar.`);
        els.importProgress.style.display = 'block';
        els.importProgress.style.color = 'var(--warning)';
        
        let correctos = 0;
        let fallidos = 0;

        for (let i = 0; i < registrosAImportar.length; i++) {
          const registro = registrosAImportar[i];
          
          // Asegurar campos mínimos antes de enviar
          if (!registro.fecha) {
            registro.fecha = new Date().toISOString().slice(0, 10);
          }
          registro.valor = Number(registro.valor) || 0;

          els.importProgress.textContent = `Procesando: ${i + 1} de ${registrosAImportar.length}...`;

          try {
            const response = await fetch(`${state.apiBase}/tasaciones`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(registro)
            });

            if (response.ok) {
              correctos++;
            } else {
              fallidos++;
            }
          } catch (err) {
            fallidos++;
          }
        }

        els.importProgress.style.color = 'var(--success)';
        els.importProgress.innerHTML = `<strong>¡Importación finalizada!</strong><br/>✅ Éxitos: ${correctos} | ❌ Fallidos: ${fallidos}`;
        log(`Proceso masivo completado. Subidos con éxito: ${correctos}. Errores: ${fallidos}`);
        
        // Refrescamos la lista de la memoria por si el usuario va a mirar la tabla
        cargarRegistrosDesdeBBDD();

      } catch (err) {
        log('Error: El archivo seleccionado no tiene un formato JSON válido.');
        alert('El archivo no es un JSON procesable.');
      }
    };

    reader.readAsText(file);
  };

  // Enrutador del Frontend Estático (Navegación entre pestañas)
  const navigate = (page) => {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    document.querySelectorAll('section[id^="page-"]').forEach(el => el.style.display = 'none');
    
    const el = document.getElementById(`page-${page}`);
    if (el) el.style.display = '';
    
    document.getElementById('pageTitle').textContent =
      ({ dashboard: 'Dashboard / Importador', records: 'Registros Real-Time', new: 'Añadir Registro Manual' })[page] || page;
    
    if (page === 'records') {
      cargarRegistrosDesdeBBDD();
    }
  };

  // Seguridad para parsear strings en HTML plano
  const escapeHtml = (str) => {
    return String(str ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  };

  // 7. Gestión de Eventos y Listeners
  const BindEventListeners = () => {
    // Pestañas de Navegación
    document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.page);
    }));

    // Búsqueda en tiempo real y Filtros
    if (els.search) els.search.addEventListener('input', renderRecordsTable);
    if (els.filterStatus) els.filterStatus.addEventListener('change', renderRecordsTable);

    // Formulario Manual
    if (els.recordForm) els.recordForm.addEventListener('submit', handleFormSubmit);

    // Botones auxiliares del logs
    if (els.btnPingApi) els.btnPingApi.addEventListener('click', checkApiHealth);
    if (els.btnReload) els.btnReload.addEventListener('click', () => location.reload());

    // Eventos Click en Zona Drop del Importador JSON
    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          procesarArchivoJSON(e.target.files[0]);
        }
      });

      // Eventos de arrastrar y soltar (Drag & Drop)
      els.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropZone.style.borderColor = 'var(--primary)';
