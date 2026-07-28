import React, { useState } from 'react';
import { TransportLinesView } from '../components/transport/TransportLinesView';
import { TransportEnrollmentView } from '../components/transport/TransportEnrollmentView';
import { TransportPaymentView } from '../components/transport/TransportPaymentView';
import { TransportTrackingView } from '../components/transport/TransportTrackingView';

type TransportTab = 'LINES' | 'ENROLLMENT' | 'PAYMENT' | 'TRACKING';

const TABS: { id: TransportTab; label: string; emoji: string }[] = [
  { id: 'LINES',      label: 'Lignes de transport', emoji: '🚌' },
  { id: 'ENROLLMENT', label: 'Inscription',          emoji: '📋' },
  { id: 'PAYMENT',    label: 'Paiement',             emoji: '💳' },
  { id: 'TRACKING',   label: 'Suivi transport',      emoji: '📊' },
];

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<TransportTab>('LINES');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Navigation onglets */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ fontWeight: 600, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'LINES'      && <TransportLinesView />}
      {activeTab === 'ENROLLMENT' && <TransportEnrollmentView />}
      {activeTab === 'PAYMENT'    && <TransportPaymentView />}
      {activeTab === 'TRACKING'   && <TransportTrackingView />}
    </div>
  );
}
