// ============================================================
// Types — Expediente Clínico Digital
// Sistema Hospitalario Local conforme a NOM-004-SSA3, NOM-024-SSA3 y LGPDPPSO
// ============================================================

import { Request } from 'express';

// ---- Auth & Roles ----
export type RolUsuario = 'admin' | 'admision' | 'medico' | 'enfermeria' | 'laboratorio' | 'obstetricia' | 'pediatria';

export interface Usuario {
  id_usuario: number;
  username: string;
  password_hash: string;
  id_medico: number | null;
  id_rol: number;
  activo: boolean;
}

export interface JwtPayload {
  id_usuario: number;
  username: string;
  id_rol: number;
  rol_nombre: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ---- Paciente Maestro (Single Source of Truth) ----
export interface Paciente {
  id_paciente: number;
  expediente_clinico: string;
  curp: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string;
  edad?: number;
  edad_meses?: number;
  edad_dias?: number;
  pais_nacimiento: string;
  entidad_nacimiento?: string;
  sexo: 'Hombre' | 'Mujer' | 'Intersexual' | 'M' | 'F';
  estado_civil?: string;
  ocupacion?: string;
  telefono?: string;
  
  // Domicilio estructurado
  domicilio_pais?: string;
  domicilio_entidad?: string;
  domicilio_municipio?: string;
  domicilio_localidad?: string;
  domicilio_cp?: string;
  domicilio_tipo_vialidad?: string;
  domicilio_nombre_vialidad?: string;
  domicilio_num_exterior?: string;
  domicilio_num_interior?: string;
  domicilio_tipo_asentamiento?: string;
  domicilio_nombre_asentamiento?: string;
  domicilio?: string; // Compatibilidad legacy

  // Afiliación
  afiliacion?: string;
  num_afiliacion?: string;

  // Datos Clínicos
  grupo_sanguineo?: string;
  rh?: string;
  factor_rh?: string;
  alergias?: string;

  // Tutor / Representante Legal
  tutor_nombre?: string;
  tutor_parentesco?: string;
  tutor_telefono?: string;

  // Identidad Federal SINBA
  es_indigena?: boolean;
  habla_lengua_indigena?: boolean;
  lengua_indigena?: string;
  es_afromexicano?: boolean;
  es_migrante_retornado?: boolean;
  comunidad_lgbt?: boolean;
  identidad_lgbt?: string;

  created_at?: string;
  updated_at?: string;
}

// ---- Encuentro / Episodio Hospitalario ----
export type AreaHospitalaria = 'Urgencias' | 'Hospitalizacion' | 'Consulta Externa' | 'Pediatria' | 'Tococirugia' | 'urgencias' | 'consulta_externa' | 'hospitalizacion' | 'obstetricia';

export interface Encuentro {
  id_encuentro: number;
  id_paciente: number;
  fecha_hora_ingreso: string;
  area_ingreso: AreaHospitalaria;
  id_medico_responsable: number | null;
  estatus: 'activo' | 'alta' | 'referido' | 'defuncion';
  fecha_hora_alta?: string | null;
  diagnostico_egreso?: string | null;
  cama_actual?: string | null;
}

// ============================================================
// LOS 15 DOCUMENTOS OFICIALES
// ============================================================

// 4.1 Aviso de Privacidad
export interface DocAvisoPrivacidad {
  id_aviso?: number;
  id_encuentro: number;
  autoriza_transferencia: boolean;
  unidad_medica: string;
  municipio: string;
  fecha: string;
  firmado: boolean;
  fecha_firma?: string;
  firmado_por?: number;
  firma_nombre?: string;
  firma_parentesco?: string;
  huella_registrada?: boolean;
  urgencia_vital_pendiente?: boolean;
}

// 4.2 Carta de Consentimiento Informado
export interface DocConsentimientoInformado {
  id_consentimiento?: number;
  id_encuentro: number;
  unidad_medica?: string;
  lugar?: string;
  fecha: string;
  hora: string;
  ocupacion?: string;
  servicio: string;
  diagnosticos_clinicos?: string;
  estudios_previos?: string;
  actos_anestesicos?: string;
  tratamiento_medico?: string;
  tratamiento_quirurgico?: string;
  riesgos_complicaciones?: string;
  personal_medico_nombre?: string;
  personal_medico_cedula?: string;
  familiar_nombre?: string;
  familiar_parentesco?: string;
  testigo1_nombre?: string;
  testigo2_nombre?: string;
  firmado: boolean;
  fecha_firma?: string;
}

// 4.3 Hoja Frontal
export interface DiagnosticoFrontal {
  fecha_atencion: string;
  diagnostico: string;
  fecha_control?: string;
}

export interface DocHojaFrontal {
  id_hoja_frontal?: number;
  id_encuentro: number;
  fecha: string;
  personal_medico_tratante: string;
  cedula_profesional: string;
  diagnosticos_json: DiagnosticoFrontal[];
  firmado?: boolean;
}

// 4.4 Historia Clínica General (Adultos >= 18)
export interface HistoriaClinicaGeneral {
  id_historia_clinica?: number;
  id_encuentro: number;
  fecha?: string;
  hora?: string;
  tipo_interrogatorio: 'Directo' | 'Indirecto';
  ocupacion?: string;
  grupo_etnico?: string;
  antecedentes_heredofamiliares?: string;
  antecedentes_no_patologicos?: string;
  antecedentes_patologicos?: string;
  antecedentes_gineco_obstetricos?: string;
  padecimiento_actual: string;
  
  // 9 Sistemas
  int_cardiovascular?: string;
  int_respiratorio?: string;
  int_gastrointestinal?: string;
  int_genitourinario?: string;
  int_hematico_linfatico?: string;
  int_endocrino?: string;
  int_nervioso?: string;
  int_musculoesqueletico?: string;
  int_piel_mucosas?: string;
  
  // Signos vitales
  temperatura?: number;
  presion_arterial_sistolica?: number;
  presion_arterial_diastolica?: number;
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  peso?: number;
  talla?: number;
  
  // Exploración física
  ef_cabeza?: string;
  ef_cuello?: string;
  ef_torax?: string;
  ef_abdomen?: string;
  ef_genitales?: string;
  ef_extremidades?: string;
  ef_piel?: string;
  habitus_exterior?: string;

  resultados_laboratorio?: string;
  diagnostico?: string;
  tx_previo?: string;
  tx_actual?: string;
  pronostico?: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// 4.5 Historia Clínica Pediátrica (< 18 años)
export interface DocHistoriaClinicaPediatrica {
  id_hc_pediatrica?: number;
  id_encuentro: number;
  fecha: string;
  hora: string;
  tipo_interrogatorio: 'Directo' | 'Indirecto';
  ocupacion?: string;
  
  // Exclusivos pediátricos
  antecedentes_perinatales?: string;
  alimentacion?: string;
  inmunizaciones?: string;
  desarrollo_psicomotor?: string;
  
  antecedentes_heredofamiliares?: string;
  antecedentes_no_patologicos?: string;
  antecedentes_patologicos?: string;
  padecimiento_actual: string;
  
  int_cardiovascular?: string;
  int_respiratorio?: string;
  int_gastrointestinal?: string;
  int_genitourinario?: string;
  int_hematico_linfatico?: string;
  int_endocrino?: string;
  int_nervioso?: string;
  int_musculoesqueletico?: string;
  int_piel_mucosas?: string;
  
  temperatura?: number;
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  peso?: number;
  talla?: number;
  
  habitus_exterior_neurologico?: string;
  ef_cabeza?: string;
  ef_cuello?: string;
  ef_torax?: string;
  ef_abdomen?: string;
  ef_genitales?: string;
  ef_extremidades?: string;
  ef_piel?: string;
  
  resultados_laboratorio?: string;
  diagnosticos?: string;
  terapeutica_empleada?: string;
  pronostico?: string;
  
  medico_nombre?: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// 4.6 Hoja de Consulta de Urgencias
export interface DocConsultaUrgencias {
  id_nota_urgencias?: number;
  id_encuentro: number;
  folio?: string;
  codigo_triage: 'Urgencia Inmediata' | 'Urgencia Calificada' | 'Urgencia Sentida';
  urgencia_calificada_bool: boolean;
  ocupacion?: string;
  procedencia?: string;
  responsable_nombre?: string;
  responsable_parentesco?: string;
  responsable_domicilio?: string;
  responsable_telefono?: string;
  fecha_hora_atencion: string;
  ta?: string;
  temp?: number;
  fr?: number;
  fc?: number;
  peso?: number;
  talla?: number;
  motivo_consulta: string;
  antecedentes?: string;
  padecimiento_actual: string;
  exploracion_fisica?: string;
  diagnosticos_presuncionales: string;
  analisis_pronosticos?: string;
  tratamiento_plan: string;
  observaciones_estudios?: string;
  familiar_firma?: string;
  medico_nombre?: string;
  firmado?: boolean;
}

// 4.7 Hoja de Indicaciones Médicas (Solo-anexar)
export interface IndicacionOrdenItem {
  id_orden?: number;
  id_hoja_indicaciones?: number;
  fecha: string;
  hora: string;
  indicacion: string;
  medico_nombre: string;
  medico_cedula?: string;
  firmado?: boolean;
}

export interface DocHojaIndicaciones {
  id_hoja_indicaciones?: number;
  id_encuentro: number;
  hoja_num: number;
  servicio: string;
  fecha: string;
  hora: string;
  ta?: string;
  temp?: number;
  fc?: number;
  fr?: number;
  peso?: number;
  talla?: number;
  ordenes: IndicacionOrdenItem[];
}

// 4.8 Nota de Egreso / Contrarreferencia (Bloqueada hasta egreso)
export interface DocNotaEgreso {
  id_nota_egreso?: number;
  id_encuentro: number;
  tipo_ingreso: 'Enviado programado' | 'Enviado urgencias' | 'Urgencias directo';
  fecha_hora_egreso: string;
  motivo_egreso: string;
  servicio_egreso: string;
  diagnosticos_finales: string;
  resumen_evaluacion: string;
  tratamiento_intrahospitalario?: string;
  problemas_pendientes?: string;
  plan_manejo_egreso: string;
  recomendaciones_ambulatorias?: string;
  factores_riesgo?: string;
  pronostico?: string;
  medico_responsable: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// 4.9 Notas de Evolución (Solo-anexar)
export interface DocNotaEvolucion {
  id_nota_evolucion?: number;
  id_encuentro: number;
  hoja_num: number;
  total_hojas?: number;
  fecha: string;
  hora: string;
  presion_arterial?: string;
  temperatura?: number;
  frecuencia_cardiaca?: number;
  frecuencia_respiratoria?: number;
  peso?: number;
  talla?: number;
  nota_evolucion_texto: string;
  medico_nombre: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// 4.10 Partograma
export interface FilaVigilanciaLabor {
  hora_labor: number; // 1 a 14
  hora_reloj: string;
  fcf: number; // 120 - 160
  contracciones_10min: number;
  mil_soluciones?: string;
  ta?: string;
  pulso?: number;
  temp?: number;
  dilatacion_cm: number; // 1 - 10
  plano_presentacion: 'I' | 'II' | 'III' | 'IV';
}

export interface DocPartograma {
  id_partograma?: number;
  id_encuentro: number;
  gesta: number;
  para: number;
  cesareas: number;
  abortos: number;
  hijos_vivos: number;
  fecha_ultimo_parto?: string;
  fecha_ultima_menstruacion?: string;
  fecha_probable_parto?: string;
  semanas_gestacion?: number;
  control_prenatal: boolean;
  consultas_totales?: number;
  consultas_hospital?: number;
  lugar_consultas?: string;
  complicaciones_embarazo?: string;
  tratamiento_embarazo?: string;
  
  // Ingreso
  actividad_uterina_inicio?: string;
  sangrado_transvaginal?: string;
  ruptura_membranas?: string;
  movimiento_fetal?: string;
  edema?: string;
  fcf_ingreso?: number;
  ritmo_tono?: string;
  cervix_dilatacion_borramiento?: string;
  presentacion_pelvis?: string;
  impresion_diagnostica?: string;
  indicaciones_ingreso?: string;
  planos_hodge?: string;
  
  // Cuadrícula 14 horas
  vigilancia_14_horas: FilaVigilanciaLabor[];
  medico_responsable?: string;
  firmado?: boolean;
}

// 4.11 Solicitud de Estudio de Gabinete
export interface DocSolicitudGabinete {
  id_solicitud?: number;
  id_encuentro: number;
  fecha: string;
  hora: string;
  procedencia: 'Consulta Externa' | 'Urgencias' | 'Hospitalización';
  servicio?: string;
  cama?: string;
  tipo_paciente: '1ª vez' | 'Subsecuente';
  datos_clinicos?: string;
  diagnostico: string;
  estudios_solicitados: string;
  fecha_proxima_consulta?: string;
  medico_solicitante: string;
  medico_cedula?: string;
  vobo_gestor?: string;
  observaciones?: string;
  
  // Interpretación (Imagenología)
  placa_utilizada?: string;
  clave_estudio?: string;
  interpretacion?: string;
  fecha_interpretacion?: string;
  medico_interpreta?: string;
  medico_interpreta_cedula?: string;
  observaciones_interpretacion?: string;
  firmado?: boolean;
}

// 4.12 Solicitud de Laboratorio
export interface DocSolicitudLaboratorio {
  id_solicitud_lab?: number;
  id_encuentro: number;
  fecha_solicitud: string;
  cama?: string;
  tipo_servicio: 'Hospitalización' | 'Consulta Externa' | 'Urgencias' | 'Otro';
  especialidad_medica?: string;
  medico_solicitante: string;
  medico_cedula?: string;
  diagnostico: string;
  medicamentos_observaciones?: string;
  estudios_seleccionados: string[]; // Lista de códigos de estudios seleccionados
  otros_estudios?: string;
  sello_digital?: string;
  firmado?: boolean;
}

// 4.13 Solicitud-Recepción de Interconsulta Médica
export interface DocInterconsulta {
  id_interconsulta?: number;
  id_encuentro: number;
  fecha_solicitud: string;
  hora_solicitud: string;
  cama?: string;
  servicio_solicitante: string;
  medico_solicitante: string;
  motivo_interconsulta: string;
  servicio_solicitado: string;
  medico_receptor?: string;
  fecha_recibido?: string;
  hora_recibido?: string;
  firma_solicito?: boolean;
  firma_recibio?: boolean;
}

// 4.14 Hoja de Hospitalización (SINBA-14)
export interface DocHojaHospitalizacionSINBA14 {
  id_sinba14?: number;
  id_encuentro: number;
  clues: string;
  folio?: string;
  gratuidad: boolean;
  nacio_en_hospital: boolean;
  peso_kg?: number;
  talla_cm?: number;
  tipo_servicio: 'Hospitalización' | 'Corta estancia';
  fecha_ingreso: string;
  fecha_egreso?: string;
  traslados_internos?: string;
  dias_uti?: number;
  dias_terapia_intermedia?: number;
  procedencia?: string;
  motivo_egreso?: string;
  mujer_edad_fertil?: string;
  afeccion_principal?: string;
  afeccion_principal_cie?: string;
  afeccion_primera_vez: boolean;
  comorbilidades: Array<{ cie: string; descripcion: string }>;
  causa_externa?: string;
  infeccion_intrahospitalaria: boolean;
  procedimientos_quirurgicos: Array<{ quirofano_in?: string; quirofano_out?: string; anestesia?: string; cirujano?: string; cie9mc?: string }>;
  tipo_anestesia?: string;
  hoja_lesiones_violencia: boolean;
  hoja_lesiones_folio?: string;
  metodo_gineco_obstetrico?: string;
  tipo_procedimiento_aborto?: string;
  tipo_parto?: string;
  producto_embarazo?: string;
  semanas_gestacion?: number;
  metodo_planificacion_familiar?: string;
  productos_recien_nacidos: Array<{ condicion_nacimiento?: string; condicion_egreso?: string; folio_identificador?: string; apgar5?: number; reanimacion?: boolean; distocia?: boolean }>;
  tipo_unidad_egreso?: string;
  medico_responsable?: string;
  medico_curp?: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// 4.15 Hoja Diaria del Servicio de Urgencias (SINBA-16)
export interface DocHojaDiariaUrgenciasSINBA16 {
  id_sinba16?: number;
  id_encuentro: number;
  clues: string;
  folio?: string;
  atencion_prehospitalaria: boolean;
  tiempo_traslado_horas?: string;
  fecha_hora_ingreso: string;
  fecha_hora_alta?: string;
  tipo_urgencia: 'Urgencia calificada' | 'Urgencia no calificada';
  motivo_atencion: 'Accidente/envenenamiento y violencia' | 'Médico' | 'Gineco-obstétrico' | 'Pediátrico';
  tipo_caso: 'Caso de observación' | 'Caso de choque' | 'No aplica';
  traslado_transferido: boolean;
  destino_unidad?: string;
  alta_por?: string;
  mujer_edad_fertil?: string;
  afeccion_principal?: string;
  afeccion_principal_cie?: string;
  comorbilidades: Array<{ cie: string; descripcion: string }>;
  causa_externa?: string;
  hoja_lesiones_violencia: boolean;
  hoja_lesiones_folio?: string;
  interconsultas_urgencias: Array<{ medico: string; curp?: string; cedula?: string; especialidad?: string }>;
  procedimientos_realizados: any[];
  medicamentos_administrados: any[];
  seccion_menores_5_anios: any;
  medico_responsable?: string;
  medico_curp?: string;
  medico_cedula?: string;
  firmado?: boolean;
}

// ---- Bitácora de Auditoría ----
export interface AuditEntry {
  id_log?: number;
  id_usuario?: number;
  nombre_usuario?: string;
  rol_usuario?: string;
  accion: 'CREACION' | 'EDICION' | 'CORRECCION' | 'CONSULTA' | 'FIRMA' | 'IMPRESION';
  tabla_afectada: string;
  id_registro_afectado: number;
  campo_modificado?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  motivo_correccion?: string;
  ip_origen?: string;
  fecha_hora?: string;
}

// ---- API Response ----
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
