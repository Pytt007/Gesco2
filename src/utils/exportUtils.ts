// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Utilitaires d'Exportation (Vrais Téléchargements de Fichiers)
// Remplace les appels à window.print() par des téléchargements réels Excel/CSV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Télécharge un tableau de données au format CSV.
 * @param data - Tableau de lignes (chaque ligne est un tableau de valeurs)
 * @param headers - En-têtes des colonnes
 * @param filename - Nom du fichier (sans extension)
 */
export function downloadCSV(
  data: (string | number | null | undefined)[][],
  headers: string[],
  filename: string
) {
  const BOM = '\uFEFF'; // BOM UTF-8 pour compatibilité Excel
  const csvContent = [
    headers.join(';'),
    ...data.map((row) =>
      row.map((cell) => {
        const value = cell === null || cell === undefined ? '' : String(cell);
        // Échapper les guillemets et entourer les champs contenant ; ou des sauts de ligne
        return value.includes(';') || value.includes('\n') || value.includes('"')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(';')
    ),
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Télécharge un tableau de données au format Excel (.xlsx) via la librairie @e965/xlsx.
 * @param sheetData - Tableau d'objets (une ligne = un objet)
 * @param sheetName - Nom de l'onglet Excel
 * @param filename - Nom du fichier (sans extension)
 */
export async function downloadExcel(
  sheetData: Record<string, string | number | null | undefined>[],
  sheetName: string,
  filename: string
) {
  try {
    // Importation dynamique (code splitting — chargé seulement quand nécessaire)
    const XLSX = await import('@e965/xlsx');

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Styles de colonnes (largeur auto)
    const colWidths = Object.keys(sheetData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...sheetData.map((row) => String(row[key] ?? '').length)) + 2,
    }));
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, `${filename}.xlsx`);
  } catch (err) {
    console.error('[downloadExcel] Erreur lors de la génération Excel:', err);
    // Fallback vers CSV en cas d'erreur
    const headers = Object.keys(sheetData[0] || {});
    const rows = sheetData.map((row) => headers.map((h) => row[h]));
    downloadCSV(rows, headers, filename);
  }
}

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Libérer la mémoire après le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions d'exportation spécialisées par module
// ─────────────────────────────────────────────────────────────────────────────

export function exportStudentsToExcel(students: any[], schoolYear: string) {
  const data = students.map((s) => ({
    'Matricule': s.matricule || '',
    'Nom': s.lastName || '',
    'Prénom': s.firstName || '',
    'Classe': s.grade || '',
    'Statut': s.status || '',
    'Statut Frais': s.feesStatus || '',
    'Présence (%)': s.attendance ?? '',
    'Parent': s.parentName || '',
    'Téléphone Parent': s.parentPhone || '',
    'Adresse': s.address || '',
    'Année Scolaire': schoolYear,
  }));
  downloadExcel(data, 'Élèves', `GESCO_Eleves_${schoolYear}`);
}

export function exportFeesToExcel(fees: any[], schoolYear: string) {
  const data = fees.map((f) => ({
    'Élève': f.studentName || '',
    'Classe': f.class || '',
    'Inscription (CFA)': f.registration ?? 0,
    'Scolarité Initiale (CFA)': f.initialTuition ?? 0,
    'Total Payé (CFA)': f.totalPaid ?? 0,
    'Restant Global (CFA)': f.remainingGlobal ?? 0,
    'Remise (%)': f.discount ?? 0,
    'Année Scolaire': schoolYear,
  }));
  downloadExcel(data, 'Scolarité', `GESCO_Scolarite_${schoolYear}`);
}

export function exportExpensesToExcel(expenses: any[], schoolYear: string) {
  const data = expenses.map((e) => ({
    'Date': e.date || '',
    'Description': e.description || '',
    'Catégorie': e.category || '',
    'Montant (CFA)': e.amount ?? 0,
    'Mode de Paiement': e.paymentMethod || '',
    'Année Scolaire': schoolYear,
  }));
  downloadExcel(data, 'Dépenses', `GESCO_Depenses_${schoolYear}`);
}

export function exportTransportToExcel(subscriptions: any[], schoolYear: string) {
  const data = subscriptions.map((s) => ({
    'Élève': s.studentName || '',
    'Classe': s.class || '',
    'Ligne de Bus': s.routeId || '',
    'Total Net (CFA)': s.netTotal ?? 0,
    'Total Payé (CFA)': s.totalPaid ?? 0,
    'Restant (CFA)': s.remaining ?? 0,
    'Statut': s.status || '',
    'Cantine': s.isCanteenSubscribed ? 'Oui' : 'Non',
    'Année Scolaire': schoolYear,
  }));
  downloadExcel(data, 'Transport', `GESCO_Transport_${schoolYear}`);
}
