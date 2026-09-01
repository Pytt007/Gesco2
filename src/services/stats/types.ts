/**
 * GESCO — Types pour le service de calculs statistiques
 */

export interface ClassStatisticsResult {
  average: number;
  min: number;
  max: number;
  median: number;
  passRate: number;
  totalStudents: number;
  passedCount: number;
  failedCount: number;
}

export interface GenderDistributionResult {
  girls: number;
  boys: number;
  total: number;
  girlRatio: number; // En pourcentage (ex: 52.5)
  boyRatio: number;  // En pourcentage (ex: 47.5)
}

export interface FinancialKPIResult {
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  recoveryRate: number; // En pourcentage (ex: 85.0)
}
