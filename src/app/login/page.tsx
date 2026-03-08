'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../globals.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

  // Cargar email guardado al montar
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('El email es requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Email inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('La contraseña es requerida');
      return false;
    }
    if (value.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) validateEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) validatePassword(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validar campos
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);

    if (!emailValid || !passwordValid) {
      return;
    }

    setLoading(true);

    try {
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

      // Guardar access token y userId
      if (payload.accessToken) {
        localStorage.setItem('accessToken', payload.accessToken);
      }
      if (payload.userId) {
        localStorage.setItem('userId', payload.userId.toString());
      }

      // Guardar email si está marcado
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
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
      background: 'linear-gradient(135deg, #1a472a 0%, #2a5a3a 50%, #1a472a 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      animation: 'fadeIn 0.5s ease-in',
    }}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .login-card {
          animation: slideInUp 0.6s ease-out;
        }

        .input-field {
          transition: all 0.3s ease;
        }

        .input-field:focus {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 71, 42, 0.3);
        }

        .btn-login {
          position: relative;
          transition: all 0.3s ease;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 71, 42, 0.4);
        }

        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        .error-message {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>

      <div style={{
        background: 'var(--bg-primary)',
        padding: '50px 40px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid var(--border)',
      }} className="login-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            margin: '0 0 8px 0',
            color: 'var(--heading)',
            fontSize: '32px',
            fontWeight: '700',
            letterSpacing: '-0.5px',
          }}>
            Smata FC
          </h1>
          <p style={{
            margin: '0',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Gestor de Cuentas
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Error Message */}
          {error && (
            <div className="error-message" style={{
              background: 'rgba(255, 68, 68, 0.1)',
              borderLeft: '4px solid #ff4444',
              color: '#ff4444',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              <span style={{ marginRight: '8px' }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              📧 Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => validateEmail(email)}
              placeholder="tu@email.com"
              disabled={loading}
              className="input-field"
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: '8px',
                border: emailError ? '2px solid #ff4444' : '2px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {emailError && (
              <p style={{
                margin: '6px 0 0 0',
                color: '#ff4444',
                fontSize: '12px',
                fontWeight: '500',
              }}>
                {emailError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🔐 Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => validatePassword(password)}
                placeholder="••••••••"
                disabled={loading}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 16px',
                  paddingRight: '48px',
                  borderRadius: '8px',
                  border: passwordError ? '2px solid #ff4444' : '2px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'color 0.2s ease',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--heading)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {passwordError && (
              <p style={{
                margin: '6px 0 0 0',
                color: '#ff4444',
                fontSize: '12px',
                fontWeight: '500',
              }}>
                {passwordError}
              </p>
            )}
          </div>

          {/* Remember Email */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '28px',
            gap: '10px',
          }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              disabled={loading}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            />
            <label
              htmlFor="remember"
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Recordar email
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-login"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? 'rgba(26, 71, 42, 0.7)' : 'var(--primary)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {loading && <span className="spinner"></span>}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
