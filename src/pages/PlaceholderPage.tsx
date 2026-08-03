import React from 'react';
import { Construction, Sparkles, ShieldCheck, ArrowRight, Layers, BarChart3, History, Activity } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  icon?: string; // Conservé pour rétrocompatibilité — non utilisé visuellement
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
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
              <Layers size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Module {title}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                Espace avancé d'analyse, de traçabilité et de suivi global de l'établissement
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', backdropFilter: 'blur(4px)' }}>
            <ShieldCheck size={16} color="#ffffff" /> Module Pro GESCO Enterprise
          </div>
        </div>
      </div>

      {/* ── PREVIEW DES FONCTIONNALITÉS EN DÉVELOPPEMENT ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        
        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '14px', padding: '1.5rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <BarChart3 size={20} color="#ffffff" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 6px' }}>Analyses Avancées</h3>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>
            Graphiques multidimensionnels et tableaux croisés dynamiques calculés en temps réel.
          </p>
        </div>

        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '14px', padding: '1.5rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Activity size={20} color="#ffffff" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 6px' }}>Traçabilité & Sécurité</h3>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>
            Historique complet des actions avec journaux d'audit horodatés et infalsifiables.
          </p>
        </div>

        <div className="card-hover" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: '14px', padding: '1.5rem', color: '#ffffff', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.25)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Sparkles size={20} color="#ffffff" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 6px' }}>Automatisations IA</h3>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>
            Rapports prédictifs et suggestions intelligentes intégrées au workflow.
          </p>
        </div>

      </div>

      {/* ── BANNIÈRE EN COURS DE FINALISATION ─────────────────────────────── */}
      <div className="card shadow-sm p-5" style={{ borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', background: '#ffffff' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '20px',
          background: '#eff6ff', color: '#2563eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', fontSize: '2rem',
        }}>
          <Construction size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Module {title} en cours d'intégration finale
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 520, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
          Ce module bénéficie actuellement des dernières optimisations du Design System SaaS Premium. Les données de démonstration et les tableaux de suivi seront activés lors de la prochaine mise à jour.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>
          <span>GESCO v1.0.0 Enterprise Ready</span>
        </div>
      </div>

    </div>
  );
}
