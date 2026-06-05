-- Schema de Base de Datos para AppraisalPro (Valuation Suite)
-- Compatible con PostgreSQL y PostgREST
-- Creado: 2026-06-04

-- 1. CREACIÓN DE TABLAS

-- Tabla de expedientes de tasación principales
CREATE TABLE IF NOT EXISTS appraisals (
    id VARCHAR(50) PRIMARY KEY,
    expediente VARCHAR(30) UNIQUE NOT NULL,
    client VARCHAR(100) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    valuation NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Completado', 'En Revisión', 'Pendiente', 'En Proceso')),
    municipality VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_catastral VARCHAR(50) UNIQUE NOT NULL,
    surface_area NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    value_per_sqm NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN surface_area > 0 THEN valuation / surface_area ELSE 0 END
    ) STORED,
    has_pool BOOLEAN DEFAULT FALSE,
    floors VARCHAR(30) DEFAULT 'N/A',
    cultivo_details VARCHAR(100) DEFAULT 'N/A',
    owner_name VARCHAR(100),
    owner_nif VARCHAR(20),
    owner_phone VARCHAR(20),
    owner_email VARCHAR(100),
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para el desglose económico de la tasación
CREATE TABLE IF NOT EXISTS valuation_details (
    id SERIAL PRIMARY KEY,
    appraisal_id VARCHAR(50) REFERENCES appraisals(id) ON DELETE CASCADE,
    concepto VARCHAR(150) NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    valor_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- Tabla para el historial cronológico de auditoría
CREATE TABLE IF NOT EXISTS status_history (
    id SERIAL PRIMARY KEY,
    appraisal_id VARCHAR(50) REFERENCES appraisals(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

-- 2. ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN GEOESPACIAL

-- Búsquedas rápidas por expediente, cliente o referencia catatral
CREATE INDEX IF NOT EXISTS idx_appraisals_expediente ON appraisals(expediente);
CREATE INDEX IF NOT EXISTS idx_appraisals_client ON appraisals(client);
CREATE INDEX IF NOT EXISTS idx_appraisals_reference_catastral ON appraisals(reference_catastral);
CREATE INDEX IF NOT EXISTS idx_appraisals_municipality ON appraisals(municipality);

-- 3. INSERCIÓN DE DATOS DE EJEMPLO (SEEDS)

-- Finca EXP-2023-0891
INSERT INTO appraisals (
    id, expediente, client, property_type, valuation, status, municipality, 
    address, date, reference_catastral, surface_area, has_pool, floors, 
    cultivo_details, owner_name, owner_nif, owner_phone, owner_email, 
    description, latitude, longitude
) VALUES (
    'APP-001', 'EXP-2023-0891', 'Inmobiliaria Levante S.L.', 'Rústica', 2450000.00, 'Completado', 'Murcia',
    'Huerta de Murcia, Sector G-12, Parcela 4', '2023-10-14', '30030A012000040000FG', 142000.00, FALSE, 'N/A',
    'Cítricos (Naranjos en plena producción)', 'Agrícola del Segura S.L.', 'B30129481', '+34 968 221144', 'contacto@agricolasegura.es',
    'Finca rustica de regadio plantada con cítricos (variedad Navelina). Cuenta con un cabezal de riego automatizado y un pozo legalizado con balsa de almacenamiento de 15.000 m3.',
    37.9942, -1.1300
) ON CONFLICT DO NOTHING;

INSERT INTO valuation_details (appraisal_id, concepto, unidad, valor_unitario, subtotal) VALUES
('APP-001', 'Suelo Rústico de Regadío', '142.000 m²', 14.50, 2059000.00),
('APP-001', 'Vuelo (Plantación Navelina en producción)', '142.000 m²', 2.00, 284000.00),
('APP-001', 'Instalaciones de Riego Proporcional', 'Global', 107000.00, 107000.00)
ON CONFLICT DO NOTHING;

INSERT INTO status_history (appraisal_id, status, details) VALUES
('APP-001', 'INSPECCIÓN COMPLETADA', 'Inspección técnica visual de árboles y canalizaciones.'),
('APP-001', 'VALORACIÓN FINALIZADA', 'Carga de informe de campo completada.'),
('APP-001', 'INFORME GENERADO', 'Informe técnico visado por el perito judicial.')
ON CONFLICT DO NOTHING;

-- Vivienda EXP-2023-0895 (Marta)
INSERT INTO appraisals (
    id, expediente, client, property_type, valuation, status, municipality, 
    address, date, reference_catastral, surface_area, has_pool, floors, 
    cultivo_details, owner_name, owner_nif, owner_phone, owner_email, 
    description, latitude, longitude
) VALUES (
    'APP-002', 'EXP-2023-0895', 'Herederos de P. Gómez', 'Urbana', 485000.00, 'En Revisión', 'Madrid',
    'Calle del Olmo 14, 28004 Madrid', '2023-12-10', '9876543UI0987G0001JJ', 142.00, TRUE, '2 + Sótano',
    'N/A', 'Marta García Fernández', '50.123.456-L', '+34 600 000 000', 'marta.garcia@email.com',
    'Vivienda unifamiliar con estructura de hormigón armado, cerramientos de ladrillo visto y carpintería de aluminio con rotura de puente térmico. Pavimentos de gres porcelánico en planta baja y tarima de roble en planta superior. Instalación completa de climatización por conductos y sistema de aerotermia.',
    40.4168, -3.7038
) ON CONFLICT DO NOTHING;

INSERT INTO valuation_details (appraisal_id, concepto, unidad, valor_unitario, subtotal) VALUES
('APP-002', 'Suelo Urbano Consolidado', '250 m²', 800.00, 200000.00),
('APP-002', 'Vivienda Principal (Construcción)', '142 m²', 1600.00, 227200.00),
('APP-002', 'Urbanización e Infraestructuras (Piscina)', 'Global', 57800.00, 57800.00)
ON CONFLICT DO NOTHING;

-- 4. CONSEJOS PARA LEVANTAMIENTO CON POSTGREST

-- PostgREST expone automáticamente las tablas creadas sobre la base de datos pública. 
-- Para activar filtros de proximidad utilizando la extensión PostGIS, puedes ejecutar:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE appraisals ADD COLUMN geom GEOMETRY(Point, 4326);
-- UPDATE appraisals SET geom = ST_SetSRID(ST_Point(longitude, latitude), 4326);
