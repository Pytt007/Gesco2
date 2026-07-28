import React from 'react';
import { IncompleteStudentInfo } from '../../../services/academic/reports/types';
import { AlertTriangle, X, UserX } from 'lucide-react';

interface IncompleteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: IncompleteStudentInfo[];
}

export const IncompleteStudentsModal: React.FC<IncompleteStudentsModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
    >
      <div
        className="card shadow-lg"
        style={{
          width: '100%',
          maxWidth: '650px',
          borderRadius: '12px',
          border: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fff1f2',
            borderBottom: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#e11d48" />
            <h5 style={{ margin: 0, fontWeight: 700, color: '#9f1239', fontSize: '1.1rem' }}>
              Résultats Incomplets ({students.length} élève{students.length > 1 ? 's' : ''})
            </h5>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9f1239',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#475569' }}>
            Les élèves ci-dessous possèdent des notes ou appréciations manquantes qui empêchent la génération finale des bulletins :
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {students.map((st) => (
              <div
                key={st.studentId}
                style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <UserX size={18} color="#94a3b8" style={{ marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>
                    {st.studentName} <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 400 }}>({st.matricule})</span>
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {st.reasonLabels.map((lbl, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#ffe4e6',
                          color: '#be123c',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        • {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'right',
          }}
        >
          <button className="btn btn-secondary text-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
