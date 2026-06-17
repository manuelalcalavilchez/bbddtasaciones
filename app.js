(function () {
  const state = {
    apiBase: 'https://n8n-postgrest-api.n9xpuu.easypanel.host',
    frontendBase: location.href,
  };

  const els = {
    connectionStatus: document.getElementById('connectionStatus'),
    frontendStatus: document.getElementById('frontendStatus'),
    apiStatus: document.getElementById('apiStatus'),
    frontendUrl: document.getElementById('frontendUrl'),
    apiUrl: document.getElementById('apiUrl'),
    log: document.getElementById('log'),
    btnPingApi: document.getElementById('btnPingApi'),
    btnReload: document.getElementById('btnReload'),
  };

  const set = (el, text, cls) => {
    if (!el) return;
    el.textContent = text;
    if (cls) {
      el.className = cls;
    }
  };

  const log = (text) => {
    if (!els.log) return;
    const lines = [text, els.log.textContent];
    els.log.textContent = lines.join(`\n`);
  };

  const setStatus = (el, status, text) => {
    if (!el) return;
    el.textContent = status;
    el.className = 'value ' + (text === 'ok' ? 'text-success' : 'text-danger');
  };

  const bootstrapFrontend = () => {
    setStatus(els.frontendStatus, 'servido');
    if (els.frontendUrl) {
      els.frontendUrl.textContent = 'url: ' + state.frontendBase;
    }
  };

  const summarizeResponse = (res) => {
    if (!res) {
      return 'failed';
    }
    if (res.ok) {
      return 'ok';
    }
    if (res.status === 0) {
      return 'unknown';
    }
    if (res.status >= 500) {
      return `server ${res.status}`;
    }
    if (res.status >= 400) {
      return `client ${res.status}`;
    }
    return `${res.status}`;
  };

  const bootstrapApiPing = async () => {
    if (!els.apiStatus) return;
    if (!state.apiBase) {
      setStatus(els.apiStatus, 'api no configurada', 'warn');
      return;
    }

    try {
      const res = await fetch(`${state.apiBase}/`, { method: 'HEAD' });
      setStatus(els.apiStatus, summarizeResponse(res));
      log(`api -> ${state.apiBase}`);
    } catch (error) {
      setStatus(els.apiStatus, 'error');
      log(`api error -> ${error}`);
    }
  };

  const handlePingApi = async () => {
    if (!els.apiStatus) return;
    setStatus(els.apiStatus, 'probando...');
    await bootstrapApiPing();
  };

  const init = () => {
    els.connectionStatus.setAttribute('data-state', 'ok');
    set(els.connectionStatus, 'ok');
    bootstrapFrontend();
    if (els.apiBase) {
      bootstrapApiPing();
    }
    if (els.btnPingApi) {
      els.btnPingApi.addEventListener('click', handlePingApi);
    }
    if (els.btnReload) {
      els.btnReload.addEventListener('click', () => location.reload());
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
