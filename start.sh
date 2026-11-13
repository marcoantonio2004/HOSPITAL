#!/bin/bash

# Ignore SIGHUP so children survive if parent shell closes
trap '' HUP

echo "=== Hospital General San Felipe del Progreso ==="
echo "=== Expediente Clinico Digital ==="
echo ""

# Stop any existing processes on these ports
kill $(lsof -i :3000 -P -n -t) 2>/dev/null
kill $(lsof -i :5173 -P -n -t) 2>/dev/null
sleep 1

# Start backend
echo "[1/2] Iniciando backend (puerto 3000)..."
cd backend && node -e 'require("./dist/index.js")' &
BACKEND_PID=$!
sleep 2

if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "ERROR: Backend no pudo iniciar. Revisa backend/.env"
  exit 1
fi
echo "  Backend OK (PID: $BACKEND_PID)"

# Start frontend
cd frontend
echo "[2/2] Iniciando frontend (puerto 5173)..."
npx vite --host 0.0.0.0 &
FRONTEND_PID=$!
sleep 3

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo "ERROR: Frontend no pudo iniciar"
  exit 1
fi
echo "  Frontend OK (PID: $FRONTEND_PID)"

echo ""
echo "=== Servidores listos ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000/api"
echo ""
echo "  Credenciales: admin / admin123"
echo "  Presiona Ctrl+C para detener ambos."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
