import React, { useState } from 'react';
import { Bus, ClipboardList, CreditCard, BarChart3 } from 'lucide-react';
import { TransportLinesView } from '../components/transport/TransportLinesView';
import { TransportEnrollmentView } from '../components/transport/TransportEnrollmentView';
import { TransportPaymentView } from '../components/transport/TransportPaymentView';
import { TransportTrackingView } from '../components/transport/TransportTrackingView';

type TransportTab = 'LINES' | 'ENROLLMENT' | 'PAYMENT' | 'TRACKING';

const TABS: { id: TransportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'LINES',      label: 'Lignes de transport', icon: <Bus size={15} /> },
  { id: 'ENROLLMENT', label: 'Inscription',          icon: <ClipboardList size={15} /> },
  { id: 'PAYMENT',    label: 'Paiement',             icon: <CreditCard size={15} /> },
  { id: 'TRACKING',   label: 'Suivi transport',      icon: <BarChart3 size={15} /> },
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
            {tab.icon} {tab.label}
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
