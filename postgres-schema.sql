-- Schema de Base de Datos para GEO-VALUATION (Panel de Tasaciones)
-- Compatible con PostgreSQL + PostgREST
-- Actualizado: 2026-06-19

-- ============================================================
-- TABLA: tasadores
-- ============================================================
CREATE TABLE IF NOT EXISTS tasadores (
    id serial PRIMARY KEY,
    nombre varchar(150) UNIQUE NOT NULL,
    titulacion varchar(100),
    colegiado varchar(50)
);

-- ============================================================
-- TABLA: informes_tasacion (tabla central)
-- ============================================================
CREATE TABLE IF NOT EXISTS informes_tasacion (
    id serial PRIMARY KEY,
    numero_informe varchar(50) UNIQUE,
    fecha_emision date,
    referencia_cliente varchar(100),
    tasador_id integer REFERENCES tasadores(id),
    fecha_visita date,
    fecha_validez date,
    sociedad_nombre varchar(150) DEFAULT 'Valoraciones Mediterráneo, S.A.',
    sociedad_registro_b_e varchar(10) DEFAULT '4350',
    sociedad_cif varchar(15) DEFAULT 'A-03319530',
    domicilio_social text,
    solicitante_nombre varchar(150),
    solicitante_dni varchar(20),
    solicitante_direccion text,
    solicitante_cp varchar(10),
    solicitante_municipio varchar(100),
    solicitante_provincia varchar(100),
    solicitante_pais varchar(100) DEFAULT 'España',
    entidad_mandataria varchar(150),
    finalidad varchar(150) DEFAULT 'Asesoramiento - Valor de mercado',
    observaciones_generales text,
    municipio varchar(100),
    provincia varchar(100),
    paraje varchar(100),
    direccion text,
    estado_actual varchar(100) DEFAULT 'En explotación agrícola',
    clase_general varchar(50) DEFAULT 'Finca Rústica',
    ocupacion varchar(100),
    latitud numeric(10,8),
    longitud numeric(11,8),
    planeamiento_vigente text,
    uso_predominante varchar(150),
    clasificacion_suelo varchar(100),
    calificacion_suelo varchar(100),
    aprovechamiento_urbanistico varchar(150),
    servidumbres text,
    protecciones text,
    orografia varchar(100),
    pendiente_media_porcentaje numeric(5,2),
    textura_suelo varchar(50),
    clima varchar(100),
    profundidad varchar(50),
    salinidad varchar(50),
    contaminacion varchar(100),
    energia_electrica boolean DEFAULT false,
    agua_regadio boolean DEFAULT false,
    procedencia_agua varchar(150),
    sistema_riego varchar(150),
    red_viaria text,
    otros_infraestructuras text,
    descripcion_agrologica text,
    descripcion_finca text,
    produccion_ultimos_3_anos text,
    cultivos_recomendados text,
    superficie_municipio_km2 numeric(10,2),
    densidad_poblacion varchar(50),
    ritmo_crecimiento varchar(50),
    caracterizacion_entorno text,
    usos_dominantes varchar(200),
    infraestructuras text,
    valor_comparacion_total numeric(12,2),
    valor_comparacion_detalles text,
    valor_coste_reposicion numeric(12,2),
    valor_coste_depreciacion numeric(12,2),
    valor_coste_final numeric(12,2),
    valor_coste_detalles text,
    valor_actualizacion_rentas numeric(12,2),
    valor_actualizacion_detalles text,
    valor_residual_estatico numeric(12,2),
    valor_residual_dinamico numeric(12,2),
    valor_residual_detalles text,
    mejoras_deducciones text,
    valor_mercado numeric(12,2),
    valor_hipotecario numeric(12,2),
    valor_mercado_adoptado numeric(12,2),
    metodo_principal varchar(100),
    riesgos_medioambientales jsonb,
    fecha_creacion_registro timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: datos_catastrales
-- ============================================================
CREATE TABLE IF NOT EXISTS datos_catastrales (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    referencia_catastral varchar(20) NOT NULL,
    poligono varchar(10),
    parcela varchar(10),
    superficie_catastral_m2 numeric(10,2),
    superficie_terreno_m2 numeric(10,2),
    ano_edificacion integer,
    uso_catastral varchar(100),
    observaciones text
);

-- ============================================================
-- TABLA: cultivos_informe
-- ============================================================
CREATE TABLE IF NOT EXISTS cultivos_informe (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    sector varchar(100),
    tipo_cultivo varchar(100) NOT NULL,
    superficie_ha numeric(8,4) NOT NULL,
    ano_plantacion integer,
    estado_produccion varchar(50)
);

-- ============================================================
-- TABLA: mejoras_informe
-- ============================================================
CREATE TABLE IF NOT EXISTS mejoras_informe (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    tipo_mejora varchar(150) NOT NULL,
    material varchar(100),
    dimensiones varchar(50),
    superficie_m2 numeric(8,2),
    ano_instalacion integer,
    ano_instalacion_construccion integer,
    vida_util_restante_anos integer
);

-- ============================================================
-- TABLA: reservas_informe
-- ============================================================
CREATE TABLE IF NOT EXISTS reservas_informe (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    codigo varchar(20),
    descripcion text NOT NULL
);

-- ============================================================
-- TABLA: datos_registrales
-- ============================================================
CREATE TABLE IF NOT EXISTS datos_registrales (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    numero_finca varchar(50),
    descripcion_registral text,
    superficie_registral numeric(10,2),
    titularidad varchar(100),
    cargas varchar(100),
    coincidencia_con_catastro varchar(50),
    observaciones text
);

-- ============================================================
-- TABLA: comprobaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS comprobaciones (
    id serial PRIMARY KEY,
    informe_id integer REFERENCES informes_tasacion(id) ON DELETE CASCADE,
    tipo varchar(50),
    descripcion text
);

-- ============================================================
-- TABLA: importacion_tasaciones (cola de trabajo)
-- ============================================================
CREATE TABLE IF NOT EXISTS importacion_tasaciones (
    id serial PRIMARY KEY,
    referencia text UNIQUE NOT NULL,
    tipo text,
    propietario text,
    lote text,
    localidad text,
    estado text DEFAULT 'Pendiente',
    fecha date DEFAULT CURRENT_DATE,
    valor numeric DEFAULT 0,
    latitud numeric(10,8),
    longitud numeric(11,8)
);

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    email text PRIMARY KEY,
    password text NOT NULL,
    role text NOT NULL DEFAULT 'viewer'
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_informes_numero ON informes_tasacion(numero_informe);
CREATE INDEX IF NOT EXISTS idx_informes_tasador ON informes_tasacion(tasador_id);
CREATE INDEX IF NOT EXISTS idx_informes_municipio ON informes_tasacion(municipio);
CREATE INDEX IF NOT EXISTS idx_catastrales_ref ON datos_catastrales(referencia_catastral);
CREATE INDEX IF NOT EXISTS idx_catastrales_informe ON datos_catastrales(informe_id);
CREATE INDEX IF NOT EXISTS idx_importacion_estado ON importacion_tasaciones(estado);
CREATE INDEX IF NOT EXISTS idx_importacion_ref ON importacion_tasaciones(referencia);

-- ============================================================
-- VISTA: resumen de importaciones
-- ============================================================
CREATE OR REPLACE VIEW v_resumen_importaciones AS
SELECT
  propietario,
  localidad,
  COUNT(*) AS total_fincas,
  SUM(valor) AS valor_total,
  estado
FROM importacion_tasaciones
GROUP BY propietario, localidad, estado
ORDER BY total_fincas DESC;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Tasador
INSERT INTO tasadores (nombre, titulacion, colegiado)
VALUES ('Jorge Martinez Soler', 'Ingeniero Agrónomo', NULL)
ON CONFLICT (nombre) DO NOTHING;

-- Usuarios
INSERT INTO usuarios (email, password, role) VALUES
('manuel@tecnologiaalcala.es', 'MiClaveSegura2026', 'admin'),
('jjorgems@gmail.com', 'Aa123456', 'editor')
ON CONFLICT (email) DO NOTHING;
