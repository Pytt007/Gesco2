// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Assistant d'Installation Initiale (Premier Lancement Établissement)
// (src/components/settings/UsersManager/InitialSetupWizardModal.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Building, User, Calendar, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, GraduationCap, ShieldCheck, KeyRound
} from 'lucide-react';
import { InitialSetupData } from '../../../types';

interface InitialSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: InitialSetupData) => void;
}

export default function InitialSetupWizardModal({
  isOpen,
  onClose,
  onComplete,
}: InitialSetupWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [form, setForm] = useState<InitialSetupData>({
    schoolName: 'Groupe Scolaire Excellence',
    schoolCode: 'GSE-2026',
    ownerFullName: 'M. Le Directeur Général',
    ownerUsername: 'admin',
    ownerEmail: 'directeur@excellence.edu.ci',
    ownerPhone: '+225 07 00 00 00',
    ownerPassword: '',
    academicYearLabel: '2025-2026',
  });

  if (!isOpen) return null;

  const handleNext = () => setStep((prev) => (prev + 1) as any);
  const handlePrev = () => setStep((prev) => (prev - 1) as any);

  const handleFinish = () => {
    onComplete(form);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 580, borderRadius: 24, padding: 0, overflow: 'hidden' }}>

        {/* Header Setup */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          color: '#ffffff',
          padding: '28px 32px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              <GraduationCap size={28} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                Initialisation de GESCO ERP
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#a5b4fc' }}>
                Configuration initiale de l'Établissement &amp; Création du Propriétaire
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { num: 1, label: 'Bienvenue' },
            { num: 2, label: 'Établissement' },
            { num: 3, label: 'Propriétaire' },
            { num: 4, label: 'Année Active' },
            { num: 5, label: 'Terminer' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '10px 2px',
                textAlign: 'center',
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: step === s.num ? '#6366f1' : step > s.num ? '#16a34a' : '#94a3b8',
                borderBottom: step === s.num ? '3px solid #6366f1' : '3px solid transparent',
              }}
            >
              {s.num}. {s.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 28, maxHeight: '60vh', overflowY: 'auto' }}>

          {/* 1. Bienvenue */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚀</div>
              <h3 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '1.25rem', color: '#0f172a' }}>
                Bienvenue dans GESCO ERP
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Cet assistant va vous guider pour installer l'application pour votre établissement.<br />
                Un seul compte <strong>Propriétaire (Directeur)</strong> sera créé avec les accès totaux.
              </p>
            </div>
          )}

          {/* 2. Établissement */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nom Officiel de l'Établissement *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  placeholder="ex: Complexe Scolaire Saint-Joseph"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Code Établissement (Matricule)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.schoolCode}
                  onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
                  placeholder="ex: STJ-2026"
                />
              </div>
            </div>
          )}

          {/* 3. Propriétaire */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nom Complète du Directeur (Propriétaire) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.ownerFullName}
                  onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Identifiant (@username) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.ownerUsername}
                    onChange={(e) => setForm({ ...form, ownerUsername: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.ownerPhone}
                    onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Officiel</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* 4. Année Scolaire Active */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Libellé de l'Année Scolaire Initiale *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.academicYearLabel}
                  onChange={(e) => setForm({ ...form, academicYearLabel: e.target.value })}
                  placeholder="2025-2026"
                  required
                />
              </div>
            </div>
          )}

          {/* 5. Terminer */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '1.25rem', color: '#0f172a' }}>
                Configuration Prête !
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: '#64748b' }}>
                L'établissement <strong>{form.schoolName}</strong> et le compte Propriétaire <strong>{form.ownerFullName}</strong> ont été configurés.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justify: 'space-between',
        }}>
          {step > 1 ? (
            <button className="btn btn-secondary btn-sm" onClick={handlePrev} style={{ borderRadius: 8 }}>
              <ArrowLeft size={14} /> Précédent
            </button>
          ) : <div />}

          {step < 5 ? (
            <button className="btn btn-primary btn-sm" onClick={handleNext} style={{ borderRadius: 8, padding: '8px 18px' }}>
              Continuer <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-success btn-sm text-white fw-bold" onClick={handleFinish} style={{ borderRadius: 8, padding: '8px 24px' }}>
              🚀 Lancer GESCO
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
