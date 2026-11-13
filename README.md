# Expediente Clinico Digital

**Hospital General San Felipe del Progreso**

Sistema de expediente clinico electronico para gestion de pacientes, encuentros hospitalarios y documentacion clinica.

---

## Arquitectura

```
expediente-clinico/
├── frontend/          React + TypeScript + Vite
│   └── src/
│       ├── pages/
│       │   ├── auth/          Login
│       │   ├── dashboard/     Panel principal
│       │   ├── pacientes/     Admision, registro, detalle
│       │   ├── clinica/       Historia clinica, urgencias
│       │   └── modulos/       11 modulos clinicos (esqueletos)
│       ├── components/        Layout (sidebar)
│       ├── context/           AuthContext
│       ├── services/          API client
│       └── styles/            CSS global
├── backend/           Node.js + Express + PostgreSQL
│   └── src/
│       ├── routes/            auth, paciente
│       ├── middleware/        JWT auth, audit log
│       ├── config/            Database connection
│       └── types/             TypeScript types
├── database/
│   └── schema.sql     Esquema completo PostgreSQL
└── docs/              Documentacion del proyecto
```

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm

## Instalacion

### 1. Base de datos

```bash
psql -U postgres -c "CREATE DATABASE expediente_clinico;"
psql -U postgres -d expediente_clinico -f database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # Editar credenciales de BD
npm install
npx tsc
```

### 3. Frontend

```bash
cd frontend
npm install
```

## Iniciar

### Opcion 1: Script automatizado

```bash
./start.sh
```

### Opcion 2: Manual (2 terminales)

Terminal 1 - Backend:
```bash
cd backend && node -e 'require("./dist/index.js")'
```

Terminal 2 - Frontend:
```bash
cd frontend && npm run dev
```

Abrir http://localhost:5173

## Credenciales de prueba

| Usuario    | Contrasena  | Rol            |
|------------|-------------|----------------|
| admin      | admin123    | Administrador  |
| admision   | admision123 | Admision       |
| medico     | medico123   | Medico         |

## Funcionalidades

### Implementadas

- **Login** con JWT (httpOnly cookies)
- **Dashboard** con estadisticas
- **Admision** - busqueda y registro de pacientes
- **Nuevo Paciente** - formulario completo (identidad, contacto, vivienda, antecedentes, gineco-obstetricos)
- **Detalle Paciente** - vista completa del expediente
- **Historia Clinica** - padecimiento, interrogatorio, exploracion, signos vitales, diagnostico, nota SOAP
- **Consulta Urgencias** - triage, notas de evolucion, estudios
- **Audit log** - registro de acciones por usuario

### Modulos pendientes (esqueletos)

Los siguientes modulos estan creados como placeholders con su ruta y navegacion:

| Modulo | Ruta |
|--------|------|
| Nota de Ingreso | /encuentros/:id/nota-ingreso |
| Laboratorio / Gabinete | /encuentros/:id/laboratorio-gabinete |
| Internamiento | /encuentros/:id/internamiento |
| Indicaciones Medicas | /encuentros/:id/indicaciones |
| Partograma | /encuentros/:id/partograma |
| Consentimiento | /encuentros/:id/consentimiento |
| Evolucion Diaria | /encuentros/:id/evolucion |
| Interconsultas | /encuentros/:id/interconsultas |
| Referencia | /encuentros/:id/referencia |
| Atencion de Parto | /encuentros/:id/atencion-parto |
| HC Pediatrica | /encuentros/:id/hc-pediatrica |

## API Endpoints

### Auth

- `POST /api/auth/login` - Iniciar sesion
- `POST /api/auth/logout` - Cerrar sesion
- `GET /api/auth/me` - Obtener usuario actual

### Pacientes

- `GET /api/pacientes` - Listar/buscar pacientes
- `POST /api/pacientes` - Crear paciente
- `GET /api/pacientes/:id` - Detalle de paciente
- `PUT /api/pacientes/:id` - Actualizar paciente
- `DELETE /api/pacientes/:id` - Eliminar paciente
- `POST /api/pacientes/:id/encuentros` - Crear encuentro hospitalario

### Encuentros

- `GET /api/encuentros/:id` - Detalle del encuentro

### Historia Clinica

- `GET /api/encuentros/:id/historia-clinica` - Obtener HC
- `POST /api/encuentros/:id/historia-clinica` - Crear HC
- `PUT /api/encuentros/:id/historia-clinica` - Actualizar HC

### Nota de Ingreso

- `GET /api/encuentros/:id/nota-ingreso` - Obtener nota
- `POST /api/encuentros/:id/nota-ingreso` - Crear nota

### Urgencias

- `GET /api/encuentros/:id/notas-urgencias` - Listar notas
- `POST /api/encuentros/:id/notas-urgencias` - Crear nota
- `GET /api/encuentros/:id/estudios` - Listar estudios
- `POST /api/encuentros/:id/estudios` - Solicitar estudio
- `PUT /api/estudios/:id/resultados` - Actualizar resultados

## Stack Tecnico

- **Frontend:** React 18, TypeScript, Vite, React Router, Lucide React
- **Backend:** Node.js, Express, TypeScript, pg (PostgreSQL), jsonwebtoken, bcrypt
- **Base de datos:** PostgreSQL con esquema normalizado
- **Autenticacion:** JWT con httpOnly cookies
