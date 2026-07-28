import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usernameToEmail } from '../services/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password.trim());
    } catch (err: any) {
      setError(err.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Arrière-plan décoratif */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(ellipse at 20% 30%, rgba(79,70,229,0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 70%, rgba(16,185,129,0.1) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo & Titre */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
          }}>
            <img
              src="/logo-dark.png"
              alt="GESCO"
              style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '2rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}>
            GESCO
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            Plateforme intégrée de gestion scolaire
          </p>
        </div>

        {/* Formulaire */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '0.25rem' }}>Connexion</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
            Saisissez vos identifiants pour accéder à votre tableau de bord
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="login-username" className="form-label" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Identifiant
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin"
                autoComplete="username"
                autoCapitalize="none"
                className="form-input"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Mot de Passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="form-input"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    paddingRight: '2.5rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', padding: '4px',
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
                color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ marginTop: '0.25rem', width: '100%' }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Connexion...</>
              ) : (
                '→ Se connecter'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
