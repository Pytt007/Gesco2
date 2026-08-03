// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Document Engine Enterprise: AttendanceTemplate
// Modèle d'émargement avec en-tête/footer bleu nuit et cartes KPI SaaS en couleurs
// ─────────────────────────────────────────────────────────────────────────────

import { documentEngineEnterprise, CompiledEnterpriseDocument } from '../engine/DocumentEngine';
import { schoolIdentityService } from '../services/SchoolIdentityService';
import { createDocumentTheme } from '../theme/DocumentTheme';
import { renderDocumentTable } from '../components/DocumentTable';
import { renderSummaryCard } from '../components/SummaryCard';
import { renderSignatureBlock } from '../components/SignatureBlock';

export interface AttendanceTemplateOptions {
  title: string;
  classId: string;
  date: string;
  stats: {
    totalStudents: number;
    presentCount: number;
    justifiedCount: number;
    absentCount: number;
    presenceRate: number;
  };
  items: Array<{
    matricule: string;
    lastName: string;
    firstName: string;
    status: string;
    observation?: string;
  }>;
}

export async function generateAttendanceDocument(options: AttendanceTemplateOptions): Promise<CompiledEnterpriseDocument> {
  const schoolIdentity = await schoolIdentityService.getSchoolIdentity();
  const theme = createDocumentTheme(schoolIdentity.themePrimaryColor, schoolIdentity.themeAccentColor);

  // 1. Summary Cards en couleurs SaaS comme l'application
  const kpisHtml = `
  <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 24px;">
    ${renderSummaryCard({ title: 'Total Élèves', value: options.stats.totalStudents, variant: 'blue', theme })}
    ${renderSummaryCard({ title: 'Présents', value: options.stats.presentCount, variant: 'green', theme })}
    ${renderSummaryCard({ title: 'Absents Justifiés', value: options.stats.justifiedCount, variant: 'amber', theme })}
    ${renderSummaryCard({ title: 'Absents Non Justifiés', value: options.stats.absentCount, variant: 'red', theme })}
    ${renderSummaryCard({ title: 'Taux de Présence', value: `${options.stats.presenceRate}%`, variant: 'blue', theme })}
  </div>`;

  // 2. Data Table
  const columns = [
    { key: 'matricule', label: 'Matricule', width: '130px' },
    { key: 'name', label: 'Nom & Prénom' },
    { key: 'statusBadge', label: 'Statut', width: '160px' },
    { key: 'observation', label: 'Observation / Motif' },
  ];

  const rows = options.items.map((i) => {
    const isPresent = i.status === 'PRESENT';
    const isJustified = i.status === 'ABSENT_JUSTIFIED';
    const badgeColor = isPresent ? theme.success : isJustified ? theme.warning : theme.danger;
    const badgeText = isPresent ? '● Présent' : isJustified ? '● Absent Justifié' : '● Absent';

    return {
      matricule: `<strong style="color: ${theme.textSecondary};">${i.matricule}</strong>`,
      name: `<strong>${i.lastName}</strong> ${i.firstName}`,
      statusBadge: `<span style="font-weight: 800; color: ${badgeColor} !important;">${badgeText}</span>`,
      observation: i.observation || '—',
    };
  });

  const tableHtml = renderDocumentTable({ columns, rows, theme });

  // 3. Signature Block
  const signatureHtml = renderSignatureBlock({
    signers: [
      { role: "L'Enseignant Responsable" },
      { role: 'La Direction Pédagogique & Cachet' },
    ],
    stampUrl: schoolIdentity.stampUrl,
    theme,
  });

  const sectionsHtml = `
    ${kpisHtml}
    ${tableHtml}
    ${signatureHtml}
  `;

  return documentEngineEnterprise.compileDocument({
    documentType: 'LISTE',
    title: options.title,
    subtitle: `RAPPORT QUOTIDIEN D'ASSIDUITÉ — CLASSE DE ${options.classId.toUpperCase()}`,
    meta: {
      CLASSE: options.classId.toUpperCase(),
      DATE: options.date,
      RÉF: `PRES-${options.classId.toUpperCase()}-${options.date}`,
    },
    data: options,
    sectionsHtml,
  });
}
