// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Page de Connexion SaaS Premium (src/pages/LoginPage.tsx)
// Glassmorphism, Dégradés Dynamiques & Boutons de Connexion Démo Instantanée
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Sparkles, User, KeyRound, ArrowRight } from 'lucide-react';

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

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      await login(user, pass);
    } catch (err: any) {
      setError(err.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top left, #1e1b4b 0%, #0f172a 50%, #020617 100%)',
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Halos de lumière décoratifs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 1,
      }}>
        
        {/* Logo & Marque GESCO */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '76px',
            height: '76px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 12px 30px rgba(79,70,229,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: 900, color: '#ffffff' }}>
              G
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '2.25rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            GESCO ERP
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '4px' }}>
            Solution Globale de Gestion Scolaire Ivoirienne
          </p>
        </div>

        {/* Formulaire Glassmorphic */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '2rem',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Connexion Securisée</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', marginTop: '2px' }}>
              Accédez à votre espace de gestion d'établissement
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div className="form-group">
              <label htmlFor="login-username" className="form-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem' }}>
                Identifiant utilisateur
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: '44px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem' }}>
                Mot de passe
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
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    paddingRight: '2.5rem',
                    borderRadius: '12px',
                    height: '44px',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.5)', padding: '4px',
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
                borderRadius: '10px',
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
              className="btn btn-primary"
              style={{
                marginTop: '0.25rem',
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.9375rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 4px 15px rgba(79,70,229,0.35)',
              }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Connexion en cours...</>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Se connecter à GESCO <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          {/* BOUTONS D'ACCÈS RAPIDE DÉMO */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, display: 'block', marginBottom: '10px', textAlign: 'center' }}>
              ⚡ ACCÈS RAPIDE DÉMO PAR RÔLE
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                👔 Direction
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('compta', 'compta123')}
                style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                💰 Finance
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('prof_cp1', 'prof123')}
                style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                👨‍🏫 Enseignant
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
