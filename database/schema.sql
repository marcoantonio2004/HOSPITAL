-- ============================================================
-- Expediente Clínico Digital — Esquema de Base de Datos
-- Hospital General San Felipe del Progreso
-- PostgreSQL 15+
-- ============================================================

-- Habilitar extensión para UUIDs (opcional, para IDs más seguros)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ROLES Y PERSONAL
-- ============================================================

CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,  -- admision, medico, enfermeria, laboratorio, admin
    descripcion TEXT
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('admin', 'Administrador del sistema — acceso total'),
    ('admision', 'Captura de pacientes y encounter hospitalario'),
    ('medico', 'Historia clínica, notas, indicaciones, interconsultas'),
    ('enfermeria', 'Indicaciones, evolución diaria, partograma'),
    ('laboratorio', 'Órdenes de laboratorio y gabinete, resultados'),
    ('obstetricia', 'Partograma, atención de parto, neonatal'),
    ('pediatria', 'Historia clínica pediátrica, neonatal');

CREATE TABLE personal_medico (
    id_medico SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    cedula_profesional VARCHAR(30) UNIQUE,
    especialidad VARCHAR(100),
    id_rol_sistema INT REFERENCES roles(id_rol),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUARIOS DEL SISTEMA (login)
-- ============================================================

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_medico INT REFERENCES personal_medico(id_medico),  -- puede ser NULL para admisión/admin
    id_rol INT NOT NULL REFERENCES roles(id_rol),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECUENCIAS
-- ============================================================

CREATE SEQUENCE seq_expediente_clinico START WITH 1;

-- ============================================================
-- PACIENTE (madre/paciente principal)
-- Se captura UNA vez en Admisión
-- ============================================================

CREATE TABLE paciente (
    id_paciente SERIAL PRIMARY KEY,

    -- Identificador único del hospital
    expediente_clinico VARCHAR(20),  -- folio, puede ser NULL temporalmente

    -- Datos de identidad
    curp VARCHAR(18) UNIQUE CHECK (length(curp) = 18),  -- puede ser NULL si aún no se captura
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    fecha_nacimiento DATE NOT NULL,  -- la edad SIEMPRE se calcula desde aquí
    sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
    domicilio TEXT,
    telefono VARCHAR(20),
    lugar_nacimiento VARCHAR(150),
    ocupacion VARCHAR(100),
    estado_civil VARCHAR(30),
    religion VARCHAR(50),
    escolaridad VARCHAR(100),

    -- Contacto de emergencia
    contacto_emergencia_nombre VARCHAR(200),
    contacto_emergencia_parentesco VARCHAR(50),
    contacto_emergencia_telefono VARCHAR(20),

    -- Vivienda
    con_quien_habita VARCHAR(100),
    material_construccion VARCHAR(100),
    servicios_agua BOOLEAN DEFAULT FALSE,
    servicios_luz BOOLEAN DEFAULT FALSE,
    servicios_drenaje BOOLEAN DEFAULT FALSE,
    num_personas_cohabitan INT,
    zoonosis VARCHAR(200),

    -- Antecedentes
    antecedentes_heredofamiliares TEXT,
    tabaquismo BOOLEAN DEFAULT FALSE,
    alcoholismo BOOLEAN DEFAULT FALSE,
    farmacodependencia BOOLEAN DEFAULT FALSE,
    grupo_sanguineo VARCHAR(5) CHECK (grupo_sanguineo IN ('A', 'B', 'AB', 'O')),   -- A, B, AB, O
    rh VARCHAR(5) CHECK (rh IN ('+', '-')),                -- +, -
    alergias TEXT,
    antecedentes_quirurgicos TEXT,
    antecedentes_transfusionales TEXT,

    -- Antecedentes gineco-obstétricos (aplica si sexo = 'F')
    menarca VARCHAR(50),
    ritmo_menstrual VARCHAR(100),
    ivsa VARCHAR(50),
    num_parejas INT,
    citologia_cervical BOOLEAN DEFAULT FALSE,
    autoexploracion_mamaria BOOLEAN DEFAULT FALSE,
    metodo_planificacion_familiar VARCHAR(100),
    fecha_ultima_menstruacion DATE,
    fecha_probable_parto DATE,
    fecha_ultimo_parto DATE,

    -- Fórmula obstétrica
    gesta INT DEFAULT 0,
    para INT DEFAULT 0,
    cesarea INT DEFAULT 0,
    aborto INT DEFAULT 0,
    num_controles_prenatales INT DEFAULT 0,
    lugar_control VARCHAR(200),
    hijos_vivos INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES usuarios(id_usuario)
);

CREATE UNIQUE INDEX ON paciente(expediente_clinico) WHERE expediente_clinico IS NOT NULL;

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE cat_cie10 (
  codigo VARCHAR(10) PRIMARY KEY,
  descripcion TEXT NOT NULL,
  capitulo VARCHAR(5),
  activo BOOLEAN DEFAULT TRUE
);

INSERT INTO cat_cie10 (codigo, descripcion, capitulo) VALUES
  ('J189', 'Neumonía, no especificada', 'X'),
  ('E119', 'Diabetes mellitus no insulinodependiente sin complicaciones', 'IV'),
  ('I10X', 'Hipertensión esencial (primaria)', 'IX'),
  ('K358', 'Otras apendicitis agudas y las no especificadas', 'XI'),
  ('N390', 'Infección de vías urinarias, sitio no especificado', 'XIV'),
  ('O149', 'Preeclampsia, no especificada', 'XV'),
  ('A099', 'Gastroenteritis y colitis de origen no especificado', 'I'),
  ('J069', 'Infección aguda de las vías respiratorias superiores, no especificada', 'X'),
  ('O809', 'Parto único espontáneo, sin otra especificación', 'XV'),
  ('O829', 'Parto por cesárea, sin otra especificación', 'XV'),
  ('Z392', 'Seguimiento sistemático de rutina del posparto', 'XXI'),
  ('S820', 'Fractura de la rótula', 'XIX'),
  ('S525', 'Fractura de la epífisis inferior del radio', 'XIX'),
  ('K802', 'Cálculo de la vesícula biliar sin colecistitis', 'XI'),
  ('R509', 'Fiebre, no especificada', 'XVIII'),
  ('D509', 'Anemia por deficiencia de hierro sin otra especificación', 'III'),
  ('H109', 'Conjuntivitis, no especificada', 'VII'),
  ('J459', 'Asma, no especificada', 'X'),
  ('M545', 'Lumbago no especificado', 'XIII'),
  ('O200', 'Amenaza de aborto', 'XV');

CREATE TABLE cat_salas (
  id_sala SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  piso INTEGER,
  tipo VARCHAR(50)
);

INSERT INTO cat_salas (nombre, piso, tipo) VALUES
  ('Urgencias', 1, 'urgencias'),
  ('Medicina Interna', 2, 'hospitalizacion'),
  ('Ginecología', 3, 'hospitalizacion'),
  ('Pediatría', 4, 'hospitalizacion'),
  ('Cirugía', 5, 'hospitalizacion'),
  ('Labor/Tococirugía', 3, 'obstetricia');

CREATE TABLE cat_camas (
  id_cama SERIAL PRIMARY KEY,
  numero_cama VARCHAR(20) NOT NULL UNIQUE,
  id_sala INTEGER REFERENCES cat_salas(id_sala),
  tipo VARCHAR(30) DEFAULT 'general',
  estatus VARCHAR(20) DEFAULT 'disponible',
  CHECK (estatus IN ('disponible', 'ocupada', 'mantenimiento', 'reservada'))
);

INSERT INTO cat_camas (numero_cama, id_sala, tipo, estatus) VALUES
  ('URG-1', 1, 'general', 'disponible'),
  ('URG-2', 1, 'general', 'disponible'),
  ('URG-3', 1, 'aislado', 'disponible'),
  ('MI-101', 2, 'general', 'disponible'),
  ('MI-102', 2, 'general', 'disponible'),
  ('MI-103', 2, 'general', 'disponible'),
  ('GIN-201', 3, 'general', 'disponible'),
  ('GIN-202', 3, 'general', 'disponible'),
  ('GIN-203', 3, 'general', 'disponible'),
  ('PED-301', 4, 'cuna', 'disponible'),
  ('PED-302', 4, 'cuna', 'disponible'),
  ('PED-303', 4, 'incubadora', 'disponible'),
  ('CIR-401', 5, 'general', 'disponible'),
  ('CIR-402', 5, 'general', 'disponible'),
  ('CIR-403', 5, 'general', 'disponible'),
  ('LAB-1', 6, 'labor', 'disponible'),
  ('LAB-2', 6, 'labor', 'disponible');

CREATE TABLE paciente_alergia (
  id_alergia SERIAL PRIMARY KEY,
  id_paciente INTEGER NOT NULL REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
  alergeno VARCHAR(200) NOT NULL,
  tipo_reaccion VARCHAR(100),
  severidad VARCHAR(20) CHECK (severidad IN ('leve', 'moderada', 'severa', 'anafilaxia')),
  observaciones TEXT,
  reportado_por INTEGER REFERENCES usuarios(id_usuario),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECIEN_NACIDO
-- Se genera cuando un encuentro obstétrico produce un nacimiento
-- ============================================================

CREATE TABLE recien_nacido (
    id_recien_nacido SERIAL PRIMARY KEY,
    id_madre INT NOT NULL REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    id_encuentro INT,  -- FK se agrega después de crear encuentro

    expediente_pediatrico VARCHAR(20) UNIQUE,

    sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
    fecha_hora_nacimiento TIMESTAMPTZ NOT NULL,

    -- Antropometría
    peso INT,           -- en gramos
    talla DECIMAL(5,1),          -- en cm
    perimetro_toracico DECIMAL(5,1),
    perimetro_cefalico DECIMAL(5,1),
    perimetro_abdominal DECIMAL(5,1),
    longitud_pie DECIMAL(5,1),

    -- Evaluación
    apgar_1 INT CHECK (apgar_1 BETWEEN 0 AND 10),
    apgar_5 INT CHECK (apgar_5 BETWEEN 0 AND 10),
    apgar_10 INT CHECK (apgar_10 BETWEEN 0 AND 10),
    capurro_semanas INT,
    capurro_dias INT,
    semanas_gestacion_al_nacer INT,

    -- Parto
    via_nacimiento VARCHAR(20) CHECK (via_nacimiento IN ('parto_vaginal', 'cesarea')),
    alojamiento VARCHAR(30) CHECK (alojamiento IN ('conjunto', 'incubadora', 'cuna')),
    alimentacion VARCHAR(100),

    -- Diagnóstico
    diagnostico_final TEXT,

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES usuarios(id_usuario)
);

-- ============================================================
-- ENCUENTRO / EPISODIO HOSPITALARIO
-- Cada ingreso del paciente al hospital
-- ============================================================

CREATE TABLE encuentro (
    id_encuentro SERIAL PRIMARY KEY,
    id_paciente INT NOT NULL REFERENCES paciente(id_paciente),
    fecha_hora_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    area_ingreso VARCHAR(50) NOT NULL,  -- urgencias, consulta_externa, hospitalizacion, obstetricia
    id_medico_responsable INT REFERENCES personal_medico(id_medico),
    estatus VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estatus IN ('activo', 'alta', 'referido', 'defuncion')),
    fecha_hora_alta TIMESTAMPTZ,
    diagnostico_egreso TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES usuarios(id_usuario)
);

-- Ahora sí agregamos la FK de recien_nacido a encuentro
ALTER TABLE recien_nacido
    ADD CONSTRAINT fk_rn_encuentro
    FOREIGN KEY (id_encuentro) REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT;

-- ============================================================
-- HISTORIA CLÍNICA (1:1 por encuentro)
-- Interrogatorio por aparatos y sistemas, exploración física
-- ============================================================

CREATE TABLE historia_clinica (
    id_historia_clinica SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    -- Padecimiento actual
    padecimiento_actual TEXT NOT NULL,

    -- Interrogatorio por aparatos y sistemas (catálogo estructurado)
    -- Cada aparato tiene: niega (boolean) + hallazgos (texto libre)
    int_sistema_niega BOOLEAN DEFAULT TRUE,
    int_sistema_observaciones TEXT,

    int_aparato_cardiovascular_niega BOOLEAN DEFAULT TRUE,
    int_aparato_cardiovascular_observaciones TEXT,

    int_aparato_respiratorio_niega BOOLEAN DEFAULT TRUE,
    int_aparato_respiratorio_observaciones TEXT,

    int_aparato_digestivo_niega BOOLEAN DEFAULT TRUE,
    int_aparato_digestivo_observaciones TEXT,

    int_aparato_genitourinario_niega BOOLEAN DEFAULT TRUE,
    int_aparato_genitourinario_observaciones TEXT,

    int_aparato_neurologico_niega BOOLEAN DEFAULT TRUE,
    int_aparato_neurologico_observaciones TEXT,

    int_aparato_musculoesqueletico_niega BOOLEAN DEFAULT TRUE,
    int_aparato_musculoesqueletico_observaciones TEXT,

    int_aparato_piel_anexos_niega BOOLEAN DEFAULT TRUE,
    int_aparato_piel_anexos_observaciones TEXT,

    int_aparato_endocrino_niega BOOLEAN DEFAULT TRUE,
    int_aparato_endocrino_observaciones TEXT,

    int_aparato_hematico_niega BOOLEAN DEFAULT TRUE,
    int_aparato_hematico_observaciones TEXT,

    -- Exploración física por segmentos
    ef_cabeza TEXT,
    ef_cuello TEXT,
    ef_torax TEXT,
    ef_abdomen TEXT,
    ef_extremidades TEXT,
    ef_pelvis TEXT,
    ef_columna TEXT,
    ef_neurologico TEXT,

    -- Signos vitales
    temperatura DECIMAL(4,1) CHECK (temperatura BETWEEN 20.0 AND 45.0),
    presion_arterial_sistolica INT CHECK (presion_arterial_sistolica BETWEEN 0 AND 300),
    presion_arterial_diastolica INT CHECK (presion_arterial_diastolica BETWEEN 0 AND 200),
    frecuencia_cardiaca INT CHECK (frecuencia_cardiaca BETWEEN 0 AND 300),
    frecuencia_respiratoria INT CHECK (frecuencia_respiratoria BETWEEN 0 AND 100),
    peso DECIMAL(5,1),
    talla DECIMAL(5,1),
    saturacion_oxigeno INT CHECK (saturacion_oxigeno BETWEEN 0 AND 100),

    -- Diagnóstico y plan
    diagnostico TEXT,
    plan_tratamiento TEXT,

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    -- Metadata
    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA DE INGRESO (1:1 por encuentro)
-- Formato SOAP
-- ============================================================

CREATE TABLE nota_ingreso (
    id_nota_ingreso SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    subjetivo TEXT,        -- S: qué refiere el paciente
    objetivo TEXT,         -- O: hallazgos de exploración y estudios
    analisis TEXT,         -- A: razonamiento clínico
    plan TEXT,             -- P: plan de tratamiento

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA DE URGENCIAS (1:N por encuentro)
-- Evoluciones sucesivas en urgencias
-- ============================================================

CREATE TABLE nota_urgencias (
    id_nota_urgencias SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    -- Triage
    triage_color VARCHAR(20) CHECK (triage_color IN ('azul', 'verde', 'amarillo', 'naranja', 'rojo')),

    -- Exploración física de esta nota
    ef_urgencias TEXT,

    -- Evolución
    evolucion TEXT NOT NULL,
    estudios_solicitados TEXT,
    resultados_estudios TEXT,  -- USG, PSS, etc.

    -- Diagnóstico de esta nota
    diagnostico TEXT,

    -- Plan
    plan TEXT,

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDEN DE LABORATORIO / GABINETE (1:N por encuentro)
-- ============================================================

CREATE TABLE orden_estudio (
    id_orden SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    tipo_estudio VARCHAR(50) NOT NULL CHECK (tipo_estudio IN ('laboratorio', 'gabinete', 'imagenologia')),
    nombre_estudio VARCHAR(200) NOT NULL,  -- hemograma, USG obstétrico, etc.
    indicacion TEXT,                        -- por qué se solicita
    resultados TEXT,                        -- resultados (se llena después)
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    fecha_resultado TIMESTAMPTZ,
    solicitado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTERNAMIENTO (1:1 por encuentro)
-- Bisagra entre urgencias y hospitalización
-- ============================================================

CREATE TABLE internamiento (
    id_internamiento SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    area_destino VARCHAR(50) NOT NULL,  -- hospitalizacion, observacion, terapia
    diagnostico_resumen TEXT,
    cama_asignada VARCHAR(20),
    fecha_hora_internamiento TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDICACIONES MÉDICAS (1:N por encuentro)
-- Varían por turno. Aplica a madre y RN.
-- ============================================================

CREATE TABLE indicaciones_medicas (
    id_indicacion SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
    id_recien_nacido INT REFERENCES recien_nacido(id_recien_nacido),  -- NULL = madre
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('adulto', 'pediatrico')),

    fecha_hora_indicacion TIMESTAMPTZ DEFAULT NOW(),
    turno VARCHAR(20),  -- matutino, vespertino, nocturno

    indicacion TEXT NOT NULL,  -- la indicación completa
    observaciones TEXT,

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARTOGRAMA (1:N por encuentro — mediciones repetidas)
-- ============================================================

CREATE TABLE partograma (
    id_partograma SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    hora_medicion TIME NOT NULL,
    fecha_medicion DATE NOT NULL,

    -- Dilatación cervical (cm, 0-10)
    dilatacion INT CHECK (dilatacion BETWEEN 0 AND 10),
    -- Borramiento (%)
    borramiento INT CHECK (borramiento BETWEEN 0 AND 100),
    -- Presentación y posición
    presentacion VARCHAR(50),  -- cefalica, pelviana, transversa
    posicion VARCHAR(50),      -- OA, OP, OT, etc.
    -- FCF (latidos/min)
    fcf INT,
    -- Contracciones uterinas (cuántas en 10 min)
    contracciones_en_10_min INT,
    -- Intensidad de contracciones (mmHg)
    intensidad_contracciones INT,
    -- Membranas
    membranas VARCHAR(30),  -- intactas, rotas (hora), anemnios
    -- Líquido amniótico
    liquido_amniotico VARCHAR(50),  -- claro, meconial_leve, meconial_denso, sanguinolento
    -- Observaciones
    observaciones TEXT,

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONSENTIMIENTO INFORMADO (1:N por encuentro — uno por procedimiento)
-- ============================================================

CREATE TABLE consentimiento_informado (
    id_consentimiento SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    procedimiento VARCHAR(200) NOT NULL,
    explicacion_procedimiento TEXT NOT NULL,
    riesgos TEXT,
    alternativas TEXT,
    firma_paciente BOOLEAN DEFAULT FALSE,
    firma_testigo1_nombre VARCHAR(200),
    firma_testigo2_nombre VARCHAR(200),
    firma_medico_nombre VARCHAR(200),

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_firma TIMESTAMPTZ,
    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA DE EVOLUCIÓN DIARIA (1:N por encuentro — una por turno)
-- ============================================================

CREATE TABLE nota_evolucion_diaria (
    id_nota_evolucion SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    fecha DATE NOT NULL,
    turno VARCHAR(20) NOT NULL,  -- matutino, vespertino, nocturno

    -- Signos vitales de esta evolución
    temperatura DECIMAL(4,1) CHECK (temperatura BETWEEN 20.0 AND 45.0),
    presion_arterial VARCHAR(10),  -- "120/80"
    frecuencia_cardiaca INT CHECK (frecuencia_cardiaca BETWEEN 0 AND 300),
    frecuencia_respiratoria INT CHECK (frecuencia_respiratoria BETWEEN 0 AND 100),
    saturacion_oxigeno INT CHECK (saturacion_oxigeno BETWEEN 0 AND 100),
    diuresis VARCHAR(50),  -- cantidad, characteristics
    evacuaciones VARCHAR(50),
    peso DECIMAL(5,1),

    -- Evolución
    subjetivo TEXT,
    objetivo TEXT,
    analisis TEXT,
    plan TEXT,

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATENCIÓN DE PARTO (1:1 condicional — solo si obstetricia)
-- ============================================================

CREATE TABLE atencion_parto (
    id_atencion_parto SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    -- Nota operatoria
    fecha_hora_parto TIMESTAMPTZ,
    indicacion_parto TEXT,
    tecnica_quirurgica TEXT,  -- texto extenso de la técnica
    hallazgos TEXT,
    perdida_hematica_ml INT,
    complicaciones TEXT,

    -- Cuenta de gasas
    gasas_completas BOOLEAN,
    gasas_contadas INT,
    gasas_esperadas INT,

    -- Planificación familiar postparto
    metodo_planificacion_postparto VARCHAR(200),
    observaciones TEXT,

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA DE ATENCIÓN DEL RECIÉN NACIDO (1:1 por RN)
-- ============================================================

CREATE TABLE nota_atencion_rn (
    id_nota_rn SERIAL PRIMARY KEY,
    id_recien_nacido INT NOT NULL UNIQUE REFERENCES recien_nacido(id_recien_nacido) ON DELETE RESTRICT,

    narrativa_nacimiento TEXT,  -- descripción del proceso de nacimiento
    exploracion_fisica TEXT,
    diagnostico TEXT,
    plan TEXT,

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    fecha_hora_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT REFERENCES usuarios(id_usuario),
    medico_cedula VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTERCONSULTA (1:N por encuentro)
-- ============================================================

CREATE TABLE interconsulta (
    id_interconsulta SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    especialidad_solicitada VARCHAR(100) NOT NULL,
    motivo TEXT NOT NULL,
    diagnostico_sugerido TEXT,

    medico_solicitante INT REFERENCES personal_medico(id_medico),
    medico_receptor INT REFERENCES personal_medico(id_medico),
    dictamen TEXT,  -- respuesta de la especialidad

    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    fecha_respuesta TIMESTAMPTZ,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendida', 'rechazada')),

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    registrado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REFERENCIA (1:1 por encuentro — si se traslada)
-- ============================================================

CREATE TABLE referencia (
    id_referencia SERIAL PRIMARY KEY,
    id_encuentro INT NOT NULL UNIQUE REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,

    hospital_receptor VARCHAR(200) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    motivo TEXT NOT NULL,
    resumen_clinico TEXT NOT NULL,
    diagnostico TEXT,
    plan TEXT,

    medico_envia INT REFERENCES personal_medico(id_medico),
    medico_recibe_nombre VARCHAR(200),
    medico_recibe_cedula VARCHAR(30),

    fecha_hora_referencia TIMESTAMPTZ DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'enviada' CHECK (estado IN ('enviada', 'aceptada', 'rechazada')),

    -- Firmas
    firmado BOOLEAN DEFAULT FALSE,
    fecha_firma TIMESTAMPTZ,
    firmado_por INTEGER REFERENCES usuarios(id_usuario),

    -- Soft delete
    eliminado BOOLEAN DEFAULT FALSE,
    eliminado_por INTEGER REFERENCES usuarios(id_usuario),
    eliminado_en TIMESTAMPTZ,
    motivo_eliminacion TEXT,

    registrado_por INT REFERENCES usuarios(id_usuario),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA EGRESO (1:1 por encuentro)
-- ============================================================

CREATE TABLE nota_egreso (
  id_nota_egreso SERIAL PRIMARY KEY,
  id_encuentro INTEGER NOT NULL REFERENCES encuentro(id_encuentro) ON DELETE RESTRICT,
  fecha_egreso TIMESTAMPTZ DEFAULT NOW(),
  motivo_egreso VARCHAR(30) NOT NULL CHECK (motivo_egreso IN ('mejoria', 'curacion', 'voluntaria', 'traslado', 'defuncion', 'otro')),
  diagnostico_ingreso TEXT,
  diagnostico_egreso TEXT,
  codigo_cie10_egreso VARCHAR(10) REFERENCES cat_cie10(codigo),
  resumen_clinico TEXT,
  estado_salud_egreso TEXT,
  problemas_pendientes TEXT,
  plan_seguimiento TEXT,
  medicamentos_alta TEXT,
  cita_seguimiento DATE,
  medico_cedula VARCHAR(30),
  registrado_por INTEGER REFERENCES usuarios(id_usuario),
  
  -- Firmas
  firmado BOOLEAN DEFAULT FALSE,
  fecha_firma TIMESTAMPTZ,
  firmado_por INTEGER REFERENCES usuarios(id_usuario),
  
  -- Soft delete
  eliminado BOOLEAN DEFAULT FALSE,
  eliminado_por INTEGER REFERENCES usuarios(id_usuario),
  eliminado_en TIMESTAMPTZ,
  motivo_eliminacion TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- BITÁCORA DE AUDITORÍA (NOM-004 / datos sensibles)
-- ============================================================

CREATE TABLE audit_log (
    id_log BIGSERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id_usuario),
    accion VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE, SELECT_SENSITIVE
    tabla VARCHAR(100) NOT NULL,
    id_registro INT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha_hora TIMESTAMPTZ DEFAULT NOW()
);

-- IMPORTANT: Application DB user should only have INSERT privilege on this table
-- REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- ============================================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================================

-- Búsquedas frecuentes de pacientes
CREATE INDEX idx_paciente_nombre ON paciente(apellido_paterno, apellido_materno, nombre);
CREATE INDEX idx_paciente_busqueda_trgm ON paciente USING gin ((nombre || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '')) gin_trgm_ops);

-- Personal medico y roles
CREATE INDEX idx_personal_medico_rol ON personal_medico(id_rol_sistema);
CREATE INDEX idx_usuarios_rol ON usuarios(id_rol);
CREATE INDEX idx_usuarios_medico ON usuarios(id_medico);

-- Encuentros por paciente (historial)
CREATE INDEX idx_encuentro_paciente ON encuentro(id_paciente);
CREATE INDEX idx_encuentro_estatus ON encuentro(estatus);
CREATE INDEX idx_encuentro_fecha ON encuentro(fecha_hora_ingreso);
CREATE INDEX idx_encuentro_activos ON encuentro(id_paciente, fecha_hora_ingreso) WHERE estatus = 'activo';

-- Registros clínicos por encuentro (todas las tablas 1:N)
CREATE INDEX idx_nota_urgencias_encuentro ON nota_urgencias(id_encuentro);
CREATE INDEX idx_orden_estudio_encuentro ON orden_estudio(id_encuentro);
CREATE INDEX idx_indicaciones_encuentro ON indicaciones_medicas(id_encuentro);
CREATE INDEX idx_indicaciones_rn ON indicaciones_medicas(id_recien_nacido);
CREATE INDEX idx_partograma_encuentro ON partograma(id_encuentro);
CREATE INDEX idx_consentimiento_encuentro ON consentimiento_informado(id_encuentro);
CREATE INDEX idx_evolucion_diaria_encuentro ON nota_evolucion_diaria(id_encuentro);
CREATE INDEX idx_interconsulta_encuentro ON interconsulta(id_encuentro);
CREATE INDEX idx_interconsulta_solicitante ON interconsulta(medico_solicitante);
CREATE INDEX idx_interconsulta_receptor ON interconsulta(medico_receptor);
CREATE INDEX idx_referencia_medico ON referencia(medico_envia);

-- Recién nacido por madre y por encuentro
CREATE INDEX idx_rn_madre ON recien_nacido(id_madre);
CREATE INDEX idx_rn_encuentro ON recien_nacido(id_encuentro);

-- Auditoría por tabla y registro (para trazabilidad)
CREATE INDEX idx_audit_tabla_registro ON audit_log(tabla, id_registro);
CREATE INDEX idx_audit_usuario ON audit_log(id_usuario);
CREATE INDEX idx_audit_fecha ON audit_log(fecha_hora);

-- ============================================================
-- SOLICITUDES DE RESTABLECIMIENTO Y NOTIFICACIONES (NOM-004)
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_password (
    id_solicitud SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_medico INT REFERENCES personal_medico(id_medico) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    nombre_solicitante VARCHAR(200) NOT NULL,
    estatus VARCHAR(20) DEFAULT 'pendiente',
    motivo TEXT,
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    fecha_atencion TIMESTAMPTZ,
    atendido_por INT REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    para_rol VARCHAR(50),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    id_solicitud INT REFERENCES solicitudes_password(id_solicitud) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(id_usuario);
CREATE INDEX idx_notificaciones_rol ON notificaciones(para_rol);
CREATE INDEX idx_solicitudes_estatus ON solicitudes_password(estatus);
