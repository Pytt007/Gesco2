import React, { useState } from 'react';
import { useSchoolYear } from '../context/SchoolYearContext';
import { TuitionFeesConfigView } from '../components/finance/TuitionFeesConfigView';
import { TuitionPaymentView } from '../components/finance/TuitionPaymentView';
import { FinancialTrackingView } from '../components/finance/FinancialTrackingView';
import { StudentRegistrationWizard } from '../components/students/StudentRegistrationWizard';
import { GraduationCap, CreditCard, BarChart3, Settings, Plus } from 'lucide-react';

type ScolarityTab = 'PAYMENT_RECORD' | 'CONFIG' | 'PAYMENTS';

const TABS: { id: ScolarityTab; label: string; icon: React.ReactNode }[] = [
  { id: 'PAYMENT_RECORD', label: 'Paiement scolarité',       icon: <CreditCard size={15} /> },
  { id: 'PAYMENTS',       label: 'Suivi des paiements',      icon: <BarChart3 size={15} /> },
  { id: 'CONFIG',         label: 'Configuration des frais',  icon: <Settings size={15} /> },
];

export default function ScolarityPage({ defaultTab }: { defaultTab?: ScolarityTab }) {
  const { schoolYear } = useSchoolYear();
  const [activeTab, setActiveTab] = useState<ScolarityTab>(defaultTab || 'PAYMENT_RECORD');
  const [showRegistrationWizard, setShowRegistrationWizard] = useState<boolean>(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── BANNIÈRE HERO SAAS ─────────────────────────────────────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Scolarité & Paiements
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                {schoolYear ? `Année scolaire ${schoolYear}` : 'Gestion financière et inscriptions scolaires'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn"
              onClick={() => setShowRegistrationWizard(true)}
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: '0.9375rem',
                background: '#ffffff',
                color: '#1d4ed8',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Plus size={18} color="#1d4ed8" /> + Inscrire un Élève
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', backdropFilter: 'blur(4px)' }}>
              <CreditCard size={14} /> Gestion Financière
            </div>
          </div>
        </div>
      </div>

      {/* ── ONGLETS PILLS MODERNES ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '6px', background: 'var(--bg-surface-hover, #f1f5f9)', border: '1px solid var(--border)', borderRadius: 14, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: active ? '#2563eb' : 'transparent',
                color: active ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: active ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── CONTENU DE L'ONGLET ACTIF ─────────────────────────────────────── */}
      {activeTab === 'PAYMENT_RECORD' && <TuitionPaymentView />}
      {activeTab === 'PAYMENTS'       && <FinancialTrackingView />}
      {activeTab === 'CONFIG'         && <TuitionFeesConfigView />}

      {/* ── MODALE WIZARD D'INSCRIPTION TRANSACTIONNELLE ─────────────────── */}
      {showRegistrationWizard && (
        <StudentRegistrationWizard
          isOpen={showRegistrationWizard}
          onClose={() => setShowRegistrationWizard(false)}
          onSuccess={() => setShowRegistrationWizard(false)}
        />
      )}

    </div>
  );
}
