import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth
import Login from './pages/auth/Login';

// Core
import Dashboard from './pages/dashboard/Dashboard';
import Pacientes from './pages/pacientes/Pacientes';
import NuevoPaciente from './pages/pacientes/NuevoPaciente';
import EditarPaciente from './pages/pacientes/EditarPaciente';
import DetallePaciente from './pages/pacientes/DetallePaciente';

// Clinica (se acceden desde DetallePaciente)
import HistoriaClinica from './pages/clinica/HistoriaClinica';
import ConsultaUrgencias from './pages/clinica/ConsultaUrgencias';

// 15 Formatos Oficiales (NOM-004-SSA3 / SINBA)
import AvisoPrivacidad from './pages/modulos/AvisoPrivacidad';
import Consentimiento from './pages/modulos/Consentimiento';
import HojaFrontal from './pages/modulos/HojaFrontal';
import HCPediatrica from './pages/modulos/HCPediatrica';
import EvolucionDiaria from './pages/modulos/EvolucionDiaria';
import NotaEgreso from './pages/modulos/NotaEgreso';
import IndicacionesMedicas from './pages/modulos/IndicacionesMedicas';
import HojaHospitalizacionSINBA14 from './pages/modulos/HojaHospitalizacionSINBA14';
import HojaDiariaUrgenciasSINBA16 from './pages/modulos/HojaDiariaUrgenciasSINBA16';
import Partograma from './pages/modulos/Partograma';
import SolicitudLaboratorio from './pages/modulos/SolicitudLaboratorio';
import SolicitudGabinete from './pages/modulos/SolicitudGabinete';
import Interconsultas from './pages/modulos/Interconsultas';
import AtencionParto from './pages/modulos/AtencionParto';
import NotaIngreso from './pages/modulos/NotaIngreso';
import Internamiento from './pages/modulos/Internamiento';
import Referencia from './pages/modulos/Referencia';
import ConfiguracionLogos from './pages/configuracion/ConfiguracionLogos';
import AreaClinica from './pages/areas/AreaClinica';
import PersonalMedico from './pages/personal/PersonalMedico';

import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import NotFound from './pages/NotFound';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ marginTop: '40vh' }}><div className="spinner" /><p>Cargando sistema...</p></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route element={<ProtectedRoute />}>
        {/* Dashboard (Acceso a todos los roles, se adapta dinámicamente) */}
        <Route path="/" element={<Dashboard />} />

        {/* CRUD Pacientes */}
        <Route path="/pacientes" element={<Pacientes />} />
        <Route
          path="/pacientes/nuevo"
          element={
            <RequireRole roles={['admision', 'medico']} moduloNombre="el Registro y Alta de Nuevos Pacientes">
              <NuevoPaciente />
            </RequireRole>
          }
        />
        <Route path="/pacientes/:id" element={<DetallePaciente />} />
        <Route
          path="/pacientes/:id/editar"
          element={
            <RequireRole roles={['admision', 'medico']} moduloNombre="la Edición de Datos Demográficos">
              <EditarPaciente />
            </RequireRole>
          }
        />

        {/* BLOQUE 0: INGRESO (Admisión y Personal Médico) */}
        <Route
          path="/encuentros/:id/aviso-privacidad"
          element={
            <RequireRole roles={['admision', 'medico']} moduloNombre="el Aviso de Privacidad y Consentimiento de Datos">
              <AvisoPrivacidad />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/consentimiento"
          element={
            <RequireRole roles={['admision', 'medico']} moduloNombre="la Carta de Consentimiento Informado">
              <Consentimiento />
            </RequireRole>
          }
        />

        {/* BLOQUE 1: NÚCLEO DEL EXPEDIENTE (NOM-004-SSA3-2012) */}
        <Route
          path="/encuentros/:id/hoja-frontal"
          element={
            <RequireRole roles={['admision', 'medico']} moduloNombre="la Hoja Frontal del Expediente">
              <HojaFrontal />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/historia-clinica"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Historia Clínica General de Adultos">
              <HistoriaClinica />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/hc-pediatrica"
          element={
            <RequireRole roles={['medico', 'pediatria']} moduloNombre="la Historia Clínica Pediátrica">
              <HCPediatrica />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/evolucion"
          element={
            <RequireRole roles={['medico', 'enfermeria']} moduloNombre="las Notas de Evolución y Signos Vitales">
              <EvolucionDiaria />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/nota-egreso"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Nota de Egreso y Contrarreferencia">
              <NotaEgreso />
            </RequireRole>
          }
        />

        {/* BLOQUE 2: ÁREAS Y SERVICIOS */}
        <Route
          path="/encuentros/:id/urgencias"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Hoja de Consulta de Urgencias y Triage">
              <ConsultaUrgencias />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/sinba-16"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Hoja Diaria de Urgencias (SINBA-16)">
              <HojaDiariaUrgenciasSINBA16 />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/indicaciones"
          element={
            <RequireRole roles={['medico', 'enfermeria']} moduloNombre="la Hoja de Indicaciones Médicas y Fármacos">
              <IndicacionesMedicas />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/sinba-14"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Hoja de Hospitalización (SINBA-14)">
              <HojaHospitalizacionSINBA14 />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/partograma"
          element={
            <RequireRole roles={['medico', 'enfermeria', 'obstetricia']} moduloNombre="el Partograma y Curvas de Vigilancia">
              <Partograma />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/atencion-parto"
          element={
            <RequireRole roles={['medico', 'obstetricia']} moduloNombre="la Nota de Atención de Parto y Nacimiento">
              <AtencionParto />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/nota-ingreso"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Nota Médica de Ingreso Hospitalario">
              <NotaIngreso />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/internamiento"
          element={
            <RequireRole roles={['medico', 'enfermeria']} moduloNombre="la Orden de Internamiento Hospitalario">
              <Internamiento />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/referencia"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Hoja de Referencia y Traslado Interhospitalario">
              <Referencia />
            </RequireRole>
          }
        />

        {/* BLOQUE 3: ESTUDIOS Y SOLICITUDES */}
        <Route
          path="/encuentros/:id/laboratorio"
          element={
            <RequireRole roles={['medico', 'laboratorio']} moduloNombre="la Solicitud de Laboratorio Clínico">
              <SolicitudLaboratorio />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/gabinete"
          element={
            <RequireRole roles={['medico', 'laboratorio']} moduloNombre="la Solicitud y Reporte de Gabinete / Rayos X">
              <SolicitudGabinete />
            </RequireRole>
          }
        />
        <Route
          path="/encuentros/:id/interconsultas"
          element={
            <RequireRole roles={['medico']} moduloNombre="la Solicitud de Interconsulta Médica Especializada">
              <Interconsultas />
            </RequireRole>
          }
        />

        {/* CONFIGURACIÓN Y PERSONAL (Exclusivo Administración) */}
        <Route
          path="/configuracion"
          element={
            <RequireRole roles={['admin']} moduloNombre="la Configuración General del Sistema">
              <ConfiguracionLogos />
            </RequireRole>
          }
        />
        <Route
          path="/configuracion/logos"
          element={
            <RequireRole roles={['admin']} moduloNombre="la Configuración de Logotipos y Membretes">
              <ConfiguracionLogos />
            </RequireRole>
          }
        />
        <Route
          path="/personal-medico"
          element={
            <RequireRole roles={['admin']} moduloNombre="el Directorio y Gestión de Personal Médico">
              <PersonalMedico />
            </RequireRole>
          }
        />

        {/* ÁREAS MÉDICAS Y CENSO HOSPITALARIO */}
        <Route path="/areas" element={<Navigate to="/areas/todas" replace />} />
        <Route path="/areas/:areaId" element={<AreaClinica />} />

        {/* Redirects y rutas directas de áreas médicas */}
        <Route path="/buscar" element={<Navigate to="/pacientes" replace />} />
        <Route path="/admision" element={<Navigate to="/areas/admision" replace />} />
        <Route path="/admision/nuevo" element={<Navigate to="/pacientes/nuevo" replace />} />
        <Route path="/urgencias" element={<Navigate to="/areas/urgencias" replace />} />
        <Route path="/hospitalizacion" element={<Navigate to="/areas/hospitalizacion" replace />} />
        <Route path="/tococirugia" element={<Navigate to="/areas/tococirugia" replace />} />
        <Route path="/pediatria" element={<Navigate to="/areas/pediatria" replace />} />
        <Route path="/consulta-externa" element={<Navigate to="/areas/consulta_externa" replace />} />
        <Route path="/consulta_externa" element={<Navigate to="/areas/consulta_externa" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
