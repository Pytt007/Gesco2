import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  icon?: string;
}

export default function PlaceholderPage({ title, icon = '🚧' }: PlaceholderPageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="card-teal" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '20px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '2.5rem',
          }}>
            {icon}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
            Module {title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' }}>
            Ce module est en cours de développement et sera disponible très prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
