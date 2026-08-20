import React, { useState } from 'react';
import { Bus, ClipboardList, CreditCard, BarChart3, MapPin } from 'lucide-react';
import { TransportLinesView } from '../components/transport/TransportLinesView';
import { TransportEnrollmentView } from '../components/transport/TransportEnrollmentView';
import { TransportPaymentView } from '../components/transport/TransportPaymentView';
import { TransportTrackingView } from '../components/transport/TransportTrackingView';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

type TransportTab = 'LINES' | 'ENROLLMENT' | 'PAYMENT' | 'TRACKING';

const TABS: { id: TransportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'LINES',      label: 'Lignes de transport', icon: <Bus size={15} /> },
  { id: 'ENROLLMENT', label: 'Inscription',          icon: <ClipboardList size={15} /> },
  { id: 'PAYMENT',    label: 'Paiement',             icon: <CreditCard size={15} /> },
  { id: 'TRACKING',   label: 'Suivi transport',      icon: <BarChart3 size={15} /> },
];

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<TransportTab>('LINES');
  const [syncKey, setSyncKey] = useState(0);

  // Synchronisation temps réel automatique
  useRealtimeSync({
    tables: ['school_settings', 'transport_lines', 'transport_enrollments'],
    onDataChange: () => setSyncKey((prev) => prev + 1),
  });

  return (
    <div key={syncKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── BANNIÈRE HERO SAAS ─────────────────────────────────────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(79, 70, 229, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Transport Scolaire
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#c7d2fe', fontWeight: 500 }}>
                Gestion des lignes, inscriptions, paiements et suivi des navettes
              </p>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', backdropFilter: 'blur(4px)' }}>
            <MapPin size={14} /> Navettes & Lignes
          </div>
        </div>
      </div>

      {/* ── ONGLETS PILLS MODERNES ─────────────────────────────────────────── */}
      <div className="tab-pills-bar" style={{ display: 'flex', gap: 6, padding: '6px', background: 'var(--bg-surface-hover, #f1f5f9)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: active ? '#4f46e5' : 'transparent',
                color: active ? '#ffffff' : 'var(--text-secondary, #475569)',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: active ? '0 4px 12px rgba(79,70,229,0.35)' : 'none',
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
      {activeTab === 'LINES'      && <TransportLinesView />}
      {activeTab === 'ENROLLMENT' && <TransportEnrollmentView />}
      {activeTab === 'PAYMENT'    && <TransportPaymentView />}
      {activeTab === 'TRACKING'   && <TransportTrackingView />}

    </div>
  );
}
