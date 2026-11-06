import React, { useEffect, useState } from 'react';
import { completePasswordRecovery, requestPasswordRecovery } from '../services/auth/passwordRecoveryService';

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 12, padding: '0 12px',
};

export default function PasswordRecoveryPage() {
  // Keep the one-time credential only in memory and remove it from browser history.
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('error') ? '' : params.get('token') || '';
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).has('error')
    ? 'Ce lien est invalide ou expiré. Demandez un nouveau lien.' : '');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    window.history.replaceState(window.history.state, '', '/reset-password');
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (token && password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      if (token) {
        await completePasswordRecovery(token, password);
        setPassword('');
        setConfirmation('');
        setToken('');
        setComplete(true);
        setNotice('Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.');
      } else {
        await requestPasswordRecovery(identifier);
        setNotice('Si ce compte possède une adresse de récupération, un lien vient de lui être envoyé. Consultez aussi les courriers indésirables.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Service temporairement indisponible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'radial-gradient(ellipse at top left, #1e1b4b, #0f172a 50%, #020617)', color: '#fff' }}>
      <section aria-labelledby="recovery-title" style={{ width: '100%', maxWidth: 440, padding: 32,
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, background: 'rgba(255,255,255,0.04)' }}>
        <img src="/gesco_logo.png" alt="GESCO" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 20, background: '#fff', borderRadius: 16 }} />
        <h1 id="recovery-title" style={{ color: '#fff', fontSize: 24, marginBottom: 12 }}>
          {complete ? 'Mot de passe modifié' : token ? 'Choisir un nouveau mot de passe' : 'Mot de passe oublié'}
        </h1>
        {!complete && <p style={{ color: '#cbd5e1', marginBottom: 24, lineHeight: 1.5 }}>
          {token ? 'Utilisez entre 12 et 128 caractères.' : 'Saisissez admin ou l’adresse e-mail associée à votre compte pour recevoir un lien de récupération.'}
        </p>}
        {!complete && <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
          {token ? <>
            <label htmlFor="recovery-password">Nouveau mot de passe
              <input id="recovery-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}
                value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </label>
            <label htmlFor="recovery-confirmation">Confirmer le mot de passe
              <input id="recovery-confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}
                value={confirmation} onChange={e => setConfirmation(e.target.value)} style={inputStyle} />
            </label>
          </> : <label htmlFor="recovery-identifier">Identifiant admin ou adresse e-mail
            <input id="recovery-identifier" type="text" autoComplete="username" autoCapitalize="none" required
              value={identifier} onChange={e => setIdentifier(e.target.value)} style={inputStyle} />
          </label>}
          <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', minHeight: 46 }}>
            {busy ? 'Traitement en cours…' : token ? 'Enregistrer le nouveau mot de passe' : 'Envoyer le lien de récupération'}
          </button>
          {token && <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => {
            setToken(''); setPassword(''); setConfirmation(''); setError(''); setNotice('');
          }}>Demander un nouveau lien</button>}
        </form>}
        {error && <p role="alert" style={{ color: '#fca5a5', marginTop: 20 }}>{error}</p>}
        {notice && <p role="status" style={{ color: '#a7f3d0', marginTop: 20, lineHeight: 1.5 }}>{notice}</p>}
        <a href="/" style={{ display: 'inline-block', color: '#c7d2fe', marginTop: 24 }}>Retour à la connexion</a>
      </section>
    </main>
  );
}
