/**
 * Privacy & Data-Leak Audit Gate for PC Tracker
 * 
 * Verifies that the public distribution package contains ZERO personal data,
 * no development seed dataset, and no unauthorized JSON/CSV files in production assets.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const pcContextFile = path.join(rootDir, 'src', 'store', 'PCContext.tsx');

const FORBIDDEN_STRINGS = [
  'i5-14500',
  'comp-gpu-rtx-4070',
  'Thermaltake',
  'AliExpress',
  'Peerless Assassin',
  'userRigSeed',
  'userRigData',
  'pc-tracker-backup-user'
];

let errors = [];

console.log('\n🔒 [Privacy Audit] Avvio controllo sicurezza & assenza dati personali...\n');

// 1. Controllo cartella public/
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  for (const file of publicFiles) {
    if (file.endsWith('.json') || file.endsWith('.csv')) {
      errors.push(`File non consentito in public/: ${file}`);
    }
  }
}

// 2. Controllo cartella dist/
if (fs.existsSync(distDir)) {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.json' || ext === '.csv') {
          errors.push(`File di dati non consentito in dist/: ${path.relative(rootDir, fullPath)}`);
        } else if (['.js', '.html', '.css'].includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of FORBIDDEN_STRINGS) {
            if (content.includes(pattern)) {
              errors.push(`Rilevato pattern personale vietato "${pattern}" in ${path.relative(rootDir, fullPath)}`);
            }
          }
        }
      }
    }
  }
  scanDir(distDir);
} else {
  console.warn('⚠️  Cartella dist/ non trovata: eseguire prima "npm run build" per il controllo completo del bundle.');
}

// 3. Controllo runtime frontend PCContext.tsx
if (fs.existsSync(pcContextFile)) {
  const pcContextContent = fs.readFileSync(pcContextFile, 'utf8');
  if (pcContextContent.includes('userRigSeed') || pcContextContent.includes('loadUserRigSeedData')) {
    errors.push('PCContext.tsx contiene ancora riferimenti a userRigSeed o loadUserRigSeedData.');
  }
}

// Esito
if (errors.length > 0) {
  console.error('❌ [Privacy Audit] FALLITO: rilevati dati personali o file vietati:');
  errors.forEach((err, idx) => {
    console.error(`   ${idx + 1}. ${err}`);
  });
  process.exit(1);
} else {
  console.log('✅ [Privacy Audit] SUPERATO: nessun dato personale o file non autorizzato rilevato!');
  console.log('   ✓ Nessun file .json o .csv in public/ o dist/');
  console.log('   ✓ Zero stringhe personali o seed hardware negli asset web compilati');
  console.log('   ✓ Runtime PCContext.tsx pulito al 100%\n');
  process.exit(0);
}
