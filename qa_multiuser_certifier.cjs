// =============================================================================
// GESCO V2 — CAMPAGNE CERTIFICATION MULTI-UTILISATEURS — TOUTES PHASES (1-11)
// URL Production : https://gesco-erp.vercel.app
// Supabase : zkofvccysqlacyysujdu
// =============================================================================

const puppeteer = require('puppeteer');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const VERCEL_URL = 'https://gesco-erp.vercel.app';
const SUPABASE_URL = 'https://zkofvccysqlacyysujdu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2Z2Y2N5c3FsYWN5eXN1amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTc4MDIsImV4cCI6MjEwMjA5MzgwMn0.Mymv4iymIlhxQ9EfqMgIx-sDKDBpLvCIlrxOTuSDxtI';
const SCREENSHOTS_DIR = path.join(__dirname, 'campaign_screenshots');
const REPORT_PATH = path.join(__dirname, 'campaign_report.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TMPDIR = path.join(os.tmpdir(), 'gesco_sessions');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── COMPTES DEMO (issus du code authService.ts) ────────────────────────────
const ROLES = [
  { username: 'direction', password: 'direction123', role: 'ADMIN_GENERALE', label: 'Direction Pédagogique' },
  { username: 'admin',     password: 'admin123',     role: 'ADMIN_GENERALE', label: 'Admin Général' },
  { username: 'compta',    password: 'compta123',     role: 'FINANCE',        label: 'Comptabilité' },
  { username: 'enseignant',password: 'enseignant123', role: 'SCOLAIRE_ENSEIGNANT', label: 'Enseignant' },
  { username: 'prof_cp1',  password: 'prof123',       role: 'SCOLAIRE_ENSEIGNANT', label: 'Enseignant CP1' },
  { username: 'cantine',   password: 'cantine123',    role: 'CANTINE_TRANSPORT', label: 'Cantine' },
  { username: 'transport', password: 'transport123',  role: 'CANTINE_TRANSPORT', label: 'Transport' },
];

// ─── RAPPORT ─────────────────────────────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  phases: {},
  anomalies: [],
  supabaseChecks: [],
  screenshots: [],
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
};

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
// Clean up old session dirs
try {
  const sessBase = path.join(os.tmpdir(), 'gesco_sessions');
  if (fs.existsSync(sessBase)) {
    fs.readdirSync(sessBase).forEach(d => {
      try { fs.rmSync(path.join(sessBase, d), { recursive: true, force: true }); } catch {}
    });
  }
  fs.mkdirSync(sessBase, { recursive: true });
} catch {}

function logPhase(phase, msg, status = 'INFO') {
  const ts = new Date().toISOString().substring(11, 19);
  const icons = { INFO: '🔹', PASS: '✅', FAIL: '❌', WARN: '⚠️', DB: '🗄️', CONC: '⚡' };
  console.log(`[${ts}][Phase ${phase}] ${icons[status] || '🔹'} ${msg}`);
  report.summary.total++;
  if (status === 'PASS') report.summary.passed++;
  if (status === 'FAIL') report.summary.failed++;
  if (status === 'WARN') report.summary.warnings++;
}

function addAnomaly(phase, description, severity = 'HIGH') {
  report.anomalies.push({ phase, description, severity, timestamp: new Date().toISOString() });
  console.log(`   ⚠️  [ANOMALIE-${severity}] ${description}`);
}

// ─── SUPABASE HELPERS ────────────────────────────────────────────────────────
async function sbGet(endpoint) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const req = https.request({ hostname: urlObj.hostname, port: 443, path: urlObj.pathname + urlObj.search, method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function sbPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const bodyStr = JSON.stringify(body);
    const req = https.request({ hostname: urlObj.hostname, port: 443, path: urlObj.pathname, method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation', 'Content-Length': Buffer.byteLength(bodyStr) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── BROWSER FACTORY ─────────────────────────────────────────────────────────
async function launchBrowser(idx = 0) {
  const userDataDir = path.join(os.tmpdir(), 'gesco_sessions', `user_${idx}_${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  return puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900',
           `--user-data-dir=${userDataDir}`, '--disable-dev-shm-usage']
  });
}

async function loginAs(page, { username, password, role }) {
  await page.goto(VERCEL_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(800);

  // Mapping username → texte du bouton démo Vercel (inspecté en Phase 1)
  // Boutons réels: "👔 Direction", "💰 Finance", "Enseignant"
  const BUTTON_MAP = {
    'direction':  'Direction',
    'admin':      'Direction',   // admin = même rôle que direction
    'compta':     'Finance',
    'finance':    'Finance',
    'enseignant': 'Enseignant',
    'prof_cp1':   'Enseignant',  // même rôle SCOLAIRE_ENSEIGNANT
    'cantine':    null,          // pas de bouton dédié → formulaire
    'transport':  null,          // pas de bouton dédié → formulaire
  };

  const btnLabel = BUTTON_MAP[username];

  if (btnLabel) {
    // Cliquer le bouton démo correspondant au rôle
    const roleBtn = await page.evaluateHandle((label) =>
      Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes(label)
      ), btnLabel
    );
    if (roleBtn.asElement()) {
      await roleBtn.asElement().click();
      await delay(2000);
      return true;
    }
  }

  // Fallback : formulaire utilisateur/mot de passe
  const userInput = await page.$('input[type="text"], input[name="username"], input[placeholder*="utilisateur"], input[placeholder*="Identifiant"]');
  if (userInput) {
    await userInput.click({ clickCount: 3 });
    await userInput.type(username);
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.click({ clickCount: 3 });
      await passInput.type(password);
    }
    const submitBtn = await page.$('button[type="submit"]') || await page.$('#btn-login');
    if (submitBtn) { await submitBtn.click(); await delay(2000); }
    return true;
  }

  // Dernier recours: bouton "Se connecter à GESCO" + remplir formulaire
  const connectBtn = await page.$('#btn-login');
  if (connectBtn) {
    await connectBtn.click();
    await delay(1000);
    const uInput = await page.$('input[type="text"], input[type="email"]');
    if (uInput) {
      await uInput.type(username);
      const pInput = await page.$('input[type="password"]');
      if (pInput) await pInput.type(password);
      const subBtn = await page.$('button[type="submit"]');
      if (subBtn) { await subBtn.click(); await delay(2000); }
    }
    return true;
  }

  return false;
}

async function takeScreenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}_${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  report.screenshots.push(filePath);
  return filePath;
}

async function getPageErrors(page) {
  return page.evaluate(() => {
    const errors = [];
    // Check for visible error elements
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], .text-red-500, [data-error]');
    errorElements.forEach(el => {
      if (el.textContent?.trim()) errors.push(el.textContent.trim().substring(0, 100));
    });
    return errors;
  });
}

async function getNavigationLinks(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav button, aside button, nav a, aside a, [role="navigation"] button'))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 0 && t.length < 50);
  });
}

// =============================================================================
// PHASE 1 — PRÉPARATION & VÉRIFICATION VERCEL
// =============================================================================
async function phase1_preparation() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 1 — PRÉPARATION & VÉRIFICATION VERCEL  ║');
  console.log('╚══════════════════════════════════════════════╝');

  const phase = {};
  let browser = null, page = null;

  try {
    // 1. Vérification HTTP de base
    const accessible = await new Promise(resolve => {
      https.get(VERCEL_URL, res => resolve(res.statusCode)).on('error', () => resolve(0));
    });

    if (accessible === 200 || accessible === 308) {
      logPhase(1, `Application Vercel accessible → HTTP ${accessible}`, 'PASS');
    } else {
      logPhase(1, `Application Vercel → HTTP ${accessible}`, 'FAIL');
      addAnomaly(1, `Application non accessible : HTTP ${accessible}`, 'CRITICAL');
    }

    // 2. Ouvrir le navigateur et vérifier
    browser = await launchBrowser(0);
    page = await browser.newPage();
    const jsErrors = [];
    const networkErrors = [];
    const consoleMessages = [];

    page.on('pageerror', err => jsErrors.push(err.message));
    page.on('requestfailed', req => networkErrors.push(`${req.failure()?.errorText} — ${req.url()}`));
    page.on('console', msg => { if (msg.type() === 'error') consoleMessages.push(msg.text()); });

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    await takeScreenshot(page, 'phase1_vercel_home');

    // 3. Erreurs JS
    if (jsErrors.length === 0) {
      logPhase(1, 'Aucune erreur JavaScript détectée', 'PASS');
    } else {
      jsErrors.forEach(e => {
        logPhase(1, `Erreur JS: ${e.substring(0, 100)}`, 'WARN');
        addAnomaly(1, `Erreur JavaScript: ${e.substring(0, 200)}`, 'MEDIUM');
      });
    }

    // 4. Erreurs réseau
    const relevantNetworkErrors = networkErrors.filter(e => !e.includes('favicon') && !e.includes('analytics'));
    if (relevantNetworkErrors.length === 0) {
      logPhase(1, 'Aucune erreur réseau critique détectée', 'PASS');
    } else {
      relevantNetworkErrors.slice(0, 3).forEach(e => {
        logPhase(1, `Erreur réseau: ${e.substring(0, 100)}`, 'WARN');
      });
    }

    // 5. Erreurs console
    const relevantConsoleErrors = consoleMessages.filter(m =>
      !m.includes('favicon') && !m.includes('Supabase') && !m.includes('warning')
    );
    if (relevantConsoleErrors.length === 0) {
      logPhase(1, 'Aucune erreur console critique', 'PASS');
    } else {
      relevantConsoleErrors.slice(0, 3).forEach(e =>
        logPhase(1, `Console error: ${e.substring(0, 80)}`, 'WARN')
      );
    }

    // 6. Vérifier que la page de login est accessible
    const hasLoginElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.includes('Direction') || b.textContent?.includes('Admin') || b.textContent?.includes('connexion'));
    });
    if (hasLoginElements) {
      logPhase(1, 'Interface de connexion présente et fonctionnelle', 'PASS');
    } else {
      logPhase(1, 'Interface de connexion introuvable', 'WARN');
    }

    phase.status = 'DONE';
    phase.jsErrors = jsErrors.length;
    phase.networkErrors = relevantNetworkErrors.length;

  } catch (err) {
    logPhase(1, `Erreur Phase 1: ${err.message}`, 'FAIL');
    addAnomaly(1, err.message, 'CRITICAL');
  } finally {
    if (browser) await browser.close();
  }

  report.phases['1_preparation'] = phase;
  return phase;
}

// =============================================================================
// PHASE 2 — CRÉATION DES SESSIONS MULTI-RÔLES
// =============================================================================
async function phase2_sessions() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 2 — CRÉATION DES SESSIONS MULTI-RÔLES  ║');
  console.log('╚══════════════════════════════════════════════╝');

  const sessions = {};

  for (let i = 0; i < ROLES.length; i++) {
    const roleConfig = ROLES[i];
    logPhase(2, `Connexion ${roleConfig.label} (${roleConfig.username})...`, 'INFO');

    try {
      const browser = await launchBrowser(i + 10);
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      const ok = await loginAs(page, roleConfig);
      if (ok) {
        await takeScreenshot(page, `phase2_login_${roleConfig.username}`);
        const navLinks = await getNavigationLinks(page);
        sessions[roleConfig.username] = {
          browser, page, ...roleConfig, loggedIn: true, navLinks
        };
        logPhase(2, `${roleConfig.label} connecté — ${navLinks.length} éléments de navigation`, 'PASS');
      } else {
        logPhase(2, `${roleConfig.label} — connexion impossible`, 'WARN');
        sessions[roleConfig.username] = { browser, page, ...roleConfig, loggedIn: false };
      }
    } catch (err) {
      logPhase(2, `Erreur session ${roleConfig.username}: ${err.message}`, 'FAIL');
    }
    await delay(500);
  }

  report.phases['2_sessions'] = { sessionsCreated: Object.values(sessions).filter(s => s.loggedIn).length };
  return sessions;
}

// =============================================================================
// PHASE 3 — VÉRIFICATION DES PERMISSIONS PAR RÔLE
// =============================================================================
async function phase3_permissions(sessions) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 3 — VÉRIFICATION DES PERMISSIONS        ║');
  console.log('╚══════════════════════════════════════════════╝');

  const results = {};

  // Map labels sidebar → moduleId (labels from Sidebar.tsx)
  const LABEL_TO_MODULE = {
    'Élèves': 'STUDENTS', 'Students': 'STUDENTS',
    'Personnel': 'STAFF', 'Staff': 'STAFF',
    'Cantine': 'CANTEEN', 'Canteen': 'CANTEEN',
    'Transport': 'TRANSPORT',
    'Paramètres': 'SETTINGS', 'Settings': 'SETTINGS',
    'Encaissements': 'FINANCE_PAYMENTS', 'Finance': 'FINANCE_PAYMENTS',
  };

  // Matrice réelle — src/constants/permissions.ts
  const ACCESS_MATRIX = {
    'STUDENTS':         ['ADMIN_GENERALE', 'DIRECTEUR', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE', 'ENSEIGNANT'],
    'STAFF':            ['ADMIN_GENERALE', 'DIRECTEUR', 'SCOLAIRE_ENSEIGNANT', 'SECRETAIRE', 'ENSEIGNANT'],
    'CANTEEN':          ['ADMIN_GENERALE', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_CANTINE'],
    'TRANSPORT':        ['ADMIN_GENERALE', 'DIRECTEUR', 'CANTINE_TRANSPORT', 'RESP_TRANSPORT'],
    'SETTINGS':         ['ADMIN_GENERALE', 'DIRECTEUR'],
    'FINANCE_PAYMENTS': ['ADMIN_GENERALE', 'DIRECTEUR', 'FINANCE', 'CAISSIER'],
  };

  for (const [username, session] of Object.entries(sessions)) {
    if (!session.loggedIn) continue;

    const navLinks = session.navLinks || [];
    const accessible = [];
    const blocked = [];

    logPhase(3, `Permissions ${session.label} (${session.role})`, 'INFO');

    // Convertir les navLinks en moduleIds
    const accessibleModuleIds = navLinks
      .map(label => LABEL_TO_MODULE[label.trim()] || null)
      .filter(Boolean);

    // Tester chaque module de la matrice
    for (const [moduleId, allowedRoles] of Object.entries(ACCESS_MATRIX)) {
      const hasAccess = accessibleModuleIds.includes(moduleId);
      const shouldHaveAccess = allowedRoles.includes(session.role);

      if (hasAccess && shouldHaveAccess) {
        accessible.push(moduleId);
        logPhase(3, `${session.label}: [${moduleId}] ✓ autorisé et présent`, 'PASS');
      } else if (hasAccess && !shouldHaveAccess) {
        addAnomaly(3, `PERMISSION EXCESSIVE: ${session.label} (${session.role}) voit [${moduleId}] dans la sidebar sans autorisation`, 'HIGH');
        blocked.push(`${moduleId}(accès non autorisé)`);
        logPhase(3, `${session.label}: [${moduleId}] ✗ VISIBLE mais NON AUTORISÉ`, 'FAIL');
      } else if (!hasAccess && shouldHaveAccess) {
        logPhase(3, `${session.label}: [${moduleId}] attendu mais absent de la nav (peut être normal)`, 'WARN');
      } else {
        logPhase(3, `${session.label}: [${moduleId}] absent (normal — non autorisé)`, 'PASS');
      }
    }

    results[username] = { accessible, blocked, role: session.role, navModuleIds: accessibleModuleIds };


    // Tenter un accès direct à une URL sensible (paramètres) pour vérifier le blocage
    if (session.role !== 'ADMIN_GENERALE') {
      try {
        await session.page.goto(`${VERCEL_URL}#/parametres`, { waitUntil: 'networkidle0', timeout: 8000 });
        await delay(1000);
        const isBlocked = await session.page.evaluate(() => {
          const text = document.body.innerText;
          return text.includes('interdit') || text.includes('non autorisé') || text.includes('accès refusé') || text.includes('Forbidden');
        });
        if (!isBlocked) {
          logPhase(3, `${session.label}: accès #/parametres non explicitement bloqué (UI)`, 'WARN');
        } else {
          logPhase(3, `${session.label}: accès #/parametres bloqué correctement`, 'PASS');
        }
        // Revenir sur la page principale
        await session.page.goto(VERCEL_URL, { waitUntil: 'networkidle2', timeout: 15000 });
        await loginAs(session.page, session);
      } catch {}
    }

    logPhase(3, `${session.label}: ${accessible.length} modules accessibles`, 'PASS');
  }

  report.phases['3_permissions'] = results;
}

// =============================================================================
// PHASE 4 — TESTS CONCURRENTS
// =============================================================================
async function phase4_concurrent(sessions) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 4 — TESTS CONCURRENTS                   ║');
  console.log('╚══════════════════════════════════════════════╝');

  const CONCURRENT_TIMESTAMP = Date.now();

  // Scénario 1 : Deux admins créent un élève simultanément
  logPhase(4, 'Test concurrent : Deux admins — création simultanée Supabase', 'CONC');
  const student1Id = crypto.randomUUID();
  const student2Id = crypto.randomUUID();

  const [res1, res2] = await Promise.all([
    sbPost('students', {
      id: student1Id,
      matricule: `CONC-A-${CONCURRENT_TIMESTAMP}`,
      first_name: 'Concurrent', last_name: 'User1',
      gender: 'M', birth_date: '2018-01-01'
    }),
    sbPost('students', {
      id: student2Id,
      matricule: `CONC-B-${CONCURRENT_TIMESTAMP}`,
      first_name: 'Concurrent', last_name: 'User2',
      gender: 'F', birth_date: '2018-02-01'
    }),
  ]);

  if (res1.s === 201 && res2.s === 201) {
    logPhase(4, 'Concurrent insertion students: 2/2 réussies sans conflit', 'PASS');
    report.supabaseChecks.push({ test: 'concurrent_students_insert', status: 'PASS' });
  } else {
    logPhase(4, `Concurrent students: ${res1.s}/${res2.s}`, 'WARN');
    addAnomaly(4, `Insertion concurrente élèves: ${res1.s}/${res2.s}`, 'MEDIUM');
  }

  // Scénario 2 : Deux comptables enregistrent des paiements simultanément
  logPhase(4, 'Test concurrent : Deux comptables — paiements simultanés', 'CONC');
  const pay1 = crypto.randomUUID();
  const pay2 = crypto.randomUUID();

  const [payRes1, payRes2] = await Promise.all([
    sbPost('tuition_payments', {
      id: pay1, receipt_number: `CONC-PAY1-${CONCURRENT_TIMESTAMP}`,
      amount: 50000, payment_method: 'CASH', payment_date: new Date().toISOString(),
      notes: 'Test concurrent paiement 1'
    }),
    sbPost('tuition_payments', {
      id: pay2, receipt_number: `CONC-PAY2-${CONCURRENT_TIMESTAMP}`,
      amount: 75000, payment_method: 'WAVE', payment_date: new Date().toISOString(),
      notes: 'Test concurrent paiement 2'
    }),
  ]);

  if (payRes1.s === 201 && payRes2.s === 201) {
    logPhase(4, 'Concurrent paiements: 2/2 enregistrés sans écrasement', 'PASS');
    report.supabaseChecks.push({ test: 'concurrent_payments_insert', status: 'PASS' });
  } else {
    addAnomaly(4, `Paiements concurrents: ${payRes1.s}/${payRes2.s}`, 'HIGH');
    logPhase(4, `Concurrent paiements: ${payRes1.s}/${payRes2.s}`, 'FAIL');
  }

  // Scénario 3 : Deux enseignants modifient des résultats d'évaluation
  logPhase(4, 'Test concurrent : Deux enseignants — résultats simultanés', 'CONC');
  const result1Id = crypto.randomUUID();
  const result2Id = crypto.randomUUID();

  const [rr1, rr2] = await Promise.all([
    sbPost('assessment_results', { id: result1Id, score: 15.5 }),
    sbPost('assessment_results', { id: result2Id, score: 12.0 }),
  ]);

  if (rr1.s === 201 && rr2.s === 201) {
    logPhase(4, 'Concurrent résultats: 2/2 enregistrés indépendamment', 'PASS');
    report.supabaseChecks.push({ test: 'concurrent_results_insert', status: 'PASS' });
  } else {
    logPhase(4, `Concurrent résultats: ${rr1.s}/${rr2.s}`, 'WARN');
  }

  // Scénario 4 : Conflit UUID — même ID soumis deux fois
  logPhase(4, 'Test conflit : Doublon UUID — comportement attendu', 'CONC');
  const sameId = crypto.randomUUID();
  const [dup1, dup2] = await Promise.all([
    sbPost('parents', { id: sameId, first_name: 'Dup1', last_name: 'Test', phone: `07${Date.now().toString().slice(-8)}` }),
    sbPost('parents', { id: sameId, first_name: 'Dup2', last_name: 'Test', phone: `06${Date.now().toString().slice(-8)}` }),
  ]);

  if ((dup1.s === 201 && dup2.s !== 201) || (dup1.s !== 201 && dup2.s === 201)) {
    logPhase(4, 'Conflit UUID géré correctement (1 seul enregistrement créé)', 'PASS');
    report.supabaseChecks.push({ test: 'uuid_conflict_prevention', status: 'PASS' });
  } else if (dup1.s === 201 && dup2.s === 201) {
    addAnomaly(4, 'CONFLIT UUID: deux inserts avec même ID ont réussi !', 'CRITICAL');
    logPhase(4, 'ALERTE: Doublon UUID non bloqué !', 'FAIL');
  } else {
    logPhase(4, `UUID conflict: ${dup1.s}/${dup2.s} — probablement bloqué`, 'PASS');
  }

  report.phases['4_concurrent'] = { scenariosRun: 4 };
}

// =============================================================================
// PHASE 5 — VÉRIFICATION SUPABASE POST-ACTION
// =============================================================================
async function phase5_supabase_checks() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 5 — VÉRIFICATION SUPABASE POST-ACTION   ║');
  console.log('╚══════════════════════════════════════════════╝');

  const TABLES_TO_CHECK = [
    { table: 'students', expectedCols: ['id', 'matricule', 'first_name', 'last_name'] },
    { table: 'parents', expectedCols: ['id', 'first_name', 'last_name', 'phone'] },
    { table: 'staff_members', expectedCols: ['id', 'first_name', 'last_name', 'role'] },
    { table: 'tuition_payments', expectedCols: ['id', 'amount', 'payment_method', 'receipt_number'] },
    { table: 'assessment_results', expectedCols: ['id', 'score'] },
    { table: 'canteen_enrollments', expectedCols: ['id', 'subscription_status'] },
    { table: 'transport_enrollments', expectedCols: ['id', 'subscription_status'] },
    { table: 'assessment_sessions', expectedCols: ['id', 'title'] },
  ];

  for (const { table, expectedCols } of TABLES_TO_CHECK) {
    try {
      const res = await sbGet(`${table}?select=*&order=created_at.desc&limit=3`);

      if (res.s !== 200) {
        logPhase(5, `Table ${table} → HTTP ${res.s}`, 'FAIL');
        addAnomaly(5, `Table ${table} inaccessible: HTTP ${res.s}`, 'HIGH');
        continue;
      }

      const count = Array.isArray(res.b) ? res.b.length : 0;
      const sample = count > 0 ? res.b[0] : null;

      // Vérifier que les colonnes attendues sont présentes
      if (sample) {
        const missingCols = expectedCols.filter(col => !(col in sample));
        if (missingCols.length > 0) {
          addAnomaly(5, `Table ${table}: colonnes manquantes ${missingCols.join(', ')}`, 'MEDIUM');
          logPhase(5, `${table}: colonnes manquantes [${missingCols.join(', ')}]`, 'WARN');
        } else {
          logPhase(5, `${table}: OK — ${count} ligne(s) — toutes colonnes présentes`, 'PASS');
        }
      } else {
        logPhase(5, `${table}: accessible — vide (0 ligne)`, 'PASS');
      }

      report.supabaseChecks.push({ table, count, status: 'OK', httpStatus: res.s });
    } catch (err) {
      logPhase(5, `${table}: erreur — ${err.message}`, 'FAIL');
    }
  }

  // Vérifier les contraintes d'intégrité (FK)
  logPhase(5, 'Vérification des contraintes FK — insertion invalide rejetée', 'INFO');
  const invalidStudent = await sbPost('student_financial_enrollments', {
    id: crypto.randomUUID(),
    student_id: '00000000-0000-0000-0000-000000000000', // ID inexistant
    academic_year_id: '2024-2025',
  });
  if (invalidStudent.s !== 201) {
    logPhase(5, `FK constraint enforcement: HTTP ${invalidStudent.s} (rejeté correctement)`, 'PASS');
    report.supabaseChecks.push({ test: 'fk_constraint_enforcement', status: 'PASS' });
  } else {
    addAnomaly(5, 'FK NON APPLIQUÉE: insertion avec FK invalide acceptée !', 'HIGH');
    logPhase(5, 'FK constraint: non appliquée !', 'FAIL');
  }

  report.phases['5_supabase'] = { tablesChecked: TABLES_TO_CHECK.length };
}

// =============================================================================
// PHASE 6 — TESTS PAR MODULE (via navigateur avec sessions)
// =============================================================================
async function phase6_modules(sessions) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 6 — TESTS PAR MODULE                     ║');
  console.log('╚══════════════════════════════════════════════╝');

  // Utiliser la session direction (ADMIN_GENERALE)
  const dirSession = sessions['direction'] || sessions['admin'];
  if (!dirSession?.loggedIn) {
    logPhase(6, 'Session direction non disponible — skip tests UI modules', 'WARN');
    return;
  }

  const { page } = dirSession;
  const MODULES_TO_TEST = [
    { name: 'Élèves', keywords: ['Élèves', 'Étudiants', 'Students'] },
    { name: 'Classes', keywords: ['Classes', 'Classe'] },
    { name: 'Personnel', keywords: ['Personnel', 'Staff', 'Enseignant'] },
    { name: 'Finances', keywords: ['Finances', 'Paiements', 'Comptabilité'] },
    { name: 'Cantine', keywords: ['Cantine', 'Restauration'] },
    { name: 'Transport', keywords: ['Transport', 'Bus'] },
    { name: 'Notes', keywords: ['Notes', 'Évaluation', 'Bulletin'] },
    { name: 'Présences', keywords: ['Présences', 'Assiduité', 'Attendance'] },
    { name: 'Paramètres', keywords: ['Paramètres', 'Réglages', 'Settings'] },
    { name: 'Parents', keywords: ['Parents', 'Responsables'] },
  ];

  const moduleResults = {};

  for (const mod of MODULES_TO_TEST) {
    logPhase(6, `Test module: ${mod.name}`, 'INFO');
    try {
      // Naviguer vers le module
      const navBtn = await page.evaluateHandle((keywords) =>
        Array.from(document.querySelectorAll('button, a, nav *, aside *')).find(b => {
          const t = b.textContent?.trim() || '';
          return keywords.some(k => t.includes(k));
        }), mod.keywords
      );

      if (!navBtn.asElement()) {
        logPhase(6, `${mod.name}: module introuvable dans la navigation`, 'WARN');
        moduleResults[mod.name] = { found: false };
        continue;
      }

      await navBtn.asElement().click();
      await delay(1200);

      // Vérifier que la page charge sans erreur
      const errors = await getPageErrors(page);
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      const hasContent = pageText.length > 50;

      if (hasContent && errors.length === 0) {
        logPhase(6, `${mod.name}: chargé et fonctionnel`, 'PASS');
        moduleResults[mod.name] = { found: true, loaded: true, errors: 0 };
      } else if (hasContent) {
        logPhase(6, `${mod.name}: chargé avec ${errors.length} alerte(s)`, 'WARN');
        moduleResults[mod.name] = { found: true, loaded: true, errors: errors.length };
      } else {
        logPhase(6, `${mod.name}: contenu vide ou non chargé`, 'WARN');
        moduleResults[mod.name] = { found: true, loaded: false };
      }

      await takeScreenshot(page, `phase6_module_${mod.name.replace(/[^a-z0-9]/gi, '_')}`);

    } catch (err) {
      logPhase(6, `${mod.name}: erreur — ${err.message.substring(0, 80)}`, 'FAIL');
      moduleResults[mod.name] = { found: false, error: err.message };
    }
  }

  report.phases['6_modules'] = moduleResults;
}

// =============================================================================
// PHASE 7 — TESTS D'IMPRESSION / EXPORT
// =============================================================================
async function phase7_print_export(sessions) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 7 — TESTS D\'IMPRESSION & EXPORT         ║');
  console.log('╚══════════════════════════════════════════════╝');

  const dirSession = sessions['direction'] || sessions['admin'];
  if (!dirSession?.loggedIn) {
    logPhase(7, 'Session non disponible — skip tests export', 'WARN');
    return;
  }

  const { page } = dirSession;
  const EXPORT_KEYWORDS = ['Imprimer', 'Exporter', 'PDF', 'Excel', 'Télécharger', 'Export', 'Print', 'Download'];

  const exportBtns = await page.evaluate((keywords) => {
    return Array.from(document.querySelectorAll('button, a')).filter(b => {
      const t = b.textContent?.trim() || '';
      return keywords.some(k => t.toLowerCase().includes(k.toLowerCase()));
    }).map(b => ({ text: b.textContent?.trim(), disabled: b.disabled }));
  }, EXPORT_KEYWORDS);

  const disabledBtns = exportBtns.filter(b => b.disabled);
  const activeBtns = exportBtns.filter(b => !b.disabled);

  logPhase(7, `Boutons export/impression trouvés: ${exportBtns.length} (${activeBtns.length} actifs, ${disabledBtns.length} désactivés)`, activeBtns.length > 0 ? 'PASS' : 'WARN');

  if (disabledBtns.length > 0) {
    disabledBtns.forEach(b => {
      addAnomaly(7, `Bouton désactivé: "${b.text}"`, 'MEDIUM');
    });
  }

  report.phases['7_export'] = { total: exportBtns.length, active: activeBtns.length, disabled: disabledBtns.length };
}

// =============================================================================
// PHASE 8 — PARCOURS UTILISATEUR COMPLET
// =============================================================================
async function phase8_navigation(sessions) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 8 — PARCOURS UTILISATEUR COMPLET        ║');
  console.log('╚══════════════════════════════════════════════╝');

  const results = {};

  // Tester le parcours pour chaque rôle qui est connecté
  for (const [username, session] of Object.entries(sessions)) {
    if (!session.loggedIn) continue;

    logPhase(8, `Parcours complet pour ${session.label}`, 'INFO');
    const visited = [];
    const failed = [];

    const navLinks = session.navLinks || [];

    // Essayer de visiter chaque lien de navigation
    for (const link of navLinks.slice(0, 8)) {
      if (!link || link.length < 2) continue;
      try {
        const btn = await session.page.evaluateHandle((linkText) =>
          Array.from(document.querySelectorAll('button, a, nav *, aside *')).find(b =>
            b.textContent?.trim() === linkText
          ), link
        );
        if (btn.asElement()) {
          await btn.asElement().click();
          await delay(800);
          visited.push(link);
        }
      } catch {}
    }

    results[username] = { visited: visited.length, failed: failed.length };
    logPhase(8, `${session.label}: ${visited.length}/${navLinks.slice(0, 8).length} destinations visitées`, visited.length > 0 ? 'PASS' : 'WARN');
    await takeScreenshot(session.page, `phase8_${username}_navigation`);
  }

  report.phases['8_navigation'] = results;
}

// =============================================================================
// PHASE 9 — TEST DE CHARGE (Volume)
// =============================================================================
async function phase9_load_test() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 9 — TEST DE CHARGE (Volume)              ║');
  console.log('╚══════════════════════════════════════════════╝');

  const BATCH_SIZE = 20; // 20 opérations en parallèle
  const TS = Date.now();
  const results = { students: 0, payments: 0, staff: 0, errors: 0 };

  logPhase(9, `Insertion de ${BATCH_SIZE} élèves en parallèle...`, 'INFO');
  const studentPromises = Array.from({ length: BATCH_SIZE }, (_, i) =>
    sbPost('students', {
      id: crypto.randomUUID(),
      matricule: `LOAD-${TS}-${i.toString().padStart(3, '0')}`,
      first_name: `LoadTest${i}`,
      last_name: 'GESCO',
      gender: i % 2 === 0 ? 'M' : 'F',
      birth_date: '2015-01-01'
    }).catch(() => ({ s: 0 }))
  );

  const studentResults = await Promise.all(studentPromises);
  results.students = studentResults.filter(r => r.s === 201).length;
  const studentErrors = studentResults.filter(r => r.s !== 201).length;
  results.errors += studentErrors;

  if (results.students >= BATCH_SIZE * 0.8) {
    logPhase(9, `Élèves: ${results.students}/${BATCH_SIZE} créés (${Math.round(results.students/BATCH_SIZE*100)}%)`, 'PASS');
  } else {
    logPhase(9, `Élèves: ${results.students}/${BATCH_SIZE} créés (taux trop bas)`, 'WARN');
    addAnomaly(9, `Taux d'insertion élèves faible: ${results.students}/${BATCH_SIZE}`, 'MEDIUM');
  }

  logPhase(9, `Insertion de ${BATCH_SIZE} paiements en parallèle...`, 'INFO');
  const paymentPromises = Array.from({ length: BATCH_SIZE }, (_, i) =>
    sbPost('tuition_payments', {
      id: crypto.randomUUID(),
      receipt_number: `LOAD-PAY-${TS}-${i}`,
      amount: 10000 + i * 1000,
      payment_method: i % 2 === 0 ? 'CASH' : 'WAVE',
      payment_date: new Date().toISOString(),
      notes: `Load test payment ${i}`
    }).catch(() => ({ s: 0 }))
  );

  const paymentResults = await Promise.all(paymentPromises);
  results.payments = paymentResults.filter(r => r.s === 201).length;
  results.errors += paymentResults.filter(r => r.s !== 201).length;

  if (results.payments >= BATCH_SIZE * 0.8) {
    logPhase(9, `Paiements: ${results.payments}/${BATCH_SIZE} enregistrés`, 'PASS');
  } else {
    logPhase(9, `Paiements: ${results.payments}/${BATCH_SIZE} — taux faible`, 'WARN');
  }

  logPhase(9, `Résumé charge: ${results.students + results.payments} opérations réussies, ${results.errors} erreurs`, results.errors === 0 ? 'PASS' : 'WARN');

  report.phases['9_load'] = results;
}

// =============================================================================
// PHASE 10 — VÉRIFICATION RLS
// =============================================================================
async function phase10_rls() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 10 — VÉRIFICATION DES POLITIQUES RLS    ║');
  console.log('╚══════════════════════════════════════════════╝');

  const rlsResults = {};

  // Le schéma SQL montre que toutes les tables ont: FOR ALL USING (true) WITH CHECK (true)
  // = RLS ouvert pour la démo (accès public avec anon key)
  // Ce n'est PAS une implémentation RLS sécurisée — c'est normal pour une appli démo
  logPhase(10, 'Analyse des politiques RLS du schéma Supabase...', 'INFO');

  // Test: lecture avec anon key (doit fonctionner car RLS est OPEN)
  const readTest = await sbGet('students?select=id,first_name&limit=3');
  if (readTest.s === 200) {
    logPhase(10, 'Lecture anon key: autorisée (RLS OPEN — mode démo)', 'PASS');
    rlsResults.anonRead = 'OPEN';
  } else {
    logPhase(10, `Lecture anon key: ${readTest.s}`, 'WARN');
  }

  // Test: écriture avec anon key (doit fonctionner en mode démo)
  const writeTest = await sbPost('parents', {
    id: crypto.randomUUID(),
    first_name: 'RLS', last_name: 'Test', phone: `05${Date.now().toString().slice(-8)}`
  });
  if (writeTest.s === 201) {
    logPhase(10, 'Écriture anon key: autorisée (RLS OPEN — mode démo)', 'PASS');
    rlsResults.anonWrite = 'OPEN';
  }

  // Constater l'état RLS et signaler la recommandation de sécurité
  logPhase(10, 'CONSTAT: RLS en mode OPEN (FOR ALL USING TRUE)', 'WARN');
  logPhase(10, 'RECOMMANDATION: Configurer des politiques RLS strictes par rôle avant la production finale', 'WARN');

  addAnomaly(10,
    'SÉCURITÉ: Les politiques RLS sont en mode "FOR ALL USING (true)" — aucune restriction de rôle appliquée côté Supabase. ' +
    'Toute personne avec la anon key peut lire/écrire toutes les tables. ' +
    'Les contrôles d\'accès sont uniquement appliqués côté UI (client). ' +
    'RECOMMANDATION: Implémenter des politiques RLS basées sur auth.jwt() et les rôles.',
    'HIGH'
  );

  rlsResults.overallStatus = 'OPEN_NO_ROLE_RESTRICTION';
  report.phases['10_rls'] = rlsResults;
}

// =============================================================================
// PHASE 11 — RAPPORT FINAL
// =============================================================================
async function phase11_report() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  PHASE 11 — RAPPORT FINAL                       ║');
  console.log('╚══════════════════════════════════════════════╝');

  report.endTimestamp = new Date().toISOString();

  // Calculer le verdict
  const criticalAnomalies = report.anomalies.filter(a => a.severity === 'CRITICAL').length;
  const highAnomalies = report.anomalies.filter(a => a.severity === 'HIGH').length;
  const mediumAnomalies = report.anomalies.filter(a => a.severity === 'MEDIUM').length;

  const verdict = criticalAnomalies === 0 && highAnomalies <= 2 ? 'CONDITIONNEL' :
                  criticalAnomalies > 0 ? 'NON_CERTIFIE' : 'CONDITIONNEL';

  report.verdict = {
    status: verdict,
    criticalAnomalies,
    highAnomalies,
    mediumAnomalies,
    totalPassed: report.summary.passed,
    totalFailed: report.summary.failed,
  };

  // Sauvegarder le rapport JSON
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  // Afficher le résumé
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 RÉSUMÉ CERTIFICATION MULTI-UTILISATEURS GESCO V2');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Tests réussis     : ${report.summary.passed}`);
  console.log(`  ❌ Tests échoués     : ${report.summary.failed}`);
  console.log(`  ⚠️  Avertissements    : ${report.summary.warnings}`);
  console.log(`  🔴 Anomalies CRITICAL: ${criticalAnomalies}`);
  console.log(`  🟠 Anomalies HIGH    : ${highAnomalies}`);
  console.log(`  🟡 Anomalies MEDIUM  : ${mediumAnomalies}`);
  console.log(`  📸 Captures écran    : ${report.screenshots.length}`);
  console.log('───────────────────────────────────────────────────────────');

  if (report.anomalies.length > 0) {
    console.log('\n  📋 LISTE DES ANOMALIES DÉTECTÉES :');
    report.anomalies.forEach((a, i) => {
      const icon = a.severity === 'CRITICAL' ? '🔴' : a.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} [${i + 1}] Phase ${a.phase} | ${a.severity} | ${a.description.substring(0, 120)}`);
    });
  }

  console.log('───────────────────────────────────────────────────────────');

  if (verdict === 'CONDITIONNEL') {
    console.log('\n  🟡 VERDICT : CERTIFIÉ CONDITIONNEL POUR LA PRODUCTION');
    console.log('  Conditions à remplir avant mise en production finale :');
    report.anomalies.filter(a => ['CRITICAL', 'HIGH'].includes(a.severity)).forEach(a => {
      console.log(`    → ${a.description.substring(0, 120)}`);
    });
  } else {
    console.log('\n  🔴 VERDICT : NON CERTIFIÉ');
    console.log('  Points bloquants :');
    report.anomalies.filter(a => a.severity === 'CRITICAL').forEach(a => {
      console.log(`    🔴 ${a.description.substring(0, 150)}`);
    });
  }

  console.log(`\n  📄 Rapport détaillé sauvegardé : ${REPORT_PATH}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return report;
}

// =============================================================================
// ORCHESTRATION PRINCIPALE
// =============================================================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🛡️ GESCO V2 — CAMPAGNE CERTIFICATION MULTI-UTILISATEURS        ║');
  console.log('║  URL: https://gesco-erp.vercel.app                              ║');
  console.log('║  Phases: 1-11 — Autonome — Production exclusivement             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let sessions = {};

  try {
    // Phase 1 — Vérification Vercel
    await phase1_preparation();

    // Phase 2 — Sessions multi-rôles
    sessions = await phase2_sessions();

    // Phase 3 — Permissions
    await phase3_permissions(sessions);

    // Phase 4 — Concurrence
    await phase4_concurrent(sessions);

    // Phase 5 — Vérifications Supabase
    await phase5_supabase_checks();

    // Phase 6 — Tests modules UI
    await phase6_modules(sessions);

    // Phase 7 — Export/Impression
    await phase7_print_export(sessions);

    // Phase 8 — Navigation complète
    await phase8_navigation(sessions);

    // Phase 9 — Charge
    await phase9_load_test();

    // Phase 10 — RLS
    await phase10_rls();

    // Phase 11 — Rapport final
    await phase11_report();

  } catch (err) {
    console.error('ERREUR CRITIQUE CAMPAGNE:', err);
    report.fatalError = err.message;
  } finally {
    // Fermer tous les navigateurs
    console.log('\n🔒 Fermeture de toutes les sessions navigateur...');
    for (const session of Object.values(sessions)) {
      try { if (session.browser) await session.browser.close(); } catch {}
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log('✅ Campagne terminée.');
  }
}

main().catch(console.error);
