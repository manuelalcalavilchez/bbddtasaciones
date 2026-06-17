(function () {
  // Configuración de Endpoints globales del sistema
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
    records: [],       // Datos de las tasaciones devueltos por PostgreSQL
    systemUsers: [],   // Datos de la tabla de usuarios autorizados
  };

  // Mapeo unificado de todos los elementos del DOM (index.html)
  const els = {
    // Autenticación
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLogin: document.getElementById('btnLogin'),
    btnLogout: document.getElementById('btnLogout'),
    loginError: document.getElementById('loginError'),
    userBadge: document.getElementById('userBadge'),

    // Estado de red y logs
    connectionStatus: document.getElementById('connectionStatus'),
    apiStatus: document.getElementById('apiStatus'),
    frontendStatus: document.getElementById('frontendStatus'),
    log: document.getElementById('log'),
    btnPingApi: document.getElementById('btnPingApi'),
    btnReload: document.getElementById('btnReload'),

    // KPIs Dashboard
    kpiTotal: document.getElementById('kpiTotal'),
    kpiPending: document.getElementById('kpiPending'),
    kpiDone: document.getElementById('kpiDone'),

    // Listado de tasaciones
    recordsBody: document.getElementById('recordsBody'),
    search: document.getElementById('search'),
    filterStatus: document.getElementById('filterStatus'),

    // Formulario de tasación manual
    recordForm: document.getElementById('recordForm'),

    // Importador masivo JSON
    dropZone: document.getElementById('dropZone'),
    jsonFileInput: document.getElementById('jsonFileInput'),
    importProgress: document.getElementById('importProgress'),

    // Gestión de usuarios internos
    btnToggleUserForm: document.getElementById('btnToggleUserForm'),
    userFormWrap: document.getElementById('userFormWrap'),
    userForm: document.getElementById('userForm'),
    usersBody: document.getElementById('usersBody'),
  };

  // ==========================================
  // 📋 SISTEMA DE LOGS Y DIAGNÓSTICO
  // ==========================================
  const log = (text) => {
    if (!els.log) return;
    const timestamp = new Date().toISOString().slice(11, 19);
    els.log.textContent = `[${timestamp}] ${text}\n` + els.log.textContent;
  };

  const setStatusLabel = (el, text, isOk) => {
    if (!el) return;
    el.textContent = text;
    if (isOk !== undefined) {
      el.className = 'value ' + (isOk ? 'text-success' : 'text-danger');
    }
  };

  // ==========================================
  // 🔐 CONTROL DE ACCESO (AUTENTICACIÓN REAL)
  // ==========================================
  const ejecutarLogin = async () => {
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    
    if (!els.loginError) return;
    els.loginError.textContent = ''; 

    if (!email || !password) {
      els.loginError.textContent = 'Por favor, introduce tu email y contraseña.';
      return;
    }

    try {
      log(`Intentando conectar para el usuario: ${email}...`);
      const res = await fetch(`${state.apiBase}/usuarios?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
      
      if (!res.ok) throw new Error('Error de respuesta en el servidor de autenticación.');
      
      const userArray = await res.json();

      if (userArray.length > 0) {
        const usuarioValido = userArray[0];
        localStorage.setItem('session_user', JSON.stringify(usuarioValido));
        
        log(`Sesión autorizada. Rol: ${usuarioValido.role}`);
        inicializarSesionDeUsuario(usuarioValido);
      } else {
        els.loginError.textContent = 'Credenciales no válidas en PostgreSQL. Revisa los datos.';
      }
    } catch (err) {
      els.loginError.textContent = 'Fallo de red: ' + err.message;
      log(`Error en login: ${err.message}`);
    }
  };

  const inicializarSesionDeUsuario = (user) => {
    if (els.userBadge) els.userBadge.textContent = `Usuario: ${user.email} (${user.role})`;
    
    if (els.authView) els.authView.style.display = 'none';
    if (els.appView) els.appView.classList.add('open');
    
    navigate('dashboard');
  };

  const verificarPersistenciaSesion = () => {
    const sesionGuardada = localStorage.getItem('session_user');
    if (sesionGuardada) {
      const user = JSON.parse(sesionGuardada);
      inicializarSesionDeUsuario(user);
    } else {
      if (els.authView) els.authView.style.display = 'grid';
    }
  };

  // ==========================================
  // 🩺 SALUD DE LA API INTERNA
  // ==========================================
  const checkApiHealth = async () => {
    try {
      const res = await fetch(`${state.apiBase}/`, { method: 'GET' });
      if (res.ok) {
        setStatusLabel(els.apiStatus, 'ONLINE', true);
        if (els.connectionStatus) {
          els.connectionStatus.textContent = '● Estado: Conectado a PostgreSQL';
          els.connectionStatus.className = 'text-success';
        }
        return true;
      }
      throw new Error();
    } catch {
      setStatusLabel(els.apiStatus, 'OFFLINE', false);
      if (els.connectionStatus) {
        els.connectionStatus.textContent = '● Estado: Desconectado';
        els.connectionStatus.className = 'text-danger';
      }
      return false;
    }
  };

  // ==========================================
  // 📊 MÓDULO DE DASHBOARD Y KPIS
  // ==========================================
  const calcularYMostrarKPIs = () => {
    if (!els.kpiTotal || !els.kpiPending || !els.kpiDone) return;
    
    const total = state.records.length;
    const pendientesOEnProceso = state.records.filter(r => r.estado === 'Pendiente' || r.estado === 'En proceso').length;
    const finalizados = state.records.filter(r => r.estado === 'Finalizado').length;

    els.kpiTotal.textContent = total;
    els.kpiPending.textContent = pendientesOEnProceso;
    els.kpiDone.textContent = finalizados;
  };

  // ==========================================
  // 📑 OPERACIONES CRUD: TASACIONES REAL-TIME
  // ==========================================
  const cargarTasacionesDesdeBBDD = async () => {
    if (!els.recordsBody) return;
    
    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones?order=fecha.desc`);
      
      if (response.ok) {
        state.records = await response.json();
        renderRecordsTable();
        calcularYMostrarKPIs();
      } else {
        els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">Error al consultar datos (${response.statusText}).</td></tr>`;
      }
    } catch (error) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">Fallo de red al conectar con PostgREST.</td></tr>`;
    }
  };

  const renderRecordsTable = () => {
    if (!els.recordsBody) return;

    const query = els.search ? els.search.value.trim().toLowerCase() : '';
    const filter = els.filterStatus ? els.filterStatus.value : '';

    const filtrados = state.records.filter(r => {
      const coincideTexto = !query || [r.referencia, r.propietario, r.lote, r.localidad, r.tipo].some(v => String(v ?? '').toLowerCase().includes(query));
      const coincideEstado = !filter || r.estado === filter;
      return coincideTexto && coincideEstado;
    });

    if (filtrados.length === 0) {
      els.recordsBody.innerHTML = `<tr><td colspan="8" style="color:var(--muted); text-align:center;">No existen tasaciones con los filtros aplicados.</td></tr>`;
      return;
    }

    els.recordsBody.innerHTML = filtrados.map(r => {
      const colorEstado = ({ Pendiente: '#f59e0b', 'En proceso': '#3b82f6', Finalizado: '#22c55e' })[r.estado] || '#9aa4b2';
      const valorMoneda = Number(r.valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 });
      
      return `<tr>
        <td><strong>${escapeHtml(r.referencia)}</strong></td>
        <td>${escapeHtml(r.tipo)}</td>
        <td>${escapeHtml(r.propietario)}</td>
        <td>${escapeHtml(r.lote || '—')}</td>
        <td>${escapeHtml(r.localidad)}</td>
        <td><span style="color:${colorEstado}">● ${escapeHtml(r.estado)}</span></td>
        <td>${escapeHtml(r.fecha || '—')}</td>
        <td><strong>${valorMoneda} €</strong></td>
      </tr>`;
    }).join('');
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    log('Enviando nueva fila manual a PostgreSQL...');

    const fd = new FormData(e.target);
    const row = Object.fromEntries(fd.entries());
    
    row.valor = Number(row.valor) || 0;
    row.fecha = new Date().toISOString().slice(0, 10);

    try {
      const response = await fetch(`${state.apiBase}/importacion_tasaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      });

      if (response.ok) {
        log(`Registro manual [${row.referencia}] guardado correctamente.`);
        alert('¡Tasación insertada en la base de datos real!');
        e.target.reset();
        navigate('records');
      } else {
        throw new Error(response.statusText);
      }
    } catch (error) {
      alert('Error de inserción. Comprueba los campos en tu PostgreSQL.');
    }
  };

  // ==========================================
  // 📥 IMPORTACIÓN MASIVA DE ARCHIVOS JSON (INTELIGENTE)
  // ==========================================
  const procesarArchivoJSON = (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        let rawData = JSON.parse(e.target.result);
        let filasAProcesar = [];

        // ADAPTADOR INTELIGENTE: Detectamos si es tu informe estructural completo
        if (rawData.identificacion_informe || rawData.datos_catastrales) {
          log("Estructura de informe complejo detectada. Normalizando campos...");
          
          // Extraemos el valor numérico quitando separadores de miles
          let valorStr = rawData.valores_tasacion?.valor_comparacion?.valor_total || "0";
          let valorLimpio = Number(valorStr.replace(/\./g, '').replace(',', '.')) || 0;

          // Construimos el objeto plano que sí entiende tu tabla de base de datos
          const filaNormalizada = {
            referencia: rawData.datos_catastrales?.referencias?.[0]?.referencia_catastral || "S/R-" + Date.now(),
            tipo: rawData.identificacion_y_localizacion?.clase_general_inmueble || "Finca",
            propietario: rawData.solicitante_y_finalidad?.solicitante?.nombre || rawData.identificacion_informe?.sociedad_tasacion?.nombre || "Desconocido",
            lote: rawData.identificacion_y_localizacion?.paraje || "Principal",
            localidad: rawData.datos_catastrales?.referencias?.[0]?.parcela || "Almería",
            estado: "Pendiente",
            fecha: new Date().toISOString().slice(0, 10),
            valor: valorLimpio
          };

          filasAProcesar.push(filaNormalizada);
        } else {
          // Si ya era un array plano tradicional, lo dejamos tal cual
          filasAProcesar = Array.isArray(rawData) ? rawData : [rawData];
        }
        
        if (!els.importProgress) return;
        els.importProgress.style.display = 'block';
        els.importProgress.style.color = 'var(--warning)';
        
        let correctos = 0;
        let fallidos = 0;

        log(`Iniciando volcado masivo de ${filasAProcesar.length} elementos...`);

        for (let i = 0; i < filasAProcesar.length; i++) {
          const item = filasAProcesar[i];
          els.importProgress.textContent = `Subiendo registros: Fila ${i + 1} de ${filasAProcesar.length}...`;

          try {
            const response = await fetch(`${state.apiBase}/importacion_tasaciones`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            if (response.ok) correctos++; else fallidos++;
          } catch {
            fallidos++;
          }
        }

        els.importProgress.style.color = 'var(--success)';
        els.importProgress.innerHTML = `<strong>¡Volcado finalizado!</strong><br/>✅ Filas insertadas: ${correctos} | ❌ Errores: ${fallidos}`;
        log(`Importación finalizada. Éxito: ${correctos}. Fallidos: ${fallidos}.`);
        
        await cargarTasacionesDesdeBBDD();
      } catch (err) {
        alert('Error al procesar el JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ==========================================
  // 👥 SECCIÓN: GESTIÓN DE USUARIOS INTERNOS
  // ==========================================
  const cargarUsuariosDesdeBBDD = async () => {
    if (!els.usersBody) return;
    try {
      const res = await fetch(`${state.apiBase}/usuarios?order=email.asc`);
      if (res.ok) {
        state.systemUsers = await res.json();
        renderUsuariosTable();
      }
    } catch (err) {
      els.usersBody.innerHTML = `<tr><td colspan="4">Error de conexión con usuarios.</td></tr>`;
    }
  };

  const renderUsuariosTable = () => {
    if (state.systemUsers.length === 0) {
      els.usersBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted)">Sin usuarios en el sistema.</td></tr>`;
      return;
    }
    els.usersBody.innerHTML = state.systemUsers.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.email)}</strong></td>
        <td><span style="background:#1e293b; padding:4px 8px; border-radius:6px; font-size:12px;">${escapeHtml(u.role)}</span></td>
        <td>2026/06/17</td>
        <td><button class="secondary danger" style="padding:4px 10px; font-size:12px;" onclick="alert('Función de borrado protegida por rol de administrador local.')">Inhabilitar</button></td>
      </tr>
    `).join('');
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('uEmail').value.trim();
    const password = document.getElementById('uPass').value;
    const role = document.getElementById('uRole').value;

    try {
      const res = await fetch(`${state.apiBase}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      if (res.ok) {
        log(`Nuevo usuario registrado en PostgreSQL: ${email}`);
        e.target.reset();
        if (els.userFormWrap) els.userFormWrap.style.display = 'none';
        cargarUsuariosDesdeBBDD();
      } else {
        alert('No se pudo registrar. Puede que el email ya exista.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 🗺️ ENRUTADOR Y MANIPULACIÓN DEL DOM
  // ==========================================
  const navigate = (page) => {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    document.querySelectorAll('section[id^="page-"]').forEach(el => el.style.display = 'none');
    
    const targetSection = document.getElementById(`page-${page}`);
    if (targetSection) targetSection.style.display = '';
    
    if (els.frontendStatus) els.frontendStatus.textContent = state.frontendBase;

    if (page === 'dashboard' || page === 'records') {
      cargarTasacionesDesdeBBDD();
    }
    if (page === 'users') {
      cargarUsuariosDesdeBBDD();
    }
  };

  const escapeHtml = (str) => {
    return String(str ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  };

  // Asignación unificada de eventos de usuario
  const bindAllEvents = () => {
    if (els.btnLogin) els.btnLogin.addEventListener('click', ejecutarLogin);
    if (els.loginPassword) els.loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') ejecutarLogin(); });
    
    if (els.btnLogout) els.btnLogout.addEventListener('click', () => {
      localStorage.removeItem('session_user');
      location.reload();
    });

    document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.page);
    }));

    if (els.search) els.search.addEventListener('input', renderRecordsTable);
    if (els.filterStatus) els.filterStatus.addEventListener('change', renderRecordsTable);

    if (els.recordForm) els.recordForm.addEventListener('submit', handleRecordSubmit);
    if (els.userForm) els.userForm.addEventListener('submit', handleUserSubmit);

    if (els.btnPingApi) els.btnPingApi.addEventListener('click', checkApiHealth);
    if (els.btnReload) els.btnReload.addEventListener('click', () => location.reload());
    
    if (els.btnToggleUserForm) els.btnToggleUserForm.addEventListener('click', () => {
      if (els.userFormWrap) els.userFormWrap.style.display = els.userFormWrap.style.display === 'none' ? 'block' : 'none';
    });

    if (els.dropZone && els.jsonFileInput) {
      els.dropZone.addEventListener('click', () => els.jsonFileInput.click());
      els.jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) procesarArchivoJSON(e.target.files[0]);
      });
      els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.style.borderColor = 'var(--primary)'; });
      els.dropZone.addEventListener('dragleave', () => { els.dropZone.style.borderColor = 'var(--border)'; });
      els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files.length > 0) procesarArchivoJSON(e.dataTransfer.files[0]);
      });
    }
  };

  // Inicialización de ciclo de vida
  const init = async () => {
    bindAllEvents();
    verificarPersistenciaSesion();
    await checkApiHealth();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
