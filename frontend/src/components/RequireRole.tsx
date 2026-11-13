import React from 'react';
import { useAuth } from '../context/AuthContext';
import AccesoDenegado from './AccesoDenegado';

interface RequireRoleProps {
  roles: string[];
  moduloNombre?: string;
  children: JSX.Element;
}

export default function RequireRole({ roles, moduloNombre, children }: RequireRoleProps) {
  const { user } = useAuth();
  const currentRole = (user?.rol || '').toLowerCase();

  // Administrators have access to all hospital modules
  if (currentRole === 'admin') {
    return children;
  }

  // Check if the current user's role is allowed
  if (roles.includes(currentRole)) {
    return children;
  }

  return (
    <AccesoDenegado
      rolActual={currentRole}
      rolesPermitidos={roles}
      moduloNombre={moduloNombre}
    />
  );
}
