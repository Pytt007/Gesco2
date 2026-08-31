/**
 * GESCO — Script de Sauvegarde Automatisée de Base de Données
 * Exporte un instantané complet de toutes les tables critiques de Supabase.
 * Usage : node scripts/backup_supabase.cjs
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const zlib = require('zlib');

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
  console.error('[GESCO Backup Error] Identifiants Supabase introuvables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_BACKUP = [
  'school_settings',
  'students',
  'staff_members',
  'parents',
  'classes',
  'classrooms',
  'tuition_payments',
  'expense_categories',
  'expenses',
  'attendance',
  'grades',
  'assessment_sessions',
  'bulletins',
  'transport_lines',
  'canteen_enrollments'
];

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[GESCO Backup] Démarrage de la sauvegarde : ${timestamp}...`);
  const backupData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    school: 'Groupe Scolaire Les Schtroumpfs',
    tables: {},
  };

  for (const table of TABLES_TO_BACKUP) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5000);
      if (error) {
        console.warn(`[GESCO Backup Warning] Table "${table}" non accessible ou inexistante:`, error.message);
        backupData.tables[table] = { error: error.message, count: 0, data: [] };
      } else {
        backupData.tables[table] = { count: (data || []).length, data: data || [] };
        console.log(`  ✓ Table "${table}" exportée (${(data || []).length} enregistrements)`);
      }
    } catch (e) {
      console.warn(`[GESCO Backup Warning] Erreur sur la table "${table}":`, e.message);
    }
  }

  const jsonStr = JSON.stringify(backupData, null, 2);
  const jsonPath = path.join(backupDir, `backup_${timestamp}.json`);
  const gzPath = path.join(backupDir, `backup_${timestamp}.json.gz`);

  // Sauvegarde compressée gzip pour économiser l'espace
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
  fs.writeFileSync(gzPath, compressed);
  fs.writeFileSync(jsonPath, jsonStr, 'utf8');

  console.log(`[GESCO Backup Succès] Archive créée : ${gzPath} (${(compressed.length / 1024).toFixed(1)} Ko)`);

  // Nettoyage des anciennes sauvegardes (> 30 jours)
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000;

  files.forEach((file) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`  🗑️ Ancienne sauvegarde supprimée : ${file}`);
    }
  });

  return gzPath;
}

runBackup()
  .then(() => {
    console.log('[GESCO Backup] Terminé avec succès.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[GESCO Backup Fatal]:', err);
    process.exit(1);
  });
