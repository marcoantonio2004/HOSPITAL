import { Link } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="not-found-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <FileQuestion size={80} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '2rem' }} />
      <h1 style={{ fontSize: '3rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Página no encontrada</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '2rem', maxWidth: '400px' }}>
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </p>
      <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Home size={18} /> Volver al Inicio
      </Link>
    </div>
  );
}
