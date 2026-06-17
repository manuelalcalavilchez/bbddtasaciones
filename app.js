// Configuración global del Dashboard
const CONFIG = {
    // API de backend (reemplazar por tu endpoint real de FastAPI / PostgREST en Easypanel)
    API_URL: 'https://tu-api-easypanel.com/api/v1', 
    COORDS_DEFECTO: [40.416775, -3.703790] // Madrid
};

let mapGis = null;

// Inicialización de la sesión y cargas concurrentes
document.addEventListener("DOMContentLoaded", () => {
    verificarPersistenciaSesion();
});

function verificarPersistenciaSesion() {
    console.log("Verificando sesión del usuario...");
    // Simulación de persistencia correcta, inicializamos componentes con un leve timeout protector
    setTimeout(() => {
        inicializarMapaGis();
        cargarDatosAuditoria();
    }, 100);
}

/**
 * SOLUCIÓN AL ERROR DE MAPA: 
 * Implementación de URL válida de CartoDB sin conflictos de nombres de certificado SSL.
 */
function inicializarMapaGis() {
    console.log("Inicializando contenedor de mapa Leaflet...");
    
    // Crear objeto mapa apuntando al ID 'map' del HTML
    mapGis = L.map('map').setView(CONFIG.COORDS_DEFECTO, 10);

    // SOLUCIÓN: Usamos el CDN directo de Carto sin subdominios rígidos de servidor ("a.", "b.") 
    // Añadiendo subdomains parametrizados de forma segura
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(mapGis);

    // Forzar redibujado para evitar cortes con el contenedor glassmorphic
    setTimeout(() => {
        mapGis.invalidateSize();
    }, 200);
}

/**
 * CARGA Y RENDERIZADO DE AUDITORÍA
 * Petición a la BBDD e inyección en formato ficha completa
 */
async function cargarDatosAuditoria() {
    const contenedor = document.getElementById("contenedor-fichas-auditoria");
    
    try {
        // En producción real usarías algo como:
        // const response = await fetch(`${CONFIG.API_URL}/auditoria/tasaciones`);
        // const datos = await response.json();
        
        // Simulación de datos estructurados complejos (los JSON masivos que importamos antes)
        const datosFalsos = [
            {
                id: 10243,
                fecha: "17/06/2026 11:01",
                estado: "Validado",
                direccion: "Calle Gran Vía, 45, Madrid",
                superficie: 85,
                habitaciones: 3,
                valor_tasado: "320.000 €",
                lat: 40.4201,
                lng: -3.7037,
                metadatos: { origen: "api_masiva_idealista", version_parser: "v2.4", catastral: "9834201VK4794N" }
            },
            {
                id: 10244,
                fecha: "17/06/2026 09:30",
                estado: "Validado",
                direccion: "Av. de la Constitución, 12, Sevilla",
                superficie: 120,
                habitaciones: 4,
                valor_tasado: "415.000 €",
                lat: 37.3857,
                lng: -5.9931,
                metadatos: { origen: "importacion_json_local", archivo: "val_sur_junio.json", hash_bloque: "7a1b9c8e" }
            }
        ];

        // Limpiar el cargando...
        contenedor.innerHTML = "";

        // Iterar e inyectar las fichas completas a nivel de página
        datosFalsos.forEach(registro => {
            const fichaHTML = `
                <div class="ficha-auditoria glass-effect" id="ficha-${registro.id}">
                    <div class="ficha-header">
                        <span class="badge id">ID REGISTRO: #${registro.id}</span>
                        <span class="badge fecha"><i class="clock-icon"></i> ${registro.fecha}</span>
                        <span class="badge estado">${registro.estado}</span>
                    </div>
                    
                    <div class="ficha-cuerpo">
                        <div class="datos-grupo">
                            <h4>Ubicación y Estructura</h4>
                            <p><strong>Dirección:</strong> ${registro.direccion}</p>
                            <p><strong>Métricas:</strong> ${registro.superficie} m² útil | ${registro.habitaciones} Dormitorios</p>
                        </div>
                        
                        <div class="datos-grupo">
                            <h4>Métricas Financieras y GIS</h4>
                            <p><strong>Valoración:</strong> ${registro.valor_tasado}</p>
                            <p><strong>Geoposición:</strong> Lat: ${registro.lat} | Lng: ${registro.lng} (WGS84)</p>
                        </div>
                        
                        <div class="datos-grupo completo">
                            <h4>Payload Completo de Auditoría (JSON Metadatos)</h4>
                            <div class="json-block">
                                <code>${JSON.stringify(registro.metadatos, null, 4)}</code>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ficha-acciones">
                        <button class="btn-interactuar secundario" onclick="hacerFocusEnMapa(${registro.lat}, ${registro.lng}, '${registro.direccion}')">
                            Localizar en Mapa
                        </button>
                        <button class="btn-interactuar">
                            Inspeccionar Ficha Completa
                        </button>
                    </div>
                </div>
            `;
            contenedor.innerHTML += fichaHTML;
            
            // De paso, pintamos un marcador en el mapa por cada registro válido
            agregarMarcadorMapa(registro.lat, registro.lng, registro.direccion, registro.valor_tasado);
        });

    } catch (error) {
        console.error("Error cargando la auditoría masiva:", error);
        contenedor.innerHTML = `<div class="glass-effect loading-placeholder" style="color: #ef4444;">Error al conectar con el servidor de base de datos.</div>`;
    }
}

function agregarMarcadorMapa(lat, lng, titulo, precio) {
    if (mapGis) {
        L.marker([lat, lng])
            .addTo(mapGis)
            .bindPopup(`<b>${titulo}</b><br>Valor: ${precio}`);
    }
}

function hacerFocusEnMapa(lat, lng, direccion) {
    if (mapGis) {
        mapGis.setView([lat, lng], 16, { animate: true, duration: 1.5 });
        // Auto scroll suave hacia el mapa para mejorar UX en móvil
        document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    }
}
