-- ============================================================
-- EXPEDIENTE CLÍNICO DIGITAL — ACTUALIZACIÓN COMPLETA 15 DOCUMENTOS
-- Cumplimiento NOM-004-SSA3, NOM-024-SSA3, LGPDPPSO y formatos federales SINBA
-- ============================================================

-- 1. Actualización de tabla PACIENTE para el Maestro de Pacientes Único
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS pais_nacimiento VARCHAR(100) DEFAULT 'MÉXICO';
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS entidad_nacimiento VARCHAR(100);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_pais VARCHAR(100) DEFAULT 'MÉXICO';
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_entidad VARCHAR(100);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_municipio VARCHAR(100);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_localidad VARCHAR(150);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_cp VARCHAR(10);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_tipo_vialidad VARCHAR(50);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_nombre_vialidad VARCHAR(150);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_num_exterior VARCHAR(20);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_num_interior VARCHAR(20);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_tipo_asentamiento VARCHAR(50);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS domicilio_nombre_asentamiento VARCHAR(150);

ALTER TABLE paciente ADD COLUMN IF NOT EXISTS afiliacion VARCHAR(50) DEFAULT 'No especificado';
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS num_afiliacion VARCHAR(50);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS tutor_nombre VARCHAR(200);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS tutor_parentesco VARCHAR(50);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS tutor_telefono VARCHAR(20);

-- Autoadscripción e Identidad Federal (SINBA)
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS es_indigena BOOLEAN DEFAULT FALSE;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS habla_lengua_indigena BOOLEAN DEFAULT FALSE;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS lengua_indigena VARCHAR(100);
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS es_afromexicano BOOLEAN DEFAULT FALSE;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS es_migrante_retornado BOOLEAN DEFAULT FALSE;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS comunidad_lgbt BOOLEAN DEFAULT FALSE;
ALTER TABLE paciente ADD COLUMN IF NOT EXISTS identidad_lgbt VARCHAR(50);

-- Ampliar sexo a 20 chars para permitir 'Hombre', 'Mujer', 'Intersexual'
ALTER TABLE paciente ALTER COLUMN sexo TYPE VARCHAR(20);

-- Actualizar o crear vista de paciente con edad calculada al día
CREATE OR REPLACE VIEW v_paciente_detalle AS
SELECT 
    p.*,
    DATE_PART('year', AGE(CURRENT_DATE, p.fecha_nacimiento))::INT AS edad,
    DATE_PART('month', AGE(CURRENT_DATE, p.fecha_nacimiento))::INT AS edad_meses,
    DATE_PART('day', AGE(CURRENT_DATE, p.fecha_nacimiento))::INT AS edad_dias
FROM paciente p;

-- 2. BLOQUE 0 — INGRESO LEGAL
-- 4.1 Aviso de Privacidad
CREATE TABLE IF NOT EXISTS doc_aviso_privacidad (
    id_aviso SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    autoriza_transferencia BOOLEAN NOT NULL DEFAULT FALSE,
    unidad_medica VARCHAR(200) NOT NULL DEFAULT 'Hospital General San Felipe del Progreso',
    municipio VARCHAR(100) NOT NULL DEFAULT 'San Felipe del Progreso',
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    firma_nombre VARCHAR(200),
    firma_parentesco VARCHAR(50),
    huella_registrada BOOLEAN DEFAULT FALSE,
    urgencia_vital_pendiente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 Carta de Consentimiento Informado
CREATE TABLE IF NOT EXISTS doc_consentimiento_informado (
    id_consentimiento SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    unidad_medica VARCHAR(200) DEFAULT 'Hospital General San Felipe del Progreso',
    lugar VARCHAR(150) DEFAULT 'San Felipe del Progreso, México',
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    ocupacion VARCHAR(100),
    servicio VARCHAR(100) NOT NULL,
    diagnosticos_clinicos TEXT,
    estudios_previos TEXT,
    actos_anestesicos TEXT,
    tratamiento_medico TEXT,
    tratamiento_quirurgico TEXT,
    riesgos_complicaciones TEXT,
    personal_medico_nombre VARCHAR(200),
    personal_medico_cedula VARCHAR(30),
    familiar_nombre VARCHAR(200),
    familiar_parentesco VARCHAR(50),
    testigo1_nombre VARCHAR(200),
    testigo2_nombre VARCHAR(200),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BLOQUE 1 — NÚCLEO DEL EXPEDIENTE
-- 4.3 Hoja Frontal
CREATE TABLE IF NOT EXISTS doc_hoja_frontal (
    id_hoja_frontal SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    personal_medico_tratante VARCHAR(200),
    cedula_profesional VARCHAR(30),
    diagnosticos_json JSONB DEFAULT '[]'::jsonb, -- [{fecha_atencion, diagnostico, fecha_control}]
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4 Historia Clínica General (ya existía historia_clinica, aseguramos columnas adicionales)
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS tipo_interrogatorio VARCHAR(20) DEFAULT 'Directo';
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS ocupacion VARCHAR(100);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS grupo_etnico VARCHAR(100);
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS tx_previo TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS tx_actual TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS pronostico TEXT;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS hora TIME DEFAULT CURRENT_TIME;
ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS fecha DATE DEFAULT CURRENT_DATE;

-- 4.5 Historia Clínica Pediátrica
CREATE TABLE IF NOT EXISTS doc_historia_clinica_pediatrica (
    id_hc_pediatrica SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    tipo_interrogatorio VARCHAR(20) DEFAULT 'Indirecto',
    ocupacion VARCHAR(100),
    
    -- Campos exclusivos pediátricos
    antecedentes_perinatales TEXT,
    alimentacion TEXT,
    inmunizaciones TEXT,
    desarrollo_psicomotor TEXT,
    
    antecedentes_heredofamiliares TEXT,
    antecedentes_no_patologicos TEXT,
    antecedentes_patologicos TEXT,
    padecimiento_actual TEXT NOT NULL,
    
    -- Interrogatorio 9 aparatos
    int_cardiovascular TEXT,
    int_respiratorio TEXT,
    int_gastrointestinal TEXT,
    int_genitourinario TEXT,
    int_hematico_linfatico TEXT,
    int_endocrino TEXT,
    int_nervioso TEXT,
    int_musculoesqueletico TEXT,
    int_piel_mucosas TEXT,
    
    -- Signos vitales
    temperatura DECIMAL(4,1),
    presion_arterial VARCHAR(15),
    frecuencia_cardiaca INT,
    frecuencia_respiratoria INT,
    peso DECIMAL(5,2),
    talla DECIMAL(5,1),
    
    -- Exploración física
    habitus_exterior_neurologico TEXT,
    ef_cabeza TEXT,
    ef_cuello TEXT,
    ef_torax TEXT,
    ef_abdomen TEXT,
    ef_genitales TEXT,
    ef_extremidades TEXT,
    ef_piel TEXT,
    
    resultados_laboratorio TEXT,
    diagnosticos TEXT,
    terapeutica_empleada TEXT,
    pronostico TEXT,
    
    medico_nombre VARCHAR(200),
    medico_cedula VARCHAR(30),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.6 Hoja de Consulta de Urgencias (aseguramos columnas en nota_urgencias y compatibilidad)
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS folio VARCHAR(30);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS codigo_triage VARCHAR(30) DEFAULT 'Urgencia Calificada';
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS urgencia_calificada_bool BOOLEAN DEFAULT TRUE;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS procedencia VARCHAR(150);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(200);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS responsable_parentesco VARCHAR(50);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS responsable_domicilio TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS responsable_telefono VARCHAR(25);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS fecha_hora_atencion TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS ta VARCHAR(15);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS temp DECIMAL(4,1);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS fr INT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS fc INT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS talla DECIMAL(5,1);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS motivo_consulta TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS antecedentes TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS padecimiento_actual TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS diagnosticos_presuncionales TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS analisis_pronosticos TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS tratamiento_plan TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS observaciones_estudios TEXT;
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS familiar_firma VARCHAR(200);
ALTER TABLE nota_urgencias ADD COLUMN IF NOT EXISTS medico_nombre VARCHAR(200);

-- 4.7 Hoja de Indicaciones Médicas (Solo-anexar con tabla repetible)
CREATE TABLE IF NOT EXISTS doc_hoja_indicaciones (
    id_hoja_indicaciones SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    hoja_num INT NOT NULL DEFAULT 1,
    servicio VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    ta VARCHAR(15),
    temp DECIMAL(4,1),
    fc INT,
    fr INT,
    peso DECIMAL(5,2),
    talla DECIMAL(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_indicacion_orden (
    id_orden SERIAL PRIMARY KEY,
    id_hoja_indicaciones INT NOT NULL REFERENCES doc_hoja_indicaciones(id_hoja_indicaciones) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    indicacion TEXT NOT NULL,
    medico_nombre VARCHAR(200) NOT NULL,
    medico_cedula VARCHAR(30),
    firmado BOOLEAN DEFAULT TRUE,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.8 Nota de Egreso / Contrarreferencia
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS tipo_ingreso VARCHAR(50) DEFAULT 'Urgencias directo';
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS fecha_hora_egreso TIMESTAMPTZ;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS motivo_egreso TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS servicio_egreso VARCHAR(100);
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS diagnosticos_finales TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS resumen_evaluacion TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS tratamiento_intrahospitalario TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS problemas_pendientes TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS plan_manejo_egreso TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS recomendaciones_ambulatorias TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS factores_riesgo TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS pronostico TEXT;
ALTER TABLE nota_egreso ADD COLUMN IF NOT EXISTS medico_nombre VARCHAR(200);

-- 4.9 Notas de Evolución (Solo-anexar)
ALTER TABLE nota_evolucion_diaria ADD COLUMN IF NOT EXISTS hoja_num INT DEFAULT 1;
ALTER TABLE nota_evolucion_diaria ADD COLUMN IF NOT EXISTS total_hojas INT DEFAULT 1;
ALTER TABLE nota_evolucion_diaria ADD COLUMN IF NOT EXISTS hora TIME DEFAULT CURRENT_TIME;
ALTER TABLE nota_evolucion_diaria ADD COLUMN IF NOT EXISTS nota_evolucion_texto TEXT;
ALTER TABLE nota_evolucion_diaria ADD COLUMN IF NOT EXISTS medico_nombre VARCHAR(200);

-- 4.10 Partograma
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS gesta INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS para INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS cesareas INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS abortos INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS hijos_vivos INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS fecha_ultimo_parto DATE;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS fecha_ultima_menstruacion DATE;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS fecha_probable_parto DATE;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS semanas_gestacion INT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS control_prenatal BOOLEAN DEFAULT FALSE;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS consultas_totales INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS consultas_hospital INT DEFAULT 0;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS lugar_consultas VARCHAR(200);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS complicaciones_embarazo TEXT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS tratamiento_embarazo TEXT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS actividad_uterina_inicio TIMESTAMPTZ;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS sangrado_transvaginal VARCHAR(50);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS ruptura_membranas VARCHAR(50);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS movimiento_fetal VARCHAR(50);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS edema VARCHAR(50);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS signos_vitales_ingreso JSONB;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS fcf_ingreso INT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS ritmo_tono VARCHAR(100);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS cervix_dilatacion_borramiento VARCHAR(100);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS presentacion_pelvis VARCHAR(100);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS impresion_diagnostica TEXT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS indicaciones_ingreso TEXT;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS planos_hodge VARCHAR(50);
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS vigilancia_14_horas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE partograma ADD COLUMN IF NOT EXISTS medico_responsable VARCHAR(200);

-- 4.11 Solicitud de Estudio de Gabinete
CREATE TABLE IF NOT EXISTS doc_solicitud_gabinete (
    id_solicitud SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    procedencia VARCHAR(50) DEFAULT 'Hospitalización',
    servicio VARCHAR(100),
    cama VARCHAR(20),
    tipo_paciente VARCHAR(20) DEFAULT '1ª vez',
    datos_clinicos TEXT,
    diagnostico TEXT,
    estudios_solicitados TEXT NOT NULL,
    fecha_proxima_consulta DATE,
    medico_solicitante VARCHAR(200),
    medico_cedula VARCHAR(30),
    vobo_gestor VARCHAR(200),
    observaciones TEXT,
    
    -- Sección de Interpretación (personal de imagenología)
    placa_utilizada VARCHAR(50),
    clave_estudio VARCHAR(50),
    interpretacion TEXT,
    fecha_interpretacion TIMESTAMPTZ,
    medico_interpreta VARCHAR(200),
    medico_interpreta_cedula VARCHAR(30),
    observaciones_interpretacion TEXT,
    
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.12 Solicitud de Laboratorio
CREATE TABLE IF NOT EXISTS doc_solicitud_laboratorio (
    id_solicitud_lab SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    cama VARCHAR(20) DEFAULT 'N/A',
    tipo_servicio VARCHAR(50) DEFAULT 'Hospitalización',
    especialidad_medica VARCHAR(100),
    medico_solicitante VARCHAR(200),
    medico_cedula VARCHAR(30),
    diagnostico TEXT,
    medicamentos_observaciones TEXT,
    estudios_seleccionados JSONB DEFAULT '[]'::jsonb, -- Array con claves de estudios de las 16 categorías
    otros_estudios TEXT,
    sello_digital VARCHAR(100),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.13 Solicitud-Recepción de Interconsulta Médica
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS fecha_solicitud DATE DEFAULT CURRENT_DATE;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS hora_solicitud TIME DEFAULT CURRENT_TIME;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS cama VARCHAR(20);
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS servicio_solicitante VARCHAR(100);
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS medico_solicitante VARCHAR(200);
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS motivo_interconsulta TEXT;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS servicio_solicitado VARCHAR(100);
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS medico_receptor VARCHAR(200);
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS fecha_recibido DATE;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS hora_recibido TIME;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS firma_solicito BOOLEAN DEFAULT FALSE;
ALTER TABLE interconsulta ADD COLUMN IF NOT EXISTS firma_recibio BOOLEAN DEFAULT FALSE;

-- 4.14 Hoja de Hospitalización (SINBA-SEUL-14-P)
CREATE TABLE IF NOT EXISTS doc_hoja_hospitalizacion_sinba14 (
    id_sinba14 SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    clues VARCHAR(20) DEFAULT 'MCSSA004921',
    folio VARCHAR(30),
    gratuidad BOOLEAN DEFAULT TRUE,
    nacio_en_hospital BOOLEAN DEFAULT FALSE,
    peso_kg DECIMAL(5,2),
    talla_cm DECIMAL(5,1),
    tipo_servicio VARCHAR(50) DEFAULT 'Hospitalización',
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_egreso DATE,
    traslados_internos TEXT,
    dias_uti INT DEFAULT 0,
    dias_terapia_intermedia INT DEFAULT 0,
    procedencia VARCHAR(50) DEFAULT 'Consulta externa',
    motivo_egreso VARCHAR(50) DEFAULT 'Mejoría',
    mujer_edad_fertil VARCHAR(50) DEFAULT 'No estaba embarazada ni en puerperio',
    afeccion_principal TEXT,
    afeccion_principal_cie VARCHAR(10),
    afeccion_primera_vez BOOLEAN DEFAULT TRUE,
    comorbilidades JSONB DEFAULT '[]'::jsonb, -- [{cie, descripcion}]
    causa_externa TEXT,
    infeccion_intrahospitalaria BOOLEAN DEFAULT FALSE,
    procedimientos_quirurgicos JSONB DEFAULT '[]'::jsonb, -- [{quirofano_in, quirofano_out, anestesia, cirujano, cie9mc}]
    tipo_anestesia VARCHAR(50),
    hoja_lesiones_violencia BOOLEAN DEFAULT FALSE,
    hoja_lesiones_folio VARCHAR(30),
    metodo_gineco_obstetrico VARCHAR(50),
    tipo_procedimiento_aborto VARCHAR(50),
    tipo_parto VARCHAR(50),
    producto_embarazo VARCHAR(20) DEFAULT 'Único',
    semanas_gestacion INT,
    metodo_planificacion_familiar VARCHAR(100),
    productos_recien_nacidos JSONB DEFAULT '[]'::jsonb, -- [{condicion_nacimiento, condicion_egreso, folio_identificador, apgar5, reanimacion, distocia}]
    tipo_unidad_egreso VARCHAR(100) DEFAULT 'Hospital General',
    medico_responsable VARCHAR(200),
    medico_curp VARCHAR(18),
    medico_cedula VARCHAR(30),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.15 Hoja Diaria del Servicio de Urgencias (SINBA-SEUL-16-P)
CREATE TABLE IF NOT EXISTS doc_hoja_diaria_urgencias_sinba16 (
    id_sinba16 SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    clues VARCHAR(20) DEFAULT 'MCSSA004921',
    folio VARCHAR(30),
    atencion_prehospitalaria BOOLEAN DEFAULT FALSE,
    tiempo_traslado_horas VARCHAR(10),
    fecha_hora_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_hora_alta TIMESTAMPTZ,
    tipo_urgencia VARCHAR(50) DEFAULT 'Urgencia calificada',
    motivo_atencion VARCHAR(50) DEFAULT 'Médico',
    tipo_caso VARCHAR(30) DEFAULT 'Caso de observación',
    traslado_transferido BOOLEAN DEFAULT FALSE,
    destino_unidad VARCHAR(150),
    alta_por VARCHAR(50) DEFAULT 'Domicilio',
    mujer_edad_fertil VARCHAR(50) DEFAULT 'No estaba embarazada ni en puerperio',
    afeccion_principal TEXT,
    afeccion_principal_cie VARCHAR(10),
    comorbilidades JSONB DEFAULT '[]'::jsonb,
    causa_externa TEXT,
    hoja_lesiones_violencia BOOLEAN DEFAULT FALSE,
    hoja_lesiones_folio VARCHAR(30),
    interconsultas_urgencias JSONB DEFAULT '[]'::jsonb, -- Hasta 3 médicos
    procedimientos_realizados JSONB DEFAULT '[]'::jsonb,
    medicamentos_administrados JSONB DEFAULT '[]'::jsonb,
    seccion_menores_5_anios JSONB DEFAULT '{}'::jsonb,
    medico_responsable VARCHAR(200),
    medico_curp VARCHAR(18),
    medico_cedula VARCHAR(30),
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reglas de Inmutabilidad para Bitácora de Auditoría
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_log_no_delete') THEN
        CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'audit_log_no_update') THEN
        CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
    END IF;
END $$;
