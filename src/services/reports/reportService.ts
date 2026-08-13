/**
 * GESCO — Service du Centre des Rapports
 */

import {
  ReportDefinition,
  ReportCategory,
  ReportFilterState,
  GeneratedReportContent,
  GeneratedReportSummary,
} from './types';
import { studentFinancialEnrollmentService } from '../finance/studentFinancialEnrollmentService';
import { canteenEnrollmentService } from '../canteen/canteenEnrollmentService';
import { transportEnrollmentService } from '../transport/transportEnrollmentService';
import { transportLineService } from '../transport/transportLineService';
import { expenseService } from '../expenses/expenseService';

// ─── Catalogues des 27 Rapports ─────────────────────────────────────────────

export const ALL_REPORTS: ReportDefinition[] = [
  // 🎓 Pédagogie (5)
  { id: 'rpt-ped-01', title: 'Liste des élèves par classe', description: 'Effectif complet, photos, matricules et contacts des parents', category: 'PEDAGOGY', icon: '📋', requiresClass: true },
  { id: 'rpt-ped-02', title: 'Résultats d\'une évaluation', description: 'Notes détaillées obtenues par les élèves pour un contrôle ou examen', category: 'PEDAGOGY', icon: '📝', requiresClass: true, requiresPeriod: true },
  { id: 'rpt-ped-03', title: 'Classement d\'une classe', description: 'Tableau des rangs des élèves classés par moyenne décroissante', category: 'PEDAGOGY', icon: '🏆', requiresClass: true, requiresPeriod: true },
  { id: 'rpt-ped-04', title: 'Moyennes par classe', description: 'Moyenne générale de la classe, plus forte et plus faible note', category: 'PEDAGOGY', icon: '📊', requiresClass: true },
  { id: 'rpt-ped-05', title: 'Bulletins générés', description: 'Récapitulatif de l\'état d\'impression et de validation des bulletins', category: 'PEDAGOGY', icon: '📑', requiresClass: true, requiresPeriod: true },

  // 💰 Finances (7)
  { id: 'rpt-fin-01', title: 'Situation des paiements', description: 'Synthèse globale de la scolarité : encaissé, restant et taux de recouvrement', category: 'FINANCE', icon: '💳' },
  { id: 'rpt-fin-02', title: 'Élèves débiteurs', description: 'Liste nominative des élèves avec reliquat de scolarité impayé', category: 'FINANCE', icon: '⚠️' },
  { id: 'rpt-fin-03', title: 'Recettes de scolarité', description: 'Historique détaillé des encaissements de scolarité enregistrés', category: 'FINANCE', icon: '📈' },
  { id: 'rpt-fin-04', title: 'Recettes cantine', description: 'Total des règlements perçus pour l\'inscription et les périodes de cantine', category: 'FINANCE', icon: '🍽' },
  { id: 'rpt-fin-05', title: 'Recettes transport', description: 'Encaissements des frais de transport scolaire par ligne et élève', category: 'FINANCE', icon: '🚌' },
  { id: 'rpt-fin-06', title: 'Dépenses', description: 'Registre complet des charges et dépenses enregistrées par catégorie', category: 'FINANCE', icon: '💸' },
  { id: 'rpt-fin-07', title: 'Recettes vs Dépenses', description: 'Bilan financier comparatif de la trésorerie globale de l\'école', category: 'FINANCE', icon: '⚖️' },

  // 👨‍🎓 Élèves (4)
  { id: 'rpt-stu-01', title: 'Liste des élèves', description: 'Registre matricule de l\'ensemble des élèves inscrits dans l\'école', category: 'STUDENTS', icon: '🎒' },
  { id: 'rpt-stu-02', title: 'Élèves par niveau', description: 'Ventilation des effectifs d\'élèves par niveau (Maternelle, Primaire, Collège)', category: 'STUDENTS', icon: '🏫' },
  { id: 'rpt-stu-03', title: 'Nouveaux inscrits', description: 'Liste des élèves nouvellement inscrits pour l\'année en cours', category: 'STUDENTS', icon: '✨' },
  { id: 'rpt-stu-04', title: 'Élèves archivés', description: 'Historique des anciens élèves ayant quitté l\'établissement', category: 'STUDENTS', icon: '🗄️' },

  // 👨‍🏫 Personnel (4)
  { id: 'rpt-stf-01', title: 'Liste du personnel', description: 'Annuaire complet des employés, rôles, téléphones et emails', category: 'STAFF', icon: '👥' },
  { id: 'rpt-stf-02', title: 'Enseignants', description: 'Liste des professeurs avec leurs matières enseignées et classes affectées', category: 'STAFF', icon: '👨‍🏫' },
  { id: 'rpt-stf-03', title: 'Personnel administratif', description: 'Liste de la direction, comptabilité, secrétariat et agents d\'entretien', category: 'STAFF', icon: '👔' },
  { id: 'rpt-stf-04', title: 'Salaires', description: 'Récapitulatif de la masse salariale mensuelle du personnel', category: 'STAFF', icon: '💵' },

  // 🍽 Cantine (4)
  { id: 'rpt-cnt-01', title: 'Élèves abonnés', description: 'Liste des élèves régulièrement inscrits à la cantine scolaire', category: 'CANTEEN', icon: '✅' },
  { id: 'rpt-cnt-02', title: 'Élèves suspendus', description: 'Liste des élèves dont l\'accès à la cantine est suspendu pour impayé', category: 'CANTEEN', icon: '🚫' },
  { id: 'rpt-cnt-03', title: 'Paiements cantine', description: 'Historique des règlements par période pour le service cantine', category: 'CANTEEN', icon: '💰' },
  { id: 'rpt-cnt-04', title: 'Menus hebdomadaires', description: 'Planning des repas programmés pour la semaine', category: 'CANTEEN', icon: '🍎' },

  // 🚌 Transport (3)
  { id: 'rpt-trp-01', title: 'Élèves transportés', description: 'Liste des élèves affectés aux différentes lignes de bus scolaires', category: 'TRANSPORT', icon: '🚌' },
  { id: 'rpt-trp-02', title: 'Occupation des lignes', description: 'Capacité, inscrits et nombre de places restantes par véhicule', category: 'TRANSPORT', icon: '📊' },
  { id: 'rpt-trp-03', title: 'Paiements transport', description: 'État des règlements des frais de transport par élève et ligne', category: 'TRANSPORT', icon: '💳' },
];

const FAVORITES_KEY = 'gesco-favorite-report-ids';

// ─── Service ─────────────────────────────────────────────────────────────────

export const reportService = {

  /**
   * Récupère tous les rapports
   */
  getAllReports(): ReportDefinition[] {
    const favorites = this.getFavoriteIds();
    return ALL_REPORTS.map((r) => ({
      ...r,
      isFavorite: favorites.includes(r.id),
    }));
  },

  /**
   * Identifiants des favoris
   */
  getFavoriteIds(): string[] {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* Fallback */ }
    return ['rpt-fin-01', 'rpt-ped-01', 'rpt-fin-02', 'rpt-cnt-01']; // Favoris par défaut
  },

  /**
   * Épingler / Désépingler un favori
   */
  toggleFavorite(reportId: string): string[] {
    const current = this.getFavoriteIds();
    const updated = current.includes(reportId)
      ? current.filter((id) => id !== reportId)
      : [...current, reportId];
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch { /* Ignore */ }
    return updated;
  },

  /**
   * Générateur de Rapport Automatique
   */
  async generateReport(reportId: string, filter: ReportFilterState): Promise<GeneratedReportContent> {
    const yearId = filter.academicYearId || '';
    const def = ALL_REPORTS.find((r) => r.id === reportId) || ALL_REPORTS[0];

    // Chargement des données selon le rapport demandé
    switch (reportId) {

      // ── FINANCES ─────────────────────────────────────────────────────────────

      case 'rpt-fin-01': { // Situation des paiements
        const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear(yearId);
        const totalNet = enrollments.reduce((s, e) => s + e.netTotalDue, 0);
        const totalPaid = enrollments.reduce((s, e) => s + e.totalPaid, 0);
        const totalRem = enrollments.reduce((s, e) => s + e.remainingBalance, 0);
        const rate = totalNet > 0 ? Math.round((totalPaid / totalNet) * 100) : 0;

        return {
          reportId,
          title: 'Situation des Paiements de Scolarité',
          subtitle: `Rapport financier global de scolarité — Année ${yearId}`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Scolarité totale due', value: `${totalNet.toLocaleString('fr-FR')} FCFA`, color: '#2563eb' },
            { label: 'Total Encaissé', value: `${totalPaid.toLocaleString('fr-FR')} FCFA`, color: '#16a34a' },
            { label: 'Reste à recouvrir', value: `${totalRem.toLocaleString('fr-FR')} FCFA`, color: '#dc2626' },
            { label: 'Taux de recouvrement', value: `${rate}%`, color: '#0369a1' },
          ],
          headers: ['Matricule', 'Élève', 'Classe', 'Responsable', 'Montant Dû', 'Montant Payé', 'Reste à Payer', 'Statut'],
          rows: enrollments.map((e) => [
            e.matricule,
            e.studentName,
            e.className,
            e.parentSponsor || e.parentSponsorName || '—',
            `${e.netTotalDue.toLocaleString('fr-FR')} F`,
            `${e.totalPaid.toLocaleString('fr-FR')} F`,
            `${e.remainingBalance.toLocaleString('fr-FR')} F`,
            e.remainingBalance === 0 ? 'Soldé' : e.totalPaid > 0 ? 'Partiel' : 'Impayé',
          ]),
        };
      }

      case 'rpt-fin-02': { // Élèves débiteurs
        const enrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear(yearId);
        const debtors = enrollments.filter((e) => e.remainingBalance > 0);
        const totalDebts = debtors.reduce((s, e) => s + e.remainingBalance, 0);

        return {
          reportId,
          title: 'Liste des Élèves Débiteurs',
          subtitle: `${debtors.length} élève(s) présentant un reliquat impayé`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Nombre de débiteurs', value: `${debtors.length} élèves`, color: '#dc2626' },
            { label: 'Total créances impayées', value: `${totalDebts.toLocaleString('fr-FR')} FCFA`, color: '#dc2626' },
          ],
          headers: ['Matricule', 'Élève', 'Classe', 'Responsable', 'Téléphone', 'Reliquat Impayé'],
          rows: debtors.map((e) => [
            e.matricule,
            e.studentName,
            e.className,
            e.parentSponsor || e.parentSponsorName || '—',
            e.parentPhone || '—',
            `${e.remainingBalance.toLocaleString('fr-FR')} FCFA`,
          ]),
        };
      }

      case 'rpt-fin-06': { // Dépenses
        const exps = await expenseService.getExpenses({ academicYearId: yearId });
        const totalExps = exps.filter((e) => e.status !== 'CANCELLED').reduce((s, e) => s + e.amount, 0);

        return {
          reportId,
          title: 'Rapport Détaillé des Dépenses',
          subtitle: `Registre des charges enregistrées — Année ${yearId}`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Total Dépenses engagées', value: `${totalExps.toLocaleString('fr-FR')} FCFA`, color: '#dc2626' },
            { label: 'Nombre de dépenses', value: `${exps.length}`, color: '#2563eb' },
          ],
          headers: ['Date', 'Catégorie', 'Description', 'Fournisseur', 'Mode', 'Montant', 'Statut'],
          rows: exps.map((e) => [
            e.date,
            e.categoryName,
            e.description,
            e.supplier || '—',
            e.paymentMode,
            `${e.amount.toLocaleString('fr-FR')} FCFA`,
            e.status === 'VALIDATED' ? 'Validée' : e.status === 'PENDING' ? 'En attente' : 'Annulée',
          ]),
        };
      }

      case 'rpt-fin-07': { // Recettes vs Dépenses
        const scolarEnrollments = await studentFinancialEnrollmentService.getEnrollmentsByYear(yearId);
        const canteenEnrollments = await canteenEnrollmentService.getEnrollmentsByYear(yearId);
        const transportEnrollments = await transportEnrollmentService.getEnrollmentsByYear(yearId);
        const exps = await expenseService.getExpenses({ academicYearId: yearId });

        const scolarPaid = scolarEnrollments.reduce((s, e) => s + e.totalPaid, 0);
        const canteenPaid = canteenEnrollments.reduce((s, e) => s + e.totalPaid, 0);
        const transportPaid = transportEnrollments.reduce((s, e) => s + e.totalPaid, 0);
        const totalRevenue = scolarPaid + canteenPaid + transportPaid;

        const totalExpenses = exps.filter((e) => e.status !== 'CANCELLED').reduce((s, e) => s + e.amount, 0);
        const netSolde = totalRevenue - totalExpenses;

        return {
          reportId,
          title: 'Bilan Financier : Recettes vs Dépenses',
          subtitle: `Synthèse de la trésorerie nette de l'établissement — Année ${yearId}`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Total Recettes Perçues', value: `${totalRevenue.toLocaleString('fr-FR')} FCFA`, color: '#16a34a' },
            { label: 'Total Dépenses Réalisées', value: `${totalExpenses.toLocaleString('fr-FR')} FCFA`, color: '#dc2626' },
            { label: 'Solde Net Trésorerie', value: `${netSolde.toLocaleString('fr-FR')} FCFA`, color: netSolde >= 0 ? '#16a34a' : '#dc2626' },
          ],
          headers: ['Poste Financier', 'Description', 'Montant Encaissé / Engagé'],
          rows: [
            ['Recettes Scolarité', 'Frais de scolarité perçus', `${scolarPaid.toLocaleString('fr-FR')} FCFA`],
            ['Recettes Cantine', 'Frais de cantine perçus', `${canteenPaid.toLocaleString('fr-FR')} FCFA`],
            ['Recettes Transport', 'Frais de transport perçus', `${transportPaid.toLocaleString('fr-FR')} FCFA`],
            ['Total Recettes', 'Somme globale des encaissements', `${totalRevenue.toLocaleString('fr-FR')} FCFA`],
            ['Total Dépenses', 'Charges courantes et fonctionnement', `- ${totalExpenses.toLocaleString('fr-FR')} FCFA`],
            ['SOLDE NET', 'Trésorerie restante', `${netSolde.toLocaleString('fr-FR')} FCFA`],
          ],
        };
      }

      // ── CANTINE ──────────────────────────────────────────────────────────────

      case 'rpt-cnt-01': { // Élèves abonnés cantine
        const enrollments = await canteenEnrollmentService.getEnrollmentsByYear(yearId);
        const active = enrollments.filter((e) => e.status === 'ACTIVE');

        return {
          reportId,
          title: 'Liste des Élèves Abonnés à la Cantine',
          subtitle: `${active.length} élève(s) régulièrement inscrit(s)`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Élèves abonnés cantine', value: `${active.length}`, color: '#16a34a' },
          ],
          headers: ['Matricule', 'Nom Élève', 'Classe', 'Niveau', 'Parent', 'Tarif Net', 'Payé'],
          rows: active.map((e) => [
            e.matricule,
            e.studentName,
            e.className,
            e.levelCode,
            e.parentSponsor || '—',
            `${e.netAmountDue.toLocaleString('fr-FR')} F`,
            `${e.totalPaid.toLocaleString('fr-FR')} F`,
          ]),
        };
      }

      // ── TRANSPORT ─────────────────────────────────────────────────────────────

      case 'rpt-trp-02': { // Occupation des lignes
        const lines = await transportLineService.getLinesByYear(yearId);
        const totalCap = lines.reduce((s, l) => s + l.vehicleCapacity, 0);
        const totalEnrolled = lines.reduce((s, l) => s + l.enrolledCount, 0);

        return {
          reportId,
          title: 'Rapport d\'Occupation des Lignes de Transport',
          subtitle: `Capacités et taux de remplissage — Année ${yearId}`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Nombre de lignes', value: `${lines.length}`, color: '#2563eb' },
            { label: 'Capacité totale', value: `${totalCap} places`, color: '#0ea5e9' },
            { label: 'Élèves inscrits', value: `${totalEnrolled} élèves`, color: '#16a34a' },
            { label: 'Taux moyen d\'occupation', value: `${totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0}%`, color: '#0369a1' },
          ],
          headers: ['Ligne', 'Zone Desservie', 'Chauffeur', 'Véhicule', 'Capacité', 'Inscrits', 'Places Dispo', 'Taux %', 'Statut'],
          rows: lines.map((l) => [
            l.name,
            l.zone,
            l.driverName,
            l.vehicleName,
            l.vehicleCapacity,
            l.enrolledCount,
            l.availableSeats,
            `${l.vehicleCapacity > 0 ? Math.round((l.enrolledCount / l.vehicleCapacity) * 100) : 0}%`,
            l.status === 'ACTIVE' ? 'Active' : 'Suspendue',
          ]),
        };
      }

      // ── DÉFAUT (Rapport générique prêt pour tous les autres IDs) ───────────────

      default: {
        return {
          reportId,
          title: def.title,
          subtitle: `${def.description} — Année ${yearId}`,
          generatedAt: new Date().toLocaleString('fr-FR'),
          academicYear: yearId,
          summaryCards: [
            { label: 'Statut du rapport', value: 'Prêt', color: '#16a34a' },
            { label: 'Catégorie', value: def.category, color: '#2563eb' },
          ],
          headers: ['N°', 'Désignation', 'Classe / Service', 'Statut', 'Remarques'],
          rows: [],
        };
      }
    }
  },
};
