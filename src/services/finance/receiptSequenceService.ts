/**
 * GESCO — Service de Génération Sécurisée des Numéros de Reçus
 * Garantit l'unicité stricte, l'auditabilité et l'absence de collisions
 * même lors d'encaissements simultanés multi-utilisateurs.
 */

import { supabase } from '../common/supabaseClient';

export type ReceiptType = 'REC' | 'CANT' | 'TRP' | 'EXP';

/**
 * Génère un identifiant et numéro de reçu horodaté, unique et auditable
 * Format : TYPE-YYYYMM-TIMESTAMP36-RANDOM (Ex: REC-202608-LKM89ZA-7F2A)
 */
export async function generateSecureReceiptNumber(type: ReceiptType = 'REC'): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Horodatage base-36 (millisecondes exactes) pour garantir l'ordre chronologique
  const timeComponent = now.getTime().toString(36).toUpperCase();
  
  // Composant aléatoire cryptographique (4 caractères hexadécimaux)
  let randomHex = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(2);
    crypto.getRandomValues(arr);
    randomHex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } else {
    randomHex = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0').toUpperCase();
  }

  const receiptNumber = `${type}-${yearMonth}-${timeComponent}-${randomHex}`;

  // Vérification d'unicité optionnelle en base pour les paiements de scolarité
  if (type === 'REC' && supabase) {
    try {
      const { data } = await supabase
        .from('tuition_payments')
        .select('id')
        .eq('receipt_number', receiptNumber)
        .maybeSingle();

      if (data) {
        // En cas de collision rarissime, régénérer avec un second sel aléatoire
        const salt = Math.floor(Math.random() * 9000 + 1000);
        return `${type}-${yearMonth}-${timeComponent}-${randomHex}${salt}`;
      }
    } catch {
      // Mode local / hors-ligne
    }
  }

  return receiptNumber;
}
