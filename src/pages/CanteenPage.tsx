import React, { useState } from 'react';
import { CanteenConfigView } from '../components/canteen/CanteenConfigView';
import { CanteenEnrollmentView } from '../components/canteen/CanteenEnrollmentView';
import { CanteenPaymentView } from '../components/canteen/CanteenPaymentView';
import { MealListView } from '../components/canteen/MealListView';
import { CanteenTrackingView } from '../components/canteen/CanteenTrackingView';
import { UtensilsCrossed, CreditCard, ClipboardList, BarChart3, UserPlus, Settings } from 'lucide-react';

type CanteenTab = 'PAYMENT' | 'MEAL_LIST' | 'TRACKING' | 'ENROLLMENT' | 'CONFIG';

const TABS: { id: CanteenTab; label: string; icon: React.ReactNode }[] = [
  { id: 'PAYMENT',    label: 'Paiement cantine',       icon: <CreditCard size={15} /> },
  { id: 'MEAL_LIST',  label: 'Repas du jour',           icon: <ClipboardList size={15} /> },
  { id: 'TRACKING',   label: 'Suivi cantine',           icon: <BarChart3 size={15} /> },
  { id: 'ENROLLMENT', label: 'Inscription',             icon: <UserPlus size={15} /> },
  { id: 'CONFIG',     label: 'Configuration',           icon: <Settings size={15} /> },
];

export default function CanteenPage() {
  const [activeTab, setActiveTab] = useState<CanteenTab>('PAYMENT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── BANNIÈRE HERO SAAS ─────────────────────────────────────────────── */}
      <div
        className="card shadow-lg"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(16, 185, 129, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UtensilsCrossed size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Gestion de la Cantine
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6ee7b7', fontWeight: 500 }}>
                Paiements, inscriptions, menus et suivi de la restauration scolaire
              </p>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', backdropFilter: 'blur(4px)' }}>
            <UtensilsCrossed size={14} /> Restauration Scolaire
          </div>
        </div>
      </div>

      {/* ── ONGLETS PILLS MODERNES ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '6px', background: '#f1f5f9', borderRadius: 14, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px',
                background: active ? '#10b981' : 'transparent',
                color: active ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: active ? '0 4px 12px rgba(16,185,129,0.35)' : 'none',
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
      {activeTab === 'PAYMENT'    && <CanteenPaymentView />}
      {activeTab === 'MEAL_LIST'  && <MealListView />}
      {activeTab === 'TRACKING'   && <CanteenTrackingView />}
      {activeTab === 'ENROLLMENT' && <CanteenEnrollmentView />}
      {activeTab === 'CONFIG'     && <CanteenConfigView />}

    </div>
  );
}
