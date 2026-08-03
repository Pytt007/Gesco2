import React, { useState, useMemo } from 'react';
import { downloadExcel } from '../utils/exportUtils';
import {
  History, ShieldCheck, Search, Filter, Calendar, FileSpreadsheet,
  Printer, CheckCircle2, AlertTriangle, AlertOctagon, Info, User,
  Clock, ArrowUpRight, Lock, Eye, RefreshCw, Layers, SlidersHorizontal,
} from 'lucide-react';

import { useSchoolYear } from '../context/SchoolYearContext';
import { useAcademicYears } from '../hooks/academic';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: 'FINANCE' | 'PEDAGOGY' | 'CANTEEN' | 'TRANSPORT' | 'SETTINGS' | 'SYSTEM';
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  details: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'log-101', timestamp: '30/07/2026 16:45:12', user: 'Directeur Général', role: 'ADMIN_GENERAL', action: 'Modification des Habilitations par Rôle', module: 'SETTINGS', ipAddress: '192.168.1.10', severity: 'SUCCESS', details: 'Activation accès module Finance pour le rôle Sécurité.' },
  { id: 'log-102', timestamp: '30/07/2026 16:22:04', user: 'Comptable Principal', role: 'ACCOUNTANT', action: 'Enregistrement Versement Scolarité #RCT-942', module: 'FINANCE', ipAddress: '192.168.1.24', severity: 'SUCCESS', details: 'Encaissement de 150 000 FCFA par Wave pour KOUASSI Jean.' },
  { id: 'log-103', timestamp: '30/07/2026 15:10:45', user: 'Enseignant CM2 A', role: 'TEACHER', action: 'Saisie Notes Evaluation Mensuelle', module: 'PEDAGOGY', ipAddress: '192.168.1.55', severity: 'INFO', details: '24 notes enregistrées en Mathématiques CM2 A.' },
  { id: 'log-104', timestamp: '30/07/2026 14:05:19', user: 'Responsable Cantine', role: 'STAFF', action: 'Souscription Abonnement Repas', module: 'CANTEEN', ipAddress: '192.168.1.33', severity: 'INFO', details: 'Nouvel abonnement mensuel activé pour DIOP Awa.' },
  { id: 'log-105', timestamp: '30/07/2026 12:44:02', user: 'Super Admin', role: 'ADMIN_GENERAL', action: 'Réinitialisation Mot de Passe Utilisateur', module: 'SYSTEM', ipAddress: '192.168.1.10', severity: 'WARNING', details: 'Réinitialisation forcée du compte prof_maths_1.' },
  { id: 'log-106', timestamp: '30/07/2026 11:15:30', user: 'Gestionnaire Transport', role: 'STAFF', action: 'Attribution Navette Ligne 1', module: 'TRANSPORT', ipAddress: '192.168.1.41', severity: 'INFO', details: 'Affectation élève Bamba Oumar à la Ligne Riviera.' },
  { id: 'log-107', timestamp: '30/07/2026 09:30:11', user: 'Comptable Assistant', role: 'ACCOUNTANT', action: 'Tentative Annulation Versement Non Autorisée', module: 'FINANCE', ipAddress: '192.168.1.25', severity: 'DANGER', details: 'Tentative d\'annulation sans motif bloquée par le système.' },
];

export default function AuditHistoryPage() {
  const { schoolYear } = useSchoolYear();
  const { academicYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>(schoolYear || 'ay-2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
      const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
      return matchesSearch && matchesModule && matchesSeverity;
    });
  }, [searchTerm, moduleFilter, severityFilter]);

  const handleExportExcel = () => {
    const dataToExport = filteredLogs.map((log) => ({
      'Horodatage': log.timestamp,
      'Utilisateur': log.user,
      'Rôle': log.role,
      'Action': log.action,
      'Module': log.module,
      'Adresse IP': log.ipAddress,
      'Niveau': log.severity,
      'Détails': log.details,
    }));
    downloadExcel(dataToExport, 'Journal_Audit_GESCO', 'AuditLogs');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── 1. BANNIÈRE HERO SAAS JOURNAL D'AUDIT ───────────────────────────── */}
      <div
        className="card shadow-lg no-print"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #3b82f6 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          border: 'none',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                <ShieldCheck size={12} color="#93c5fd" /> Traçabilité &amp; Sécurité Infalsifiable
              </div>
              <h1 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Journal d'Audit &amp; Historique des Actions
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#93c5fd', fontWeight: 500 }}>
                Registre certifié et horodaté de toutes les modifications financières, pédagogiques et administratives
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleExportExcel}
              className="btn btn-sm text-white fw-bold"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
            >
              <FileSpreadsheet size={15} /> Exporter le Registre Excel
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. CARTES KPI EXÉCUTIVES HAUTE LISIBILITÉ ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(37,99,235,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Registre</span>
            <History size={18} color="#ffffff" />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Total Événements</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>2,840</h2>
          <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
            <CheckCircle2 size={14} /> 100% Horodatés ISO
          </span>
        </div>

        <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(16,185,129,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Accès</span>
            <ShieldCheck size={18} color="#ffffff" />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Sessions Utilisateurs</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>1,420</h2>
          <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
            <ArrowUpRight size={14} /> Connexions sécurisées SSL
          </span>
        </div>

        <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(139,92,246,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Sensible</span>
            <Lock size={18} color="#ffffff" />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Modifications Critiques</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>184</h2>
          <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
            <ShieldCheck size={14} /> Validation double facteur
          </span>
        </div>

        <div className="card shadow-sm card-hover" style={{ borderRadius: 14, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', padding: '1.25rem', border: 'none', boxShadow: '0 8px 20px -4px rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>Alerte</span>
            <AlertTriangle size={18} color="#ffffff" />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>Tentatives Interdites</p>
          <h2 style={{ margin: '4px 0 0', fontSize: '1.875rem', fontWeight: 900, color: '#ffffff' }}>0</h2>
          <span style={{ fontSize: '0.725rem', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.9 }}>
            <CheckCircle2 size={14} /> Aucune anomalie détectée
          </span>
        </div>
      </div>

      {/* ── 3. BARRE DE FILTRES RESPIRANTE ─────────────────────────────────── */}
      <div className="card shadow-sm p-4 no-print" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Recherche Avancée
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher utilisateur, action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: 36, height: 42, borderRadius: 10, fontSize: '0.8125rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Module Système
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="form-select"
              style={{ height: 42, borderRadius: 10, fontSize: '0.8125rem' }}
            >
              <option value="ALL">Tous les modules</option>
              <option value="FINANCE">Finance &amp; Scolarité</option>
              <option value="PEDAGOGY">Pédagogie &amp; Notes</option>
              <option value="CANTEEN">Cantine</option>
              <option value="TRANSPORT">Transport</option>
              <option value="SETTINGS">Paramètres &amp; Rôles</option>
              <option value="SYSTEM">Sécurité &amp; Système</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Année Scolaire
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="form-select"
              style={{ height: 42, borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700 }}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Niveau de Sévérité
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-select"
              style={{ height: 42, borderRadius: 10, fontSize: '0.8125rem' }}
            >
              <option value="ALL">Tous les niveaux</option>
              <option value="SUCCESS">Succès / Validé</option>
              <option value="INFO">Information</option>
              <option value="WARNING">Avertissement</option>
              <option value="DANGER">Alerte Critique</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── 4. TABLEAU DE L'HISTORIQUE D'AUDIT ───────────────────────────────── */}
      <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Date &amp; Heure</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Utilisateur</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Action Réalisée</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Module</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>IP Address</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                let badgeClass = 'bg-info-subtle text-info';
                if (log.severity === 'SUCCESS') badgeClass = 'bg-success-subtle text-success';
                if (log.severity === 'WARNING') badgeClass = 'bg-warning-subtle text-warning';
                if (log.severity === 'DANGER') badgeClass = 'bg-danger-subtle text-danger';

                return (
                  <tr key={log.id}>
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: 6 }} />
                      {log.timestamp}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{log.user}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{log.role}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{log.action}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.details}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="badge bg-light text-dark fw-bold border" style={{ borderRadius: 8 }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#475569' }}>
                      {log.ipAddress}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`badge ${badgeClass} fw-bold px-3 py-1`} style={{ borderRadius: 12 }}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
