import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { partograma, getPdfUrl } from '../../services/api';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { 
  Save, Plus, Trash2, Baby, Printer, ArrowLeft, Eye, Edit3, 
  CheckCircle2, FileText, Clock, AlertCircle, ChevronDown, ChevronUp, Stethoscope 
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function PartogramaMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [lista, setLista] = useState<any[]>([]);
  const [pacienteInfo, setPacienteInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [savingMedicion, setSavingMedicion] = useState(false);
  const [savingIngreso, setSavingIngreso] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showBitacora, setShowBitacora] = useState(true);
  const [activeDiagramTab, setActiveDiagramTab] = useState<'todos' | 'utero' | 'dilatacion' | 'hodge'>('todos');

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 5);

  // Formulario de Ingreso Obstétrico (Página 1 Oficial)
  const defaultIngreso = {
    unidad_medica: 'Hospital General San Felipe del Progreso',
    fecha: today,
    hora: now,
    gesta: 1,
    para: 0,
    cesareas: 0,
    abortos: 0,
    hijos_vivos: 1,
    fecha_ultimo_parto: '',
    fecha_ultima_menstruacion: '',
    fecha_probable_parto: '',
    semanas_gestacion: '',
    control_prenatal: true,
    num_consultas: 0,
    donde_control: 'C.S. San Felipe',
    consultas_este_hospital: 0,
    complicaciones_embarazo: 'Negadas',
    tratamiento_administrado: 'Ácido fólico, fumarato ferroso',
    actividad_uterina_inicio: '',
    contracciones_10min: '3',
    sangrado_transvaginal: false,
    sangrado_inicio: '',
    ruptura_membranas: false,
    ruptura_membranas_hora: '',
    membranas: 'intactas',
    liquido_amniotico: '',
    movimiento_fetal: true,
    movimiento_fetal_tipo: 'normal',
    movimiento_fetal_desde: '',
    edema: false,
    edema_inicio: '',
    ta: '110/70',
    temp: '36.5',
    fr: '20',
    fc: '80',
    fcf: '140',
    fcf_ritmo: 'Regular',
    tono_uterino: 'Normal',
    cervix_dilatacion: '4',
    cervix_borramiento: '60',
    presentacion: 'Cefálica',
    posicion: 'OA',
    planos_hodge: '2',
    pelvis_util: true,
    impresion_diagnostica: 'Trabajo de parto fase activa',
    indicaciones_medicas: 'Vigilancia estrecha de FCF, dinámica uterina y descenso cefálico.',
    medico_responsable: '',
    medico_cedula: '',
  };

  const [ingreso, setIngreso] = useState(defaultIngreso);

  // Formulario de Medición Horaria (Página 2 / Bitácora)
  const defaultForm = {
    fecha_medicion: today, 
    hora_medicion: now,
    dilatacion: '', 
    borramiento: '', 
    presentacion: '', 
    posicion: '',
    fcf: '', 
    contracciones_en_10_min: '', 
    intensidad_contracciones: '',
    membranas: 'intactas', 
    liquido_amniotico: '', 
    observaciones: '',
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => { loadData(); }, [id]);

  async function loadData(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      // 1. Cargar mediciones históricas
      const resMediciones = await partograma.list(parseInt(id!));
      if (resMediciones.success) setLista(resMediciones.data || []);

      // 2. Cargar Ficha de Ingreso Obstétrico (Página 1)
      const resIngreso = await partograma.getIngreso(parseInt(id!));
      if (resIngreso.success) {
        if (resIngreso.paciente) {
          setPacienteInfo(resIngreso.paciente);
        }
        if (resIngreso.data) {
          const d = resIngreso.data;
          setIngreso({
            unidad_medica: d.unidad_medica || 'Hospital General San Felipe del Progreso',
            fecha: d.fecha ? String(d.fecha).substring(0, 10) : today,
            hora: d.hora ? String(d.hora).substring(0, 5) : now,
            gesta: d.gesta ?? 1,
            para: d.para ?? 0,
            cesareas: d.cesareas ?? 0,
            abortos: d.abortos ?? 0,
            hijos_vivos: d.hijos_vivos ?? 1,
            fecha_ultimo_parto: d.fecha_ultimo_parto ? String(d.fecha_ultimo_parto).substring(0, 10) : '',
            fecha_ultima_menstruacion: d.fecha_ultima_menstruacion ? String(d.fecha_ultima_menstruacion).substring(0, 10) : '',
            fecha_probable_parto: d.fecha_probable_parto ? String(d.fecha_probable_parto).substring(0, 10) : '',
            semanas_gestacion: d.semanas_gestacion || '',
            control_prenatal: d.control_prenatal !== false,
            num_consultas: d.num_consultas ?? 0,
            donde_control: d.donde_control || '',
            consultas_este_hospital: d.consultas_este_hospital ?? 0,
            complicaciones_embarazo: d.complicaciones_embarazo || '',
            tratamiento_administrado: d.tratamiento_administrado || '',
            actividad_uterina_inicio: d.actividad_uterina_inicio || '',
            contracciones_10min: d.contracciones_10min || '',
            sangrado_transvaginal: Boolean(d.sangrado_transvaginal),
            sangrado_inicio: d.sangrado_inicio || '',
            ruptura_membranas: Boolean(d.ruptura_membranas),
            ruptura_membranas_hora: d.ruptura_membranas_hora || '',
            membranas: d.membranas || (d.ruptura_membranas ? 'rotas' : 'intactas'),
            liquido_amniotico: (d.membranas === 'intactas' || !d.ruptura_membranas) ? '' : (d.liquido_amniotico || ''),
            movimiento_fetal: d.movimiento_fetal !== false,
            movimiento_fetal_tipo: d.movimiento_fetal_tipo || 'normal',
            movimiento_fetal_desde: d.movimiento_fetal_desde || '',
            edema: Boolean(d.edema),
            edema_inicio: d.edema_inicio || '',
            ta: d.ta || '',
            temp: d.temp || '',
            fr: d.fr || '',
            fc: d.fc || '',
            fcf: d.fcf || '',
            fcf_ritmo: d.fcf_ritmo || 'Regular',
            tono_uterino: d.tono_uterino || 'Normal',
            cervix_dilatacion: d.cervix_dilatacion || '',
            cervix_borramiento: d.cervix_borramiento || '',
            presentacion: d.presentacion || 'Cefálica',
            posicion: d.posicion || 'OA',
            planos_hodge: d.planos_hodge != null ? String(d.planos_hodge) : '2',
            pelvis_util: d.pelvis_util !== false,
            impresion_diagnostica: d.impresion_diagnostica || '',
            indicaciones_medicas: d.indicaciones_medicas || '',
            medico_responsable: d.medico_responsable || d.medico_nombre_completo || resIngreso.medico_sugerido || '',
            medico_cedula: d.medico_cedula || d.medico_cedula_val || resIngreso.cedula_sugerida || '',
          });
        } else {
          setIngreso(prev => ({
            ...prev,
            medico_responsable: resIngreso.medico_sugerido || prev.medico_responsable || '',
            medico_cedula: resIngreso.cedula_sugerida || prev.medico_cedula || '',
          }));
        }
      }
    } catch (err: any) {
      console.error('Error cargando partograma:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  function highlightAndFocusField(elementId: string, message: string): boolean {
    showToast(message, 'warning');
    setTimeout(() => {
      let el = document.getElementById(elementId);
      if (elementId === 'parto-medico') {
        const otroInput = document.getElementById('parto-medico-otro') as HTMLInputElement | null;
        if (otroInput && otroInput.offsetParent !== null) {
          el = otroInput;
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('field-validation-error');
        setTimeout(() => {
          el.classList.remove('field-validation-error');
        }, 4000);
      }
    }, 60);
    return false;
  }

  function validateIngreso(data: typeof ingreso): boolean {
    if (!data.unidad_medica?.trim()) {
      return highlightAndFocusField('parto-unidad-medica', 'Capture la Unidad Médica.');
    }
    if (!data.fecha?.trim()) {
      return highlightAndFocusField('parto-fecha', 'Seleccione la fecha de valoración.');
    }
    if (!data.hora?.trim()) {
      return highlightAndFocusField('parto-hora', 'Seleccione la hora de valoración.');
    }
    if (!data.medico_responsable?.trim()) {
      return highlightAndFocusField('parto-medico', 'Seleccione o escriba el Médico Tratante / Responsable.');
    }
    if (data.gesta === undefined || data.gesta === null || isNaN(Number(data.gesta)) || Number(data.gesta) < 0) {
      return highlightAndFocusField('parto-gesta', 'Capture un valor numérico válido para Gesta (≥ 0).');
    }
    if (data.para === undefined || data.para === null || isNaN(Number(data.para)) || Number(data.para) < 0) {
      return highlightAndFocusField('parto-para', 'Capture un valor numérico válido para Para (≥ 0).');
    }
    if (data.cesareas === undefined || data.cesareas === null || isNaN(Number(data.cesareas)) || Number(data.cesareas) < 0) {
      return highlightAndFocusField('parto-cesareas', 'Capture un valor numérico válido para Cesáreas (≥ 0).');
    }
    if (data.abortos === undefined || data.abortos === null || isNaN(Number(data.abortos)) || Number(data.abortos) < 0) {
      return highlightAndFocusField('parto-abortos', 'Capture un valor numérico válido para Abortos (≥ 0).');
    }
    if (data.hijos_vivos === undefined || data.hijos_vivos === null || isNaN(Number(data.hijos_vivos)) || Number(data.hijos_vivos) < 0) {
      return highlightAndFocusField('parto-hijos-vivos', 'Capture un valor numérico válido para Hijos Vivos (≥ 0).');
    }
    const sdgNum = parseFloat(String(data.semanas_gestacion || ''));
    if (!String(data.semanas_gestacion || '').trim() || isNaN(sdgNum) || sdgNum < 10 || sdgNum > 45) {
      return highlightAndFocusField('parto-sdg', 'Indique las semanas de gestación válidas entre 10 y 45 SDG (ej. 39.4).');
    }
    if (data.contracciones_10min !== '' && data.contracciones_10min !== undefined) {
      const c = Number(data.contracciones_10min);
      if (isNaN(c) || c < 0 || c > 10) {
        return highlightAndFocusField('parto-contracciones', 'El número de contracciones en 10 min debe ser entre 0 y 10.');
      }
    }
    if (data.ta?.trim() && !/^\d{2,3}\/\d{2,3}$/.test(data.ta.trim())) {
      return highlightAndFocusField('parto-ta', 'La T.A. debe tener formato sistólica/diastólica (ej. 110/70 o 120/80).');
    }
    if (data.temp?.trim()) {
      const t = parseFloat(data.temp);
      if (isNaN(t) || t < 30 || t > 45) {
        return highlightAndFocusField('parto-temp', 'La temperatura debe estar en un rango clínico válido (30 a 45 °C).');
      }
    }
    if (data.fr?.trim()) {
      const frNum = parseInt(data.fr, 10);
      if (isNaN(frNum) || frNum < 5 || frNum > 60) {
        return highlightAndFocusField('parto-fr', 'La frecuencia respiratoria debe estar entre 5 y 60 x\'.');
      }
    }
    if (data.fc?.trim()) {
      const fcNum = parseInt(data.fc, 10);
      if (isNaN(fcNum) || fcNum < 30 || fcNum > 220) {
        return highlightAndFocusField('parto-fc', 'La frecuencia cardíaca debe estar entre 30 y 220 x\'.');
      }
    }
    const fcfNum = parseInt(String(data.fcf || ''), 10);
    if (!data.fcf || isNaN(fcfNum) || fcfNum < 60 || fcfNum > 220) {
      return highlightAndFocusField('parto-fcf', 'Capture la Frecuencia Cardíaca Fetal inicial válida (60 a 220 lpm).');
    }
    const dilNum = parseFloat(String(data.cervix_dilatacion || ''));
    if (data.cervix_dilatacion === '' || isNaN(dilNum) || dilNum < 0 || dilNum > 10) {
      return highlightAndFocusField('parto-dilatacion', 'La dilatación cervical debe ser entre 0 y 10 cm.');
    }
    if (data.cervix_borramiento !== '' && data.cervix_borramiento !== undefined) {
      const borNum = parseInt(String(data.cervix_borramiento), 10);
      if (isNaN(borNum) || borNum < 0 || borNum > 100) {
        return highlightAndFocusField('parto-borramiento', 'El borramiento cervical debe ser entre 0 y 100 %.');
      }
    }
    if (!data.impresion_diagnostica?.trim()) {
      return highlightAndFocusField('parto-diagnostico', 'Capture la Impresión Diagnóstica al ingreso.');
    }
    if (!data.indicaciones_medicas?.trim()) {
      return highlightAndFocusField('parto-indicaciones', 'Capture las Indicaciones Médicas al ingreso.');
    }
    return true;
  }

  function validateMedicion(m: typeof form): boolean {
    if (!m.fecha_medicion?.trim()) {
      return highlightAndFocusField('medicion-fecha', 'Seleccione la fecha de la toma horaria.');
    }
    if (!m.hora_medicion?.trim()) {
      return highlightAndFocusField('medicion-hora', 'Seleccione la hora de la toma horaria.');
    }
    if (m.dilatacion !== '') {
      const d = parseFloat(m.dilatacion);
      if (isNaN(d) || d < 0 || d > 10) {
        return highlightAndFocusField('medicion-dilatacion', 'La dilatación debe ser entre 0 y 10 cm.');
      }
    }
    if (m.borramiento !== '') {
      const b = parseInt(m.borramiento, 10);
      if (isNaN(b) || b < 0 || b > 100) {
        return highlightAndFocusField('medicion-borramiento', 'El borramiento debe ser entre 0 y 100 %.');
      }
    }
    if (m.fcf !== '') {
      const f = parseInt(m.fcf, 10);
      if (isNaN(f) || f < 60 || f > 220) {
        return highlightAndFocusField('medicion-fcf', 'La FCF debe ser un valor clínico entre 60 y 220 lpm.');
      }
    }
    if (m.contracciones_en_10_min !== '') {
      const c = parseInt(m.contracciones_en_10_min, 10);
      if (isNaN(c) || c < 0 || c > 10) {
        return highlightAndFocusField('medicion-contracciones', 'Las contracciones en 10 min deben ser entre 0 y 10.');
      }
    }
    return true;
  }

  async function handleSaveIngreso(e: FormEvent) {
    e.preventDefault();
    if (!validateIngreso(ingreso)) {
      return;
    }
    setSavingIngreso(true);
    try {
      const res = await partograma.saveIngreso(parseInt(id!), ingreso);
      if (res.success) {
        showToast('Partograma oficial guardado correctamente.', 'success');
        await loadData(false);
      } else {
        showToast(res.error || 'Error al guardar partograma.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al guardar partograma.', 'error');
    } finally {
      setSavingIngreso(false);
    }
  }

  function handleStartEdit(item: any) {
    setEditingId(item.id_partograma);
    const esIntacta = (item.membranas || 'intactas') === 'intactas';
    setForm({
      fecha_medicion: item.fecha_medicion ? String(item.fecha_medicion).substring(0, 10) : today,
      hora_medicion: item.hora_medicion ? String(item.hora_medicion).substring(0, 5) : now,
      dilatacion: item.dilatacion !== null && item.dilatacion !== undefined ? String(item.dilatacion) : '',
      borramiento: item.borramiento !== null && item.borramiento !== undefined ? String(item.borramiento) : '',
      presentacion: item.presentacion || '',
      posicion: item.posicion || '',
      fcf: item.fcf !== null && item.fcf !== undefined ? String(item.fcf) : '',
      contracciones_en_10_min: item.contracciones_en_10_min !== null && item.contracciones_en_10_min !== undefined ? String(item.contracciones_en_10_min) : '',
      intensidad_contracciones: item.intensidad_contracciones !== null && item.intensidad_contracciones !== undefined ? String(item.intensidad_contracciones) : '',
      membranas: item.membranas || 'intactas',
      liquido_amniotico: esIntacta ? '' : (item.liquido_amniotico || ''),
      observaciones: item.observaciones || '',
    });
    setShowForm(true);
  }

  function handleCancelMedicion() {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(false);
  }

  async function handleCreateMedicion(e: FormEvent) {
    e.preventDefault();
    if (!validateMedicion(form)) {
      return;
    }
    setSavingMedicion(true);
    try {
      const payload = { ...form };
      if (payload.membranas === 'intactas') {
        payload.liquido_amniotico = '';
      }
      ['dilatacion','borramiento','fcf','contracciones_en_10_min','intensidad_contracciones'].forEach(k => {
        (payload as any)[k] = (payload as any)[k] ? parseInt((payload as any)[k]) : null;
      });
      if (editingId) {
        await partograma.update(editingId, payload);
        showToast('Medición del partograma actualizada exitosamente.', 'success');
      } else {
        await partograma.create(parseInt(id!), payload);
        showToast('Medición agregada al partograma exitosamente.', 'success');
      }
      setEditingId(null);
      setForm(defaultForm);
      setShowForm(false);
      await loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar medición.', 'error');
    } finally {
      setSavingMedicion(false);
    }
  }

  async function handleDelete(idx: number) {
    const ok = await confirm({
      title: '¿Eliminar registro?',
      message: 'Se eliminará la medición horaria seleccionada del partograma.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await partograma.remove(lista[idx].id_partograma);
      showToast('Registro eliminado exitosamente.', 'success');
      await loadData(false);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar registro.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando partograma...</p></div>;

  // =========================================================================
  // CÁLCULOS DINÁMICOS PARA LA REPRESENTACIÓN GRÁFICA EN VIVO
  // =========================================================================
  const dilVal = Math.min(10, Math.max(0, parseFloat(ingreso.cervix_dilatacion || '4') || 4));
  const posVal = (ingreso.posicion || 'OA').trim().toUpperCase();
  const presVal = (ingreso.presentacion || 'Cefálica').trim().toLowerCase();
  const fcfVal = ingreso.fcf || '140';

  let anglePosDeg = -90; // OA -> 12:00 (PUBIS)
  if (posVal.includes('OP')) anglePosDeg = 90; // OP -> 6:00 (SACRO)
  else if (posVal.includes('ODA')) anglePosDeg = -45;
  else if (posVal.includes('OIA')) anglePosDeg = -135;
  else if (posVal.includes('ODT')) anglePosDeg = 0;
  else if (posVal.includes('OIT')) anglePosDeg = 180;
  else if (posVal.includes('ODP')) anglePosDeg = 45;
  else if (posVal.includes('OIP')) anglePosDeg = 135;
  const anglePosRad = (anglePosDeg * Math.PI) / 180;

  let hodgeIdx = 2; // Plano II
  const hodgeRaw = String(ingreso.planos_hodge || '').toLowerCase();
  if (hodgeRaw.includes('0') || hodgeRaw.includes('libre') || hodgeRaw.includes('flot')) hodgeIdx = 0;
  else if (hodgeRaw.includes('4') || hodgeRaw.includes('iv') || hodgeRaw.includes('prof')) hodgeIdx = 4;
  else if (hodgeRaw.includes('3') || hodgeRaw.includes('iii') || hodgeRaw.includes('encaj')) hodgeIdx = 3;
  else if (hodgeRaw.includes('2') || hodgeRaw.includes('ii') || hodgeRaw.includes('fij')) hodgeIdx = 2;
  else if (hodgeRaw.includes('1') || hodgeRaw.includes('i') || hodgeRaw.includes('insin')) hodgeIdx = 1;

  const hodgeLevelsBlock = [
    { p: 0, label: '0: Libre / Flotante', headX: 855, headY: 168, r: 26 },
    { p: 1, label: 'I: Insinuado', headX: 872, headY: 228, r: 27 },
    { p: 2, label: 'II: Fijo', headX: 892, headY: 290, r: 28 },
    { p: 3, label: 'III: Encajado', headX: 912, headY: 345, r: 28 },
    { p: 4, label: 'IV: Prof. Encajado', headX: 934, headY: 400, r: 28 },
  ];
  const selHodgeBlock = hodgeLevelsBlock[hodgeIdx];

  const hodgeLevelsSingle = [
    { p: 0, label: '0: Libre / Flotante', headX: 152, headY: 168, r: 26 },
    { p: 1, label: 'I: Insinuado', headX: 169, headY: 228, r: 27 },
    { p: 2, label: 'II: Fijo', headX: 189, headY: 290, r: 28 },
    { p: 3, label: 'III: Encajado', headX: 209, headY: 345, r: 28 },
    { p: 4, label: 'IV: Prof. Encajado', headX: 231, headY: 400, r: 28 },
  ];
  const selHodgeSingle = hodgeLevelsSingle[hodgeIdx];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', paddingBottom: 40 }}>
      {/* ============================================================ */}
      {/* 1. BARRA SUPERIOR UNIFICADA CON ACCIONES Y DATOS CLAVE         */}
      {/* ============================================================ */}
      <div className="modulo-header-sticky">
        <div>
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, marginBottom: 2, padding: 0 }}
          >
            <ArrowLeft size={14}/> Volver al Expediente
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20, color: '#1e293b' }}>
              <Baby size={24} color="#db2777" /> Partograma Oficial (NOM-007 / IMSS-BIENESTAR)
            </h1>
            <span style={{ fontSize: 11, background: '#fce7f3', color: '#9d174d', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              PÁGINA 1 Y 2 UNIFICADAS
            </span>
            <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>
              208C0101100000L-033-19
            </span>
          </div>
          {pacienteInfo.nombre && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              <strong>Paciente:</strong> {pacienteInfo.nombre} {pacienteInfo.apellido_paterno} {pacienteInfo.apellido_materno || ''} • <strong>Edad:</strong> {pacienteInfo.edad} años • <strong>Expediente:</strong> {pacienteInfo.expediente_clinico}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            type="button"
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'partograma'), '_blank')} 
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#db2777', color: '#db2777', fontWeight: 700, padding: '9px 14px' }}
            title="Generar e imprimir el formato oficial en PDF de 2 páginas"
          >
            <Printer size={16}/> Imprimir PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-partograma-ingreso"
            className="btn btn-success" 
            disabled={savingIngreso}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 18px', background: '#db2777', borderColor: '#be185d', fontWeight: 700 }}
          >
            <Save size={16} /> {savingIngreso ? 'Guardando...' : 'Guardar Ficha'}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FORMULARIO DE VALORACIÓN OBSTÉTRICA (PÁGINA 1)             */}
      {/* ============================================================ */}
      <form id="form-partograma-ingreso" noValidate onSubmit={handleSaveIngreso}>
        {/* BLOQUE SUPERIOR (ANCHO COMPLETO): IDENTIFICACIÓN Y ANTECEDENTES */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ background: '#fdf2f8', borderBottom: '1px solid #fbcfe8', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} color="#db2777" />
              <h3 style={{ margin: 0, fontSize: 14, color: '#9d174d', fontWeight: 700 }}>
                1. Identificación de la Paciente y Antecedentes Gineco-Obstétricos (Página 1)
              </h3>
            </div>
            <span style={{ fontSize: 11, background: '#fce7f3', color: '#9d174d', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              NOM-007-SSA2-2016
            </span>
          </div>

          <div className="card-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Fila 1: Unidad Médica, Fecha, Hora, Médico Tratante y Cédula */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) 140px 110px minmax(260px, 1.8fr) 140px', gap: 12 }}>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Unidad Médica *</label>
                <input 
                  id="parto-unidad-medica"
                  type="text" 
                  value={ingreso.unidad_medica} 
                  onChange={e => setIngreso(p => ({ ...p, unidad_medica: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Fecha Valoración *</label>
                <input 
                  id="parto-fecha"
                  type="date" 
                  value={ingreso.fecha} 
                  onChange={e => setIngreso(p => ({ ...p, fecha: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Hora *</label>
                <input 
                  id="parto-hora"
                  type="time" 
                  value={ingreso.hora} 
                  onChange={e => setIngreso(p => ({ ...p, hora: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <SelectorPersonalMedico
                  id="parto-medico"
                  label="Médico Tratante / Responsable"
                  nombre={ingreso.medico_responsable}
                  cedula={ingreso.medico_cedula}
                  onChange={(nom, ced) => {
                    setIngreso(p => ({
                      ...p,
                      medico_responsable: nom,
                      ...(ced !== undefined ? { medico_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico tratante / responsable --"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Cédula Profesional</label>
                <input 
                  id="parto-cedula"
                  type="text" 
                  placeholder="Cédula prof." 
                  value={ingreso.medico_cedula} 
                  onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setIngreso(p => ({ ...p, medico_cedula: v }));
                  }} 
                  maxLength={10}
                />
              </div>
            </div>

            {/* Fila 2: Fórmula Obstétrica (G - P - C - A - V) y Semanas de Gestación (SDG) */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Baby size={15} color="#db2777" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  Fórmula Obstétrica y Semanas de Gestación:
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Gesta (G)</label>
                  <input 
                    id="parto-gesta"
                    type="number" 
                    min="0" 
                    max="25"
                    step="1"
                    value={ingreso.gesta} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, gesta: v === '' ? 0 : parseInt(v, 10) }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Para (P)</label>
                  <input 
                    id="parto-para"
                    type="number" 
                    min="0" 
                    max="25"
                    step="1"
                    value={ingreso.para} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, para: v === '' ? 0 : parseInt(v, 10) }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Cesáreas (C)</label>
                  <input 
                    id="parto-cesareas"
                    type="number" 
                    min="0" 
                    max="25"
                    step="1"
                    value={ingreso.cesareas} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, cesareas: v === '' ? 0 : parseInt(v, 10) }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Abortos (A)</label>
                  <input 
                    id="parto-abortos"
                    type="number" 
                    min="0" 
                    max="25"
                    step="1"
                    value={ingreso.abortos} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, abortos: v === '' ? 0 : parseInt(v, 10) }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Hijos Vivos (V)</label>
                  <input 
                    id="parto-hijos-vivos"
                    type="number" 
                    min="0" 
                    max="25"
                    step="1"
                    value={ingreso.hijos_vivos} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, hijos_vivos: v === '' ? 0 : parseInt(v, 10) }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#9d174d', textAlign: 'center' }}>SDG (Semanas) *</label>
                  <input 
                    id="parto-sdg"
                    type="text" 
                    placeholder="ej. 39.4" 
                    value={ingreso.semanas_gestacion} 
                    onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.]/g, '');
                      setIngreso(p => ({ ...p, semanas_gestacion: v }));
                    }} 
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, background: '#fdf2f8', borderColor: '#f472b6' }} 
                    required
                  />
                </div>
              </div>
            </div>

            {/* Fila 3: Fechas Gineco-Obstétricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>F.U.M. (Fecha Última Menstruación)</label>
                <input 
                  id="parto-fum"
                  type="date" 
                  value={ingreso.fecha_ultima_menstruacion} 
                  onChange={e => setIngreso(p => ({ ...p, fecha_ultima_menstruacion: e.target.value }))} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>F.P.P. (Fecha Probable de Parto)</label>
                <input 
                  id="parto-fpp"
                  type="date" 
                  value={ingreso.fecha_probable_parto} 
                  onChange={e => setIngreso(p => ({ ...p, fecha_probable_parto: e.target.value }))} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Fecha Último Parto</label>
                <input 
                  id="parto-ultimo-parto"
                  type="date" 
                  value={ingreso.fecha_ultimo_parto} 
                  onChange={e => setIngreso(p => ({ ...p, fecha_ultimo_parto: e.target.value }))} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BLOQUE MEDIO: 2 COLUMNAS EQUILIBRADAS (MATERNO vs FETAL)    */}
        {/* ============================================================ */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', 
          gap: 16, 
          alignItems: 'start' 
        }}>
          {/* ---------------------------------------------------------- */}
          {/* COLUMNA IZQUIERDA: DINÁMICA, SIGNOS Y DIAGNÓSTICO MATERNO  */}
          {/* ---------------------------------------------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tarjeta 2: Dinámica Uterina, Membranas y Signos Vitales */}
            <div className="card">
              <div className="card-header" style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <Clock size={15} color="#db2777" /> 2. Dinámica Uterina, Membranas y Signos Vitales
                </h3>
              </div>
              <div className="card-body" style={{ padding: 14 }}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Inicio Actividad Uterina</label>
                    <input 
                      id="parto-actividad-inicio"
                      type="text" 
                      placeholder="ej. Hoy 06:00" 
                      value={ingreso.actividad_uterina_inicio} 
                      onChange={e => setIngreso(p => ({ ...p, actividad_uterina_inicio: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Contracciones en 10 min</label>
                    <input 
                      id="parto-contracciones"
                      type="number" 
                      min="0" 
                      max="10" 
                      step="1"
                      placeholder="3" 
                      value={ingreso.contracciones_10min} 
                      onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setIngreso(p => ({ ...p, contracciones_10min: v }));
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Membranas</label>
                    <select
                      id="parto-membranas"
                      value={ingreso.membranas}
                      onChange={(e) => {
                        const nueva = e.target.value;
                        setIngreso(p => ({
                          ...p,
                          membranas: nueva,
                          ruptura_membranas: nueva === 'rotas',
                          liquido_amniotico: nueva === 'intactas' ? '' : p.liquido_amniotico,
                        }));
                      }}
                    >
                      <option value="intactas">intactas (íntegras)</option>
                      <option value="rotas">rotas (RPM)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Líquido Amniótico</label>
                    <select
                      id="parto-liquido"
                      value={ingreso.membranas === 'intactas' ? '' : ingreso.liquido_amniotico}
                      onChange={e => setIngreso(p => ({ ...p, liquido_amniotico: e.target.value }))}
                      disabled={ingreso.membranas === 'intactas'}
                      style={ingreso.membranas === 'intactas' ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#94a3b8' } : undefined}
                    >
                      <option value="">{ingreso.membranas === 'intactas' ? '--- (Intactas: Sin líquido)' : '-- Seleccionar aspecto --'}</option>
                      <option value="claro">claro</option>
                      <option value="meconial_leve">meconial leve</option>
                      <option value="meconial_denso">meconial denso</option>
                      <option value="sanguinolento">sanguinolento</option>
                    </select>
                  </div>
                </div>

                {/* Signos Vitales Maternos */}
                <div style={{ marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    Signos Vitales Maternos al Ingreso (Métricas Numéricas):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>T.A. (mmHg)</label>
                      <input 
                        id="parto-ta"
                        type="text" 
                        placeholder="110/70" 
                        value={ingreso.ta} 
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9/]/g, '');
                          setIngreso(p => ({ ...p, ta: v }));
                        }} 
                        maxLength={7}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Temp (°C)</label>
                      <input 
                        id="parto-temp"
                        type="text" 
                        placeholder="36.5" 
                        value={ingreso.temp} 
                        onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, '');
                          setIngreso(p => ({ ...p, temp: v }));
                        }} 
                        maxLength={5}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>F.R. (x')</label>
                      <input 
                        id="parto-fr"
                        type="number" 
                        min="5" 
                        max="60" 
                        step="1"
                        placeholder="20" 
                        value={ingreso.fr} 
                        onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setIngreso(p => ({ ...p, fr: v }));
                        }} 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>F.C. (x')</label>
                      <input 
                        id="parto-fc"
                        type="number" 
                        min="30" 
                        max="220" 
                        step="1"
                        placeholder="80" 
                        value={ingreso.fc} 
                        onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setIngreso(p => ({ ...p, fc: v }));
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Diagnóstico e Indicaciones Médicas */}
            <div className="card">
              <div className="card-header" style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <FileText size={15} color="#db2777" /> 3. Diagnóstico e Indicaciones al Ingreso
                </h3>
              </div>
              <div className="card-body" style={{ padding: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Impresión Diagnóstica *</label>
                    <textarea 
                      id="parto-diagnostico"
                      rows={2} 
                      value={ingreso.impresion_diagnostica} 
                      onChange={e => setIngreso(p => ({ ...p, impresion_diagnostica: e.target.value }))} 
                      placeholder="Diagnóstico obstétrico al ingreso..."
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Indicaciones Médicas al Ingreso *</label>
                    <textarea 
                      id="parto-indicaciones"
                      rows={3} 
                      value={ingreso.indicaciones_medicas} 
                      onChange={e => setIngreso(p => ({ ...p, indicaciones_medicas: e.target.value }))} 
                      placeholder="Plan de manejo, monitoreo, vía, etc..."
                      required 
                    />
                  </div>

                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <button 
                      type="submit" 
                      className="btn btn-success" 
                      disabled={savingIngreso}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 20px', background: '#db2777', borderColor: '#be185d', fontWeight: 700, width: '100%', justifyContent: 'center' }}
                    >
                      <Save size={16} /> {savingIngreso ? 'Guardando Ficha...' : 'Guardar Ficha del Partograma (Página 1)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* ---------------------------------------------------------- */}
        {/* COLUMNA DERECHA: VENTANA DE DIAGRAMAS ANATÓMICOS EN VIVO    */}
        {/* ---------------------------------------------------------- */}
        <div>
          <div className="card" style={{ border: '2px solid #db2777', boxShadow: '0 4px 12px rgba(219,39,119,0.12)' }}>
            <div className="card-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: '#fdf2f8', 
              padding: '10px 14px',
              borderBottom: '1px solid #fbcfe8'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, color: '#9d174d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={16} color="#db2777" /> 4. Exploración Obstétrica y Diagramas Anatómicos
                </h3>
                <span style={{ fontSize: 10, color: '#831843' }}>NOM-007 / 208C0101100000L-033-19</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  type="button" 
                  className={`btn ${activeDiagramTab === 'todos' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={() => setActiveDiagramTab('todos')}
                >
                  Bloque Oficial
                </button>
                <button 
                  type="button" 
                  className={`btn ${activeDiagramTab === 'utero' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={() => setActiveDiagramTab('utero')}
                >
                  1. Útero
                </button>
                <button 
                  type="button" 
                  className={`btn ${activeDiagramTab === 'dilatacion' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={() => setActiveDiagramTab('dilatacion')}
                >
                  2. Dilatación
                </button>
                <button 
                  type="button" 
                  className={`btn ${activeDiagramTab === 'hodge' ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ fontSize: 10, padding: '2px 7px' }}
                  onClick={() => setActiveDiagramTab('hodge')}
                >
                  3. Hodge
                </button>
              </div>
            </div>

            {/* Parámetros de Exploración Obstétrica Directos */}
            <div style={{ padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#9d174d' }}>Dilatación (cm) *</label>
                  <input 
                    id="parto-dilatacion"
                    type="number" 
                    min="0" 
                    max="10" 
                    step="0.5"
                    placeholder="4" 
                    value={ingreso.cervix_dilatacion} 
                    onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.]/g, '');
                      setIngreso(p => ({ ...p, cervix_dilatacion: v }));
                    }} 
                    style={{ fontSize: 12, padding: '4px 8px', fontWeight: 700, borderColor: '#f472b6', background: '#fdf2f8' }} 
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Borramiento (%)</label>
                  <input 
                    id="parto-borramiento"
                    type="number" 
                    min="0" 
                    max="100" 
                    step="5"
                    placeholder="60" 
                    value={ingreso.cervix_borramiento} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, cervix_borramiento: v }));
                    }} 
                    style={{ fontSize: 12, padding: '4px 8px' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>FCF (lpm) *</label>
                  <input 
                    id="parto-fcf"
                    type="number" 
                    min="60" 
                    max="220" 
                    step="1"
                    placeholder="140" 
                    value={ingreso.fcf} 
                    onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      setIngreso(p => ({ ...p, fcf: v }));
                    }} 
                    style={{ fontSize: 12, padding: '4px 8px' }} 
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Ritmo FCF</label>
                  <select 
                    id="parto-ritmo"
                    value={ingreso.fcf_ritmo || 'Regular'} 
                    onChange={e => setIngreso(p => ({ ...p, fcf_ritmo: e.target.value }))} 
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Irregular">Irregular</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Pelvis Materna</label>
                  <select 
                    id="parto-pelvis"
                    value={ingreso.pelvis_util ? 'UTIL' : 'NO_UTIL'} 
                    onChange={e => setIngreso(p => ({ ...p, pelvis_util: e.target.value === 'UTIL' }))} 
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="UTIL">PELVIS ÚTIL</option>
                    <option value="NO_UTIL">NO ÚTIL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Presentación Fetal *</label>
                  <select 
                    id="parto-presentacion"
                    value={ingreso.presentacion} 
                    onChange={e => setIngreso(p => ({ ...p, presentacion: e.target.value }))} 
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="Cefálica">Cefálica (Vértice)</option>
                    <option value="Pelviana">Pelviana / Pélvica</option>
                    <option value="Transversa">Transversa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Variedad Posición *</label>
                  <select 
                    id="parto-posicion"
                    value={ingreso.posicion} 
                    onChange={e => setIngreso(p => ({ ...p, posicion: e.target.value }))} 
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="OA">OA (Pubis)</option>
                    <option value="OIA">OIA</option>
                    <option value="ODA">ODA</option>
                    <option value="OIT">OIT</option>
                    <option value="ODT">ODT</option>
                    <option value="OP">OP (Sacro)</option>
                    <option value="OIP">OIP</option>
                    <option value="ODP">ODP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Plano de Hodge *</label>
                  <select 
                    id="parto-hodge"
                    value={ingreso.planos_hodge} 
                    onChange={e => setIngreso(p => ({ ...p, planos_hodge: e.target.value }))} 
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="0">0: Libre / Móvil</option>
                    <option value="1">1: Plano I</option>
                    <option value="2">2: Plano II</option>
                    <option value="3">3: Plano III</option>
                    <option value="4">4: Plano IV</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: 12 }}>
              {activeDiagramTab === 'todos' && (
                <div>
                  <div style={{ 
                    position: 'relative', 
                    width: '100%', 
                    overflow: 'hidden', 
                    borderRadius: 6, 
                    border: '1px solid #cbd5e1', 
                    background: '#ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    <img 
                      src="/assets/partograma_diagrams_block.png" 
                      alt="Diagramas Anatómicos Oficiales Partograma" 
                      style={{ width: '100%', display: 'block' }}
                    />
                    <svg viewBox="0 0 1055 605" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      {/* 1. FOCO Y ALTURA UTERINA (POSES DEL FETO) */}
                      {presVal.includes('pelv') || presVal.includes('podal') ? (
                        <g>
                          <path d="M 166 205 C 130 240, 135 330, 162 395" stroke="#db2777" strokeWidth="7" fill="none" strokeLinecap="round" />
                          <circle cx="166" cy="180" r="26" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <line x1="154" y1="180" x2="178" y2="180" stroke="#9d174d" strokeWidth="2.5" />
                          <line x1="166" y1="180" x2="166" y2="170" stroke="#9d174d" strokeWidth="2.5" />
                          <text x="166" y="174" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Cef.</text>
                          <circle cx="166" cy="415" r="28" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="166" y="420" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Pélv.</text>
                          <path d="M 180 300 L 200 275 L 186 245" stroke="#db2777" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="132" cy="215" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="132" cy="215" r="4" fill="#dc2626" />
                          <rect x="85" y="230" width="94" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                          <text x="132" y="244" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="bold">FCF: {fcfVal} lpm</text>
                        </g>
                      ) : presVal.includes('trans') ? (
                        <g>
                          <line x1="120" y1="300" x2="225" y2="300" stroke="#db2777" strokeWidth="8" strokeLinecap="round" />
                          <circle cx="105" cy="300" r="26" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="105" y="304" textAnchor="middle" fill="#831843" fontSize="10" fontWeight="bold">Cefálico</text>
                          <circle cx="240" cy="300" r="28" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="240" y="304" textAnchor="middle" fill="#831843" fontSize="10" fontWeight="bold">Pélvico</text>
                          <circle cx="172" cy="290" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="172" cy="290" r="4" fill="#dc2626" />
                          <rect x="125" y="305" width="94" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                          <text x="172" y="319" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="bold">FCF: {fcfVal} lpm</text>
                        </g>
                      ) : (
                        <g>
                          <path d="M 166 395 C 130 330, 135 240, 162 205" stroke="#db2777" strokeWidth="7" fill="none" strokeLinecap="round" />
                          <circle cx="166" cy="415" r="26" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <line x1="154" y1="415" x2="178" y2="415" stroke="#9d174d" strokeWidth="2.5" />
                          <line x1="166" y1="415" x2="166" y2="405" stroke="#9d174d" strokeWidth="2.5" />
                          <text x="166" y="420" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Cef.</text>
                          <circle cx="166" cy="180" r="28" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="166" y="184" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Pélv.</text>
                          <path d="M 180 250 L 200 275 L 186 305" stroke="#db2777" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="132" cy="335" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="132" cy="335" r="4" fill="#dc2626" />
                          <rect x="85" y="350" width="94" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                          <text x="132" y="364" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="bold">FCF: {fcfVal} lpm</text>
                        </g>
                      )}

                      {/* 2. DILATACIÓN Y POSICIÓN (CÍRCULOS DE 1 A 10 CM) */}
                      <g>
                        {Array.from({ length: Math.floor(dilVal) }).map((_, i) => (
                          <circle key={i} cx="527.5" cy="336.5" r={((i + 1) / 10) * 95.5} stroke="#fbcfe8" strokeWidth="1.5" fill="none" />
                        ))}
                        {dilVal > 0 && (
                          <circle cx="527.5" cy="336.5" r={(dilVal / 10) * 95.5} fill="#f472b6" fillOpacity="0.32" stroke="#db2777" strokeWidth="3.5" />
                        )}
                        {(() => {
                          const arrowR = Math.max(38, (dilVal / 10) * 95.5);
                          const ax = 527.5 + Math.cos(anglePosRad) * arrowR;
                          const ay = 336.5 + Math.sin(anglePosRad) * arrowR;
                          const headAngle = 0.42;
                          const tipLen = 12;
                          return (
                            <g>
                              <line x1="527.5" y1="336.5" x2={ax} y2={ay} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                              <line x1={ax} y1={ay} x2={ax - Math.cos(anglePosRad - headAngle) * tipLen} y2={ay - Math.sin(anglePosRad - headAngle) * tipLen} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                              <line x1={ax} y1={ay} x2={ax - Math.cos(anglePosRad + headAngle) * tipLen} y2={ay - Math.sin(anglePosRad + headAngle) * tipLen} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                            </g>
                          );
                        })()}
                        <rect x="491.5" y="322.5" width="72" height="28" rx="6" fill="#ffffff" stroke="#db2777" strokeWidth="2.5" />
                        <text x="527.5" y="341.5" textAnchor="middle" fill="#9d174d" fontSize="13" fontWeight="bold">{dilVal} cm {posVal}</text>
                      </g>

                      {/* 3. ALTURA DE PRESENTACIÓN (PLANOS DE HODGE 0 A 4) */}
                      <g>
                        <line x1="735" y1="240" x2="1005" y2="215" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="965" y="210" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano I</text>

                        <line x1="735" y1="305" x2="1005" y2="278" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="965" y="273" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano II</text>

                        <line x1="735" y1="360" x2="1005" y2="335" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="965" y="330" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano III</text>

                        <line x1="735" y1="415" x2="1005" y2="390" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="965" y="385" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano IV</text>

                        {/* Ruedita simulando la cabecita del bebé */}
                        <circle cx={selHodgeBlock.headX} cy={selHodgeBlock.headY} r={selHodgeBlock.r} fill="#dbeafe" fillOpacity="0.88" stroke="#1d4ed8" strokeWidth="4" />
                        <line x1={selHodgeBlock.headX - 15} y1={selHodgeBlock.headY} x2={selHodgeBlock.headX + 15} y2={selHodgeBlock.headY} stroke="#1e40af" strokeWidth="2.5" />
                        <line x1={selHodgeBlock.headX} y1={selHodgeBlock.headY} x2={selHodgeBlock.headX - 8} y2={selHodgeBlock.headY - 12} stroke="#1e40af" strokeWidth="2" />
                        <line x1={selHodgeBlock.headX} y1={selHodgeBlock.headY} x2={selHodgeBlock.headX + 8} y2={selHodgeBlock.headY - 12} stroke="#1e40af" strokeWidth="2" />

                        <rect x={selHodgeBlock.headX - 48} y={selHodgeBlock.headY + 30} width="96" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
                        <text x={selHodgeBlock.headX} y={selHodgeBlock.headY + 45} textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="bold">{selHodgeBlock.label}</text>
                      </g>
                    </svg>
                  </div>
                </div>
              )}

              {activeDiagramTab === 'utero' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 220, margin: '0 auto', overflow: 'hidden', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <img src="/assets/partograma_diag_utero.png" alt="Altura del Útero" style={{ width: '100%', display: 'block' }} />
                    <svg viewBox="0 0 352 605" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      {presVal.includes('pelv') || presVal.includes('podal') ? (
                        <g>
                          <path d="M 176 205 C 140 240, 145 330, 172 395" stroke="#db2777" strokeWidth="7" fill="none" strokeLinecap="round" />
                          <circle cx="176" cy="180" r="26" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="176" y="174" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Cef.</text>
                          <circle cx="176" cy="415" r="28" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="176" y="420" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Pélv.</text>
                          <circle cx="140" cy="215" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="140" cy="215" r="4" fill="#dc2626" />
                          <rect x="92" y="230" width="96" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                          <text x="140" y="244" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="bold">FCF: {fcfVal} lpm</text>
                        </g>
                      ) : presVal.includes('trans') ? (
                        <g>
                          <line x1="120" y1="300" x2="230" y2="300" stroke="#db2777" strokeWidth="8" strokeLinecap="round" />
                          <circle cx="105" cy="300" r="26" fill="#fce7f3" stroke="#db2777" strokeWidth="4" />
                          <circle cx="245" cy="300" r="28" fill="#fce7f3" stroke="#db2777" strokeWidth="4" />
                          <circle cx="176" cy="290" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="176" cy="290" r="4" fill="#dc2626" />
                        </g>
                      ) : (
                        <g>
                          <path d="M 176 395 C 140 330, 145 240, 172 205" stroke="#db2777" strokeWidth="7" fill="none" strokeLinecap="round" />
                          <circle cx="176" cy="415" r="26" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="176" y="420" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Cef.</text>
                          <circle cx="176" cy="180" r="28" fill="#fce7f3" fillOpacity="0.9" stroke="#db2777" strokeWidth="4" />
                          <text x="176" y="184" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="bold">Polo Pélv.</text>
                          <circle cx="140" cy="335" r="10" stroke="#dc2626" strokeWidth="3" fill="none" />
                          <circle cx="140" cy="335" r="4" fill="#dc2626" />
                          <rect x="92" y="350" width="96" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                          <text x="140" y="364" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="bold">FCF: {fcfVal} lpm</text>
                        </g>
                      )}
                    </svg>
                  </div>
                </div>
              )}

              {activeDiagramTab === 'dilatacion' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 220, margin: '0 auto', overflow: 'hidden', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <img src="/assets/partograma_diag_dilatacion.png" alt="Dilatación y Posición" style={{ width: '100%', display: 'block' }} />
                    <svg viewBox="0 0 352 605" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      <g>
                        {Array.from({ length: Math.floor(dilVal) }).map((_, i) => (
                          <circle key={i} cx="176" cy="336.5" r={((i + 1) / 10) * 95.5} stroke="#fbcfe8" strokeWidth="1.5" fill="none" />
                        ))}
                        {dilVal > 0 && (
                          <circle cx="176" cy="336.5" r={(dilVal / 10) * 95.5} fill="#f472b6" fillOpacity="0.32" stroke="#db2777" strokeWidth="3.5" />
                        )}
                        {(() => {
                          const arrowR = Math.max(38, (dilVal / 10) * 95.5);
                          const ax = 176 + Math.cos(anglePosRad) * arrowR;
                          const ay = 336.5 + Math.sin(anglePosRad) * arrowR;
                          const headAngle = 0.42;
                          const tipLen = 12;
                          return (
                            <g>
                              <line x1="176" y1="336.5" x2={ax} y2={ay} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                              <line x1={ax} y1={ay} x2={ax - Math.cos(anglePosRad - headAngle) * tipLen} y2={ay - Math.sin(anglePosRad - headAngle) * tipLen} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                              <line x1={ax} y1={ay} x2={ax - Math.cos(anglePosRad + headAngle) * tipLen} y2={ay - Math.sin(anglePosRad + headAngle) * tipLen} stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
                            </g>
                          );
                        })()}
                        <rect x="140" y="322.5" width="72" height="28" rx="6" fill="#ffffff" stroke="#db2777" strokeWidth="2.5" />
                        <text x="176" y="341.5" textAnchor="middle" fill="#9d174d" fontSize="13" fontWeight="bold">{dilVal} cm {posVal}</text>
                      </g>
                    </svg>
                  </div>
                </div>
              )}

              {activeDiagramTab === 'hodge' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 220, margin: '0 auto', overflow: 'hidden', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <img src="/assets/partograma_diag_hodge.png" alt="Planos de Hodge" style={{ width: '100%', display: 'block' }} />
                    <svg viewBox="0 0 352 605" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      <g>
                        <line x1="35" y1="235" x2="305" y2="210" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="265" y="205" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano I</text>

                        <line x1="35" y1="298" x2="305" y2="273" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="265" y="268" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano II</text>

                        <line x1="35" y1="353" x2="305" y2="328" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="265" y="323" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano III</text>

                        <line x1="35" y1="408" x2="305" y2="383" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="6 4" />
                        <text x="265" y="378" fill="#1d4ed8" fontSize="11" fontWeight="bold">Plano IV</text>

                        <circle cx={selHodgeSingle.headX} cy={selHodgeSingle.headY} r={selHodgeSingle.r} fill="#dbeafe" fillOpacity="0.88" stroke="#1d4ed8" strokeWidth="4" />
                        <line x1={selHodgeSingle.headX - 15} y1={selHodgeSingle.headY} x2={selHodgeSingle.headX + 15} y2={selHodgeSingle.headY} stroke="#1e40af" strokeWidth="2.5" />
                        <line x1={selHodgeSingle.headX} y1={selHodgeSingle.headY} x2={selHodgeSingle.headX - 8} y2={selHodgeSingle.headY - 12} stroke="#1e40af" strokeWidth="2" />
                        <line x1={selHodgeSingle.headX} y1={selHodgeSingle.headY} x2={selHodgeSingle.headX + 8} y2={selHodgeSingle.headY - 12} stroke="#1e40af" strokeWidth="2" />

                        <rect x={selHodgeSingle.headX - 48} y={selHodgeSingle.headY + 30} width="96" height="22" rx="4" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" />
                        <text x={selHodgeSingle.headX} y={selHodgeSingle.headY + 45} textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="bold">{selHodgeSingle.label}</text>
                      </g>
                    </svg>
                  </div>
                </div>
              )}

              {/* Botoneras interactivas táctiles de 1 clic */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 1. Botones rápidos Dilatación */}
                <div style={{ background: '#fdf2f8', padding: 8, borderRadius: 6, border: '1px solid #fbcfe8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9d174d' }}>Dilatación Cervical</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#be185d' }}>{dilVal} cm</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setIngreso(prev => ({ ...prev, cervix_dilatacion: String(c) }))}
                        className={`btn ${Math.round(dilVal) === c ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 10, padding: '2px 4px', flex: 1, minWidth: 0, fontWeight: 700 }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Botones rápidos Variedad de Posición */}
                <div style={{ background: '#fdf2f8', padding: 8, borderRadius: 6, border: '1px solid #fbcfe8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9d174d' }}>Variedad de Posición</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#be185d' }}>{posVal}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    {['OA', 'OIA', 'ODA', 'OP', 'OIP', 'ODP'].map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setIngreso(prev => ({ ...prev, posicion: pos }))}
                        className={`btn ${posVal === pos ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 9, padding: '2px 4px', flex: 1, fontWeight: 700 }}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Botones rápidos Planos de Hodge */}
                <div style={{ background: '#eff6ff', padding: 8, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>Descenso (Planos de Hodge)</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1e40af' }}>{selHodgeBlock.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    {[
                      { val: '0', label: '0: Libre' },
                      { val: '1', label: '1: Plano I' },
                      { val: '2', label: '2: Plano II' },
                      { val: '3', label: '3: Plano III' },
                      { val: '4', label: '4: Plano IV' },
                    ].map(h => (
                      <button
                        key={h.val}
                        type="button"
                        onClick={() => setIngreso(prev => ({ ...prev, planos_hodge: h.val }))}
                        className={`btn ${String(hodgeIdx) === h.val ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 10, padding: '2px 4px', flex: 1, fontWeight: 700 }}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tarjeta de interpretación clínica en tiempo real */}
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>Interpretación Clínica en Vivo:</strong> Presentación <strong>{ingreso.presentacion}</strong> con FCF en <strong>{fcfVal} lpm</strong> ({ingreso.fcf_ritmo || 'Regular'}). Dilatación a <strong>{dilVal} cm</strong> en variedad <strong>{posVal}</strong> ({posVal.includes('OA') ? 'anterior hacia PUBIS' : posVal.includes('OP') ? 'posterior hacia SACRO' : 'oblicua'}). Altura de presentación en <strong>{selHodgeBlock.label}</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

      {/* ============================================================ */}
      {/* 3. SECCIÓN INFERIOR: BITÁCORA HORARIA (PÁGINA 2)               */}
      {/* ============================================================ */}
      <div className="card" style={{ marginTop: 20 }}>
        <div 
          className="card-header" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            background: '#f8fafc',
            padding: '12px 18px'
          }}
          onClick={() => setShowBitacora(prev => !prev)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="#db2777" />
            <h3 style={{ margin: 0, fontSize: 14, color: '#1e293b' }}>
              Bitácora Horaria y Tococirugía (Página 2 / Curva de Parto)
            </h3>
            <span style={{ fontSize: 11, background: '#fce7f3', color: '#9d174d', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
              {lista.length} {lista.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {showBitacora ? 'Ocultar bitácora' : 'Mostrar bitácora'}
            </span>
            {showBitacora ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </div>
        </div>

        {showBitacora && (
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ fontSize: 12, color: '#166534' }}>
                <strong>Formato Oficial Impreso:</strong> La cuadrícula oficial de 14 horas de labor de la Página 2 se imprime limpia en blanco para su trazado manual a pie de cama conforme a la norma. Si lo requiere, puede registrar aquí las tomas para el expediente digital.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {!showForm && (
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 14px' }}
                >
                  <Plus size={14} /> Registrar Medición Horaria
                </button>
              )}
            </div>

            {/* Formulario desplegable de medición */}
            {showForm && (
              <form noValidate onSubmit={handleCreateMedicion} style={{ marginBottom: 16, background: '#fdf2f8', border: '1px solid #f472b6', borderRadius: 6, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#9d174d', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {editingId ? <><Edit3 size={15} /> Editando Medición Horaria</> : <><Plus size={15} /> Nueva Medición Horaria de Tococirugía</>}
                  </h4>
                  <button type="button" onClick={handleCancelMedicion} className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }}>
                    Cancelar
                  </button>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div className="form-group">
                    <label>Fecha de Medición *</label>
                    <input 
                      id="medicion-fecha"
                      type="date" 
                      value={form.fecha_medicion} 
                      onChange={e => setForm(p => ({ ...p, fecha_medicion: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora de Medición *</label>
                    <input 
                      id="medicion-hora"
                      type="time" 
                      value={form.hora_medicion} 
                      onChange={e => setForm(p => ({ ...p, hora_medicion: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Dilatación (cm)</label>
                    <input 
                      id="medicion-dilatacion"
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.5"
                      placeholder="1-10" 
                      value={form.dilatacion} 
                      onKeyDown={e => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        setForm(p => ({ ...p, dilatacion: v }));
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Borramiento (%)</label>
                    <input 
                      id="medicion-borramiento"
                      type="number" 
                      min="0" 
                      max="100" 
                      step="5"
                      placeholder="0-100" 
                      value={form.borramiento} 
                      onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setForm(p => ({ ...p, borramiento: v }));
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>FCF (lpm)</label>
                    <input 
                      id="medicion-fcf"
                      type="number" 
                      min="60" 
                      max="220" 
                      step="1"
                      placeholder="110-160" 
                      value={form.fcf} 
                      onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setForm(p => ({ ...p, fcf: v }));
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Contracciones en 10 min</label>
                    <input 
                      id="medicion-contracciones"
                      type="number" 
                      min="0" 
                      max="10" 
                      step="1"
                      placeholder="3" 
                      value={form.contracciones_en_10_min} 
                      onKeyDown={e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setForm(p => ({ ...p, contracciones_en_10_min: v }));
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Membranas</label>
                    <select 
                      id="medicion-membranas"
                      value={form.membranas} 
                      onChange={e => setForm(p => ({ ...p, membranas: e.target.value, liquido_amniotico: e.target.value === 'intactas' ? '' : p.liquido_amniotico }))}
                    >
                      <option value="intactas">intactas</option>
                      <option value="rotas">rotas (RPM)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Líquido Amniótico</label>
                    <select 
                      id="medicion-liquido"
                      value={form.membranas === 'intactas' ? '' : form.liquido_amniotico} 
                      onChange={e => setForm(p => ({ ...p, liquido_amniotico: e.target.value }))} 
                      disabled={form.membranas === 'intactas'}
                    >
                      <option value="">{form.membranas === 'intactas' ? '---' : '-- Seleccionar --'}</option>
                      <option value="claro">claro</option>
                      <option value="meconial_leve">meconial leve</option>
                      <option value="meconial_denso">meconial denso</option>
                      <option value="sanguinolento">sanguinolento</option>
                    </select>
                  </div>
                  <div className="form-group full-width" style={{ gridColumn: 'span 4' }}>
                    <label>Observaciones y Medicamentos</label>
                    <input 
                      id="medicion-observaciones"
                      type="text" 
                      placeholder="Observaciones de la toma o medicamentos administrados..." 
                      value={form.observaciones} 
                      onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} 
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <button type="submit" className="btn btn-success" disabled={savingMedicion} style={{ fontSize: 12, padding: '7px 16px', background: '#db2777', borderColor: '#be185d' }}>
                    <Save size={14} /> {savingMedicion ? 'Guardando...' : editingId ? 'Actualizar Medición' : 'Registrar Medición'}
                  </button>
                </div>
              </form>
            )}

            {/* Tabla con historial de mediciones */}
            {lista.length === 0 ? (
              <div className="empty-state" style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                <p style={{ margin: 0 }}>Sin tomas horarias registradas digitalmente. La hoja se mantiene lista para impresión y llenado manual.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Dilatación</th>
                      <th>FCF</th>
                      <th>Contracciones</th>
                      <th>Membranas</th>
                      <th>Líquido</th>
                      <th>Observaciones</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((p: any, i: number) => (
                      <tr key={p.id_partograma}>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{p.fecha_medicion} {p.hora_medicion}</td>
                        <td>{p.dilatacion ?? '-'} cm</td>
                        <td>{p.fcf ?? '-'} lpm</td>
                        <td>{p.contracciones_en_10_min ?? '-'} /10min</td>
                        <td>{p.membranas || '-'}</td>
                        <td>{p.membranas === 'intactas' ? '-' : (p.liquido_amniotico || '-')}</td>
                        <td style={{ fontSize: 12, maxWidth: 220, whiteSpace: 'pre-wrap' }}>{p.observaciones || '-'}</td>
                        <td>
                          <div className="btn-group">
                            <button className="btn btn-secondary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#db2777', fontWeight: 600 }} onClick={() => handleStartEdit(p)} title="Editar medición">
                              <Edit3 size={12}/> Editar
                            </button>
                            <button className="btn btn-danger" style={{ fontSize: 11 }} onClick={() => handleDelete(i)} title="Eliminar medición">
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ fontSize: 12 }}>
          Volver al Expediente
        </button>
      </div>
    </div>
  );
}
