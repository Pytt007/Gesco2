import {
  StudentFinancialEnrollment,
  FinancialKPIs,
  FinancialTrackingFilter,
  FinancialAlertItem,
  TuitionPaymentRecord,
} from './types';
import { PAYMENT_MODE_LABELS } from './tuitionPaymentService';
import { qrCodeService } from '../documents/qrCodeService';

export const financialTrackingService = {
  /**
   * Calcule automatiquement les 7 KPIs majeurs et le taux de recouvrement
   */
  calculateKPIs(enrollments: StudentFinancialEnrollment[]): FinancialKPIs {
    const totalStudents = enrollments.length;
    let paidStudents = 0;
    let partialStudents = 0;
    let unpaidStudents = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let totalNetDue = 0;

    for (const e of enrollments) {
      totalNetDue += e.netTotalDue;
      totalCollected += e.totalPaid;
      totalRemaining += e.remainingBalance;

      if (e.remainingBalance <= 0) {
        paidStudents++;
      } else if (e.totalPaid > 0) {
        partialStudents++;
      } else {
        unpaidStudents++;
      }
    }

    const recoveryRate = totalNetDue > 0 ? Math.round((totalCollected / totalNetDue) * 100 * 10) / 10 : 0;

    return {
      totalStudents,
      paidStudents,
      partialStudents,
      unpaidStudents,
      totalCollected,
      totalRemaining,
      totalNetDue,
      recoveryRate,
    };
  },

  /**
   * Applique les filtres multicritères sur la liste des dossiers financiers
   */
  filterEnrollments(
    enrollments: StudentFinancialEnrollment[],
    filters: FinancialTrackingFilter
  ): StudentFinancialEnrollment[] {
    return enrollments.filter((e) => {
      // 1. Recherche texte (Nom, Prénom, Matricule, Responsable payeur)
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchesName = e.studentName.toLowerCase().includes(q);
        const matchesMatricule = e.matricule.toLowerCase().includes(q);
        const matchesSponsor = e.parentSponsor ? e.parentSponsor.toLowerCase().includes(q) : false;
        const matchesClass = e.className.toLowerCase().includes(q);
        if (!matchesName && !matchesMatricule && !matchesSponsor && !matchesClass) {
          return false;
        }
      }

      // 2. Filtre par classe
      if (filters.classroomId && e.classroomId !== filters.classroomId) {
        return false;
      }

      // 3. Filtre par niveau
      if (filters.levelCode && filters.levelCode !== 'ALL' && e.levelCode !== filters.levelCode) {
        return false;
      }

      // 4. Filtre par statut
      if (filters.status && filters.status !== 'ALL') {
        if (filters.status === 'PAID' && e.remainingBalance > 0) return false;
        if (filters.status === 'PARTIAL' && (e.totalPaid === 0 || e.remainingBalance <= 0)) return false;
        if (filters.status === 'UNPAID' && e.totalPaid > 0) return false;
      }

      return true;
    });
  },

  /**
   * Détecte automatiquement les alertes (échéances dépassées et soldes restants élevés)
   */
  detectAlerts(enrollments: StudentFinancialEnrollment[]): FinancialAlertItem[] {
    const alerts: FinancialAlertItem[] = [];

    for (const e of enrollments) {
      if (e.status === 'ARCHIVED') continue;

      // 1. Détection des montants élevés restant dus (>= 200 000 FCFA)
      if (e.remainingBalance >= 200000) {
        alerts.push({
          type: 'HIGH_BALANCE',
          studentId: e.studentId,
          studentName: e.studentName,
          className: e.className,
          amount: e.remainingBalance,
          message: `Solde impayé très élevé : ${e.remainingBalance.toLocaleString('fr-FR')} FCFA`,
        });
      }

      // 2. Détection des échéances impayées
      const pendingInsts = e.installments.filter((i) => i.status !== 'PAID');
      if (pendingInsts.length > 0) {
        alerts.push({
          type: 'OVERDUE_INSTALLMENT',
          studentId: e.studentId,
          studentName: e.studentName,
          className: e.className,
          amount: pendingInsts.reduce((sum, i) => sum + (i.amountDue - i.amountPaid), 0),
          message: `${pendingInsts.length} échéance(s) en retard sur le calendrier standard`,
        });
      }
    }

    return alerts;
  },

  /**
   * Génère un fichier CSV / Excel à télécharger pour l'exportation
   */
  exportToCSV(enrollments: StudentFinancialEnrollment[], fileName: string = 'Suivi_Financier_GESCO.csv'): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const headers = [
      'Matricule',
      'Nom & Prénom',
      'Classe',
      'Responsable Payeur',
      'Frais Annuel Brut (FCFA)',
      'Remise (FCFA)',
      'Total Net Dû (FCFA)',
      'Montant Payé (FCFA)',
      'Reste à Payer (FCFA)',
      'Progression (%)',
      'Statut',
    ];

    const rows = enrollments.map((e) => {
      const progress = Math.min(100, Math.round((e.totalPaid / (e.netTotalDue || 1)) * 100));
      const statusLabel = e.remainingBalance <= 0 ? 'Soldé' : e.totalPaid > 0 ? 'Paiement partiel' : 'Impayé';

      return [
        `"${e.matricule}"`,
        `"${e.studentName}"`,
        `"${e.className}"`,
        `"${e.parentSponsor || 'N/A'}"`,
        e.totalAnnualFee,
        e.discountAmount,
        e.netTotalDue,
        e.totalPaid,
        e.remainingBalance,
        `${progress}%`,
        `"${statusLabel}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Génère le HTML d'un Relevé de Compte Financier d'Élève
   */
  generateFinancialStatementHtml(
    enrollment: StudentFinancialEnrollment,
    payments: TuitionPaymentRecord[]
  ): string {
    const progress = Math.min(100, Math.round((enrollment.totalPaid / (enrollment.netTotalDue || 1)) * 100));
    const statusLabel = enrollment.remainingBalance <= 0 ? 'SOLDÉ' : enrollment.totalPaid > 0 ? 'PARTIEL' : 'IMPAYÉ';

    const checksum = qrCodeService.generateChecksum(`STATEMENT|${enrollment.matricule}|${enrollment.remainingBalance}`);
    const qrCodeUrl = qrCodeService.generateQRCodeDataUrl({
      documentId: enrollment.matricule,
      checksum,
      date: new Date().toISOString().split('T')[0],
      schoolName: 'Établissement GESCO',
      documentType: 'REPORT',
      verified: true,
    });

    const paymentRowsHtml = payments.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding:12px; color:#64748b;">Aucun versement enregistré à ce jour.</td></tr>`
      : payments
          .map(
            (p) => `
        <tr style="opacity: ${p.status === 'CANCELLED' ? 0.5 : 1};">
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${p.receiptNumber}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${p.paymentDate}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold; color:#16a34a;">${p.amount.toLocaleString('fr-FR')} FCFA</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${PAYMENT_MODE_LABELS[p.paymentMode]}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${p.status === 'VALIDATED' ? 'Validé' : 'Annulé'}</td>
        </tr>
      `
          )
          .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Relevé Financier ${enrollment.matricule}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0; }
          .grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9rem; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; flex: 1; margin: 0 4px; text-align: center; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.875rem; }
          .table th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin:0;">ÉTABLISSEMENT GESCO</h2>
          <div class="title">RELEVÉ HISTORIQUE DES RÈGLEMENTS DE SCOLARITÉ</div>
          <span style="font-size:0.875rem; color:#64748b;">Année Scolaire ${enrollment.academicYearId || ''}</span>
        </div>

        <div style="margin-bottom:16px;">
          <p style="margin:2px 0;"><strong>Élève :</strong> ${enrollment.studentName} (Matricule: ${enrollment.matricule})</p>
          <p style="margin:2px 0;"><strong>Classe :</strong> ${enrollment.className} | <strong>Responsable :</strong> ${enrollment.parentSponsor || 'Parent'}</p>
        </div>

        <div class="grid">
          <div class="box">
            <span style="font-size:0.75rem; color:#64748b;">Montant Total Dû</span>
            <div style="font-size:1.1rem; font-weight:800; color:#0f172a;">${enrollment.netTotalDue.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div class="box" style="background:#f0fdf4; border-color:#22c55e;">
            <span style="font-size:0.75rem; color:#166534;">Montant Payé</span>
            <div style="font-size:1.1rem; font-weight:800; color:#15803d;">${enrollment.totalPaid.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div class="box" style="background:#fef2f2; border-color:#ef4444;">
            <span style="font-size:0.75rem; color:#991b1b;">Reste à Payer</span>
            <div style="font-size:1.1rem; font-weight:800; color:#dc2626;">${enrollment.remainingBalance.toLocaleString('fr-FR')} FCFA</div>
          </div>
        </div>

        <h4>Historique des Règlements</h4>
        <table class="table">
          <thead>
            <tr>
              <th>N° Reçu</th>
              <th>Date</th>
              <th style="text-align:right;">Montant</th>
              <th>Mode</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <span style="font-size:0.75rem; color:#64748b;">Statut global du dossier : <strong>${statusLabel} (${progress}%)</strong></span>
            <span style="font-size:0.75rem; color:#94a3b8; display:block;">Piste d'authentification : ${checksum}</span>
          </div>
          <img src="${qrCodeUrl}" width="70" height="70" alt="Authenticité GESCO" />
        </div>
      </body>
      </html>
    `;
  },
};
