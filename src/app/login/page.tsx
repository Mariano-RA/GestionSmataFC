'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../globals.css';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@smatafc.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Intentar login llamando a un endpoint
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Error en login');
        setLoading(false);
        return;
      }

      const payload = data?.data ?? data;

      // Guardar access token en localStorage
      if (payload.accessToken) {
        localStorage.setItem('accessToken', payload.accessToken);
      }
      
      // Guardar userId en localStorage
      if (payload.userId) {
        localStorage.setItem('userId', payload.userId.toString());
      }

      // Redirigir a home
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a472a 0%, #2a5a3a 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '28px' }}>
            ⚽ Smata FC
          </h1>
          <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Gestor de Cuentas
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              background: '#ff4444',
              color: 'white',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '600',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smatafc.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '600',
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              background: loading ? '#888' : 'var(--primary)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Credenciales de demo:</p>
          <p style={{ margin: '0 0 4px 0' }}>📧 admin@smatafc.com</p>
          <p style={{ margin: '0' }}>🔑 admin123</p>
        </div>
      </div>
    </div>
  );
}
