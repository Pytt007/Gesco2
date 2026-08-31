/**
 * GESCO — Script de Restauration de Base de Données
 * Restaure une sauvegarde JSON / JSON.GZ générée par backup_supabase.cjs.
 * Usage : node scripts/restore_backup.cjs <chemin_du_fichier_backup>
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createClient } = require('@supabase/supabase-js');

// Charger les variables d'environnement si présentes dans .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      const value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[GESCO Restore Error] Identifiants Supabase introuvables.');
  process.exit(1);
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('[GESCO Restore Usage] Précisez le fichier de backup. Exemple :');
  console.error('  node scripts/restore_backup.cjs backups/backup_2026-08-31T18-00-00.json');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), targetFile);
if (!fs.existsSync(filePath)) {
  console.error(`[GESCO Restore Error] Fichier introuvable : ${filePath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRestore() {
  console.log(`[GESCO Restore] Lecture du fichier de sauvegarde : ${filePath}...`);
  let content;
  if (filePath.endsWith('.gz')) {
    const compressed = fs.readFileSync(filePath);
    content = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
  } else {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  if (!content.tables) {
    throw new Error('Format de fichier de sauvegarde invalide (clé "tables" manquante).');
  }

  console.log(`[GESCO Restore] Sauvegarde datée du : ${content.timestamp}`);
  const tableNames = Object.keys(content.tables);

  for (const table of tableNames) {
    const tableInfo = content.tables[table];
    if (tableInfo.data && Array.isArray(tableInfo.data) && tableInfo.data.length > 0) {
      console.log(`  Restauration de la table "${table}" (${tableInfo.data.length} lignes)...`);
      try {
        const { error } = await supabase.from(table).upsert(tableInfo.data);
        if (error) {
          console.warn(`    ⚠️ Erreur sur "${table}":`, error.message);
        } else {
          console.log(`    ✓ Table "${table}" restaurée avec succès.`);
        }
      } catch (e) {
        console.warn(`    ⚠️ Exception sur "${table}":`, e.message);
      }
    }
  }

  console.log('[GESCO Restore Succès] Opération de restauration terminée.');
}

runRestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[GESCO Restore Fatal]:', err);
    process.exit(1);
  });
