const API_BASE = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/+$/, '')}/api`
  : '/api';

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  if (res.status === 401 && window.location.pathname !== '/login') {
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const errorData = await res.json();
      message = errorData.error || errorData.message || message;
    } catch {
      // Response was not JSON
    }
    throw new Error(message);
  }

  if (res.status === 204) return {} as T;

  const data = await res.json();
  return data;
}

// ============================================================
// Auth
// ============================================================
export const auth = {
  login: (username: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  actualizarCredenciales: (data: {
    username?: string;
    password_actual: string;
    nueva_password?: string;
  }) =>
    request('/auth/mis-credenciales', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cambiarPasswordObligatorio: (data: {
    nueva_password: string;
    confirmar_password?: string;
  }) =>
    request('/auth/cambiar-password-obligatorio', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// Pacientes
// ============================================================
export const pacientes = {
  list: (params?: { buscar?: string; expediente?: string; curp?: string }) => {
    const query = new URLSearchParams();
    if (params?.buscar) query.set('buscar', params.buscar);
    if (params?.expediente) query.set('expediente', params.expediente);
    if (params?.curp) query.set('curp', params.curp);
    return request(`/pacientes?${query.toString()}`);
  },

  get: (id: number) => request(`/pacientes/${id}`),

  create: (data: any) =>
    request('/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    request(`/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    request(`/pacientes/${id}`, { method: 'DELETE' }),

  // Encuentros
  getEncuentros: (pacienteId: number) =>
    request(`/pacientes/${pacienteId}/encuentros`),

  crearEncuentro: (pacienteId: number, data: any) =>
    request(`/pacientes/${pacienteId}/encuentros`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Catálogo Personal Médico
  getPersonalMedico: (area?: string) =>
    request(area ? `/pacientes/catalogo/personal-medico?area=${encodeURIComponent(area)}` : '/pacientes/catalogo/personal-medico'),
  getCamas: (params?: { area?: string; tipo?: string; estado?: string }) => {
    const q = new URLSearchParams();
    if (params?.area) q.set('area', params.area);
    if (params?.tipo) q.set('tipo', params.tipo);
    if (params?.estado) q.set('estado', params.estado);
    const qs = q.toString();
    return request(`/pacientes/camas${qs ? `?${qs}` : ''}`);
  },
  asignarCama: (idCama: number, idEncuentro: number) =>
    request(`/pacientes/camas/${idCama}/asignar`, {
      method: 'POST',
      body: JSON.stringify({ id_encuentro: idEncuentro }),
    }),
  liberarCama: (idCama: number) =>
    request(`/pacientes/camas/${idCama}/liberar`, {
      method: 'POST',
    }),
  crearPersonalMedico: (data: any) =>
    request('/pacientes/catalogo/personal-medico', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  actualizarPersonalMedico: (id: number, data: any) =>
    request(`/pacientes/catalogo/personal-medico/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  desactivarPersonalMedico: (id: number) =>
    request(`/pacientes/catalogo/personal-medico/${id}`, {
      method: 'DELETE',
    }),
  eliminarPersonalMedico: (id: number) =>
    request(`/pacientes/catalogo/personal-medico/${id}`, {
      method: 'DELETE',
    }),
  restablecerPasswordPersonal: (id: number) =>
    request(`/pacientes/catalogo/personal-medico/${id}/restablecer-password`, {
      method: 'POST',
    }),

  // Estadísticas y recientes para el Dashboard
  getEstadisticasDashboard: () => request<{
    success: boolean;
    data: {
      metricas: {
        total_pacientes: number;
        total_activos: number;
        urgencias_activas: number;
        hosp_activas: number;
        toco_activas: number;
        admision_activas?: number;
      };
      pacientes_activos: any[];
      recientes: any[];
    };
  }>('/pacientes/dashboard/estadisticas'),

  // Pacientes catalogados por área clínica específica o censo total
  getPorArea: (areaId: string, buscar?: string) => {
    const query = new URLSearchParams();
    if (buscar) query.set('buscar', buscar);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{
      success: boolean;
      data: {
        area_consultada: string;
        conteos: {
          todas: number;
          urgencias: number;
          hospitalizacion: number;
          tococirugia: number;
          admision: number;
          consulta_externa: number;
          pediatria: number;
        };
        total: number;
        pacientes: any[];
      };
    }>(`/pacientes/area/${areaId}${qs}`);
  },
};

// ============================================================
// Encuentro
// ============================================================
export const encuentro = {
  get: (id: number) => request(`/pacientes/encuentros/${id}`),
  getResumenDocumentos: (id: number) => request(`/pacientes/encuentros/${id}/resumen-documentos`),
  update: (id: number, data: any) =>
    request(`/pacientes/encuentros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getAreasHospitalarias: () => request('/pacientes/catalogo/areas-hospitalarias'),
  trasladar: (id: number, data: any) =>
    request(`/pacientes/encuentros/${id}/traslado`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTraslados: (id: number) => request(`/pacientes/encuentros/${id}/traslados`),
};

// ============================================================
// Historia Clínica
// ============================================================
export const historiaClinica = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/historia-clinica`),

  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/historia-clinica`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/historia-clinica`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/historia-clinica`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Notas de Urgencias
// ============================================================
export const notasUrgencias = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/notas-urgencias`),

  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/notas-urgencias`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (notaId: number, data: any) =>
    request(`/pacientes/notas-urgencias/${notaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (notaId: number) =>
    request(`/pacientes/notas-urgencias/${notaId}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Nota de Ingreso
// ============================================================
export const notaIngreso = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/nota-ingreso`),

  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/nota-ingreso`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  remove: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/nota-ingreso`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Estudios
// ============================================================
export const estudios = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/estudios`),

  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/estudios`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateResultado: (estudioId: number, resultados: string) =>
    request(`/pacientes/estudios/${estudioId}`, {
      method: 'PUT',
      body: JSON.stringify({ resultados }),
    }),
};

// ============================================================
// Internamiento
// ============================================================
export const internamiento = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/internamiento`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/internamiento`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/internamiento`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/internamiento`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Indicaciones Médicas
// ============================================================
export const indicaciones = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/indicaciones`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/indicaciones`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request(`/pacientes/indicaciones/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request(`/pacientes/indicaciones/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Partograma
// ============================================================
export const partograma = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/partograma`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/partograma`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request(`/pacientes/partograma/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request(`/pacientes/partograma/${id}`, { method: 'DELETE' }),
  getIngreso: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/partograma/ingreso`),
  saveIngreso: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/partograma/ingreso`, {
      method: 'POST', body: JSON.stringify(data),
    }),
};

// ============================================================
// Consentimiento Informado (Formato Oficial 208C0101100000L-393-25)
// ============================================================
export const consentimientos = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/consentimientos-oficiales`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/consentimientos-oficiales`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (encuentroId: number, id: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/consentimientos-oficiales/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (encuentroId: number, id: number) =>
    request(`/pacientes/encuentros/${encuentroId}/consentimientos-oficiales/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Evolución Diaria
// ============================================================
export const evolucion = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/evolucion`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/evolucion`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request(`/pacientes/evolucion/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request(`/pacientes/evolucion/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Interconsultas
// ============================================================
export const interconsultas = {
  list: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/interconsultas`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/interconsultas`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request(`/pacientes/interconsultas/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request(`/pacientes/interconsultas/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Referencia
// ============================================================
export const referencia = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/referencia`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/referencia`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/referencia`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/referencia`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Atención de Parto
// ============================================================
export const atencionParto = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/atencion-parto`),
  create: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/atencion-parto`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (encuentroId: number, data: any) =>
    request(`/pacientes/encuentros/${encuentroId}/atencion-parto`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  remove: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/atencion-parto`, {
      method: 'DELETE',
    }),
};

// ============================================================
// HC Pediátrica
// ============================================================
export const hcPediatrica = {
  get: (encuentroId: number) =>
    request(`/pacientes/encuentros/${encuentroId}/hc-pediatrica`),
};

// ============================================================
// Catálogos
// ============================================================
export const catalogos = {
  cie10: (query: string) => request(`/catalogos/cie10?q=${encodeURIComponent(query)}`),
  camas: (params?: { area?: string; tipo?: string; estado?: string }) => pacientes.getCamas(params),
  salas: () => request('/catalogos/salas'),
};

// ============================================================
// Nota de Egreso
// ============================================================
export const notaEgreso = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/nota-egreso`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/nota-egreso`, { method: 'POST', body: JSON.stringify(data) }),
  update: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/nota-egreso`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/nota-egreso`, { method: 'DELETE' }),
};

// ============================================================
// Alergias
// ============================================================
export const alergias = {
  list: (pacienteId: number) => request(`/pacientes/${pacienteId}/alergias`),
  create: (pacienteId: number, data: any) => request(`/pacientes/${pacienteId}/alergias`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (alergiaId: number) => request(`/pacientes/alergias/${alergiaId}`, { method: 'DELETE' }),
};

// ============================================================
// Documentos Oficiales (NOM-004-SSA3 / SINBA)
// ============================================================
export const avisoPrivacidad = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/aviso-privacidad`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/aviso-privacidad`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/aviso-privacidad`, { method: 'DELETE' }),
};

export const hojaFrontal = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/hoja-frontal`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/hoja-frontal`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/hoja-frontal`, { method: 'DELETE' }),
};

export const hcPediatricaOficial = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/hc-pediatrica-oficial`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/hc-pediatrica-oficial`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/hc-pediatrica-oficial`, { method: 'DELETE' }),
};

export const gabineteOficial = {
  list: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/gabinete-oficial`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/gabinete-oficial`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/gabinete-oficial`, { method: 'DELETE' }),
};

export const laboratorioOficial = {
  list: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/laboratorio-oficial`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/laboratorio-oficial`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/laboratorio-oficial`, { method: 'DELETE' }),
};

export const sinba14 = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/sinba-14`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/sinba-14`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/sinba-14`, { method: 'DELETE' }),
};

export const sinba16 = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/sinba-16`),
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/sinba-16`, { method: 'POST', body: JSON.stringify(data) }),
  remove: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/sinba-16`, { method: 'DELETE' }),
};

export const hojaIndicaciones = {
  get: (encuentroId: number) => request(`/pacientes/encuentros/${encuentroId}/hoja-indicaciones`),
  save: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/hoja-indicaciones`, { method: 'POST', body: JSON.stringify(data) }),
  createOrden: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/indicaciones-orden`, { method: 'POST', body: JSON.stringify(data) }),
  updateOrden: (encuentroId: number, idOrden: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/indicaciones-orden/${idOrden}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrden: (encuentroId: number, idOrden: number) => request(`/pacientes/encuentros/${encuentroId}/indicaciones-orden/${idOrden}`, { method: 'DELETE' }),
};

export const indicacionesOrden = {
  create: (encuentroId: number, data: any) => request(`/pacientes/encuentros/${encuentroId}/indicaciones-orden`, { method: 'POST', body: JSON.stringify(data) }),
};


export function getPdfUrl(encuentroId: number, tipo: string): string {
  return `/api/pacientes/encuentros/${encuentroId}/pdf/${tipo}`;
}

export interface LogoConfigPayload {
  tipo_encabezado?: 'banner' | 'logos_individuales';
  usar_predeterminado?: boolean;
  banner_base64?: string;
  logo_izquierdo_base64?: string;
  logo_derecho_base64?: string;
  logo_central_base64?: string;
  logo_central2_base64?: string;
  eliminar_logo_izquierdo?: boolean;
  eliminar_logo_derecho?: boolean;
  eliminar_logo_central?: boolean;
  eliminar_logo_central2?: boolean;
  distribucion_logos?: 'auto' | 'esquinas_y_centro' | 'todos_al_centro';
  texto_linea1?: string;
  texto_linea2?: string;
  texto_linea3?: string;
  banner_altura?: number;
  banner_modo_ajuste?: 'fit' | 'stretch';
}

export const configuracionApi = {
  getLogoConfig: () => request<{ success: boolean; data: any }>('/configuracion/logo'),
  updateLogoConfig: (data: LogoConfigPayload) =>
    request<{ success: boolean; message: string; data: any }>('/configuracion/logo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resetLogoConfig: () =>
    request<{ success: boolean; message: string; data: any }>('/configuracion/logo/reset', {
      method: 'POST',
    }),
  getPreviewPdfUrl: () => `/api/configuracion/logo/preview-pdf?t=${Date.now()}`,
};

export const notificacionesApi = {
  getNotificaciones: () =>
    request<{ success: boolean; data: any[]; no_leidas: number }>('/notificaciones'),
  marcarLeida: (id: number) =>
    request(`/notificaciones/${id}/leer`, { method: 'PUT' }),
  marcarTodasLeidas: () =>
    request('/notificaciones/marcar-todas-leidas', { method: 'PUT' }),
  getSolicitudesPendientes: () =>
    request<{ success: boolean; data: any[] }>('/notificaciones/solicitudes-pendientes'),
  atenderSolicitud: (id: number) =>
    request<{ success: boolean; message: string; username: string }>(`/notificaciones/solicitudes/${id}/atender`, {
      method: 'POST',
    }),
  rechazarSolicitud: (id: number, motivo_rechazo?: string) =>
    request<{ success: boolean; message: string }>(`/notificaciones/solicitudes/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo_rechazo }),
    }),
  solicitarRestablecimiento: (username: string, motivo?: string) =>
    request<{ success: boolean; message: string; data?: any }>('/auth/solicitar-restablecimiento', {
      method: 'POST',
      body: JSON.stringify({ username, motivo }),
    }),
};
