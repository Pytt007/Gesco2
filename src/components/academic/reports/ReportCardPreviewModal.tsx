import React from 'react';
import { CompiledDocument } from '../../../services/documents/types';
import { pdfRenderer } from '../../../services/documents/pdfRenderer';
import { X, Printer, Download } from 'lucide-react';

interface ReportCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CompiledDocument | null;
}

export const ReportCardPreviewModal: React.FC<ReportCardPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!isOpen || !document) return null;

  const handlePrint = () => {
    pdfRenderer.printHtml(document.fullHtml);
  };

  const handleDownload = () => {
    pdfRenderer.downloadDocument(document);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1060,
        padding: '20px',
      }}
    >
      <div
        className="card shadow-xl"
        style={{
          width: '100%',
          maxWidth: '850px',
          height: '90vh',
          borderRadius: '12px',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h5 style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>
            Aperçu Document : {document.title}
          </h5>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-sm btn-outline-light" onClick={handlePrint}>
              <Printer size={14} style={{ marginRight: '4px' }} /> Imprimer
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleDownload}>
              <Download size={14} style={{ marginRight: '4px' }} /> Télécharger
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                marginLeft: '8px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic HTML iframe preview */}
        <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '16px' }}>
          <iframe
            title="Aperçu Bulletin"
            srcDoc={document.fullHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
