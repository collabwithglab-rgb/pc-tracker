const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const args = process.argv.slice(2);

// Rileva percorsi toolchain MinGW e Cargo
const mingwBin = 'C:\\Users\\giuse\\AppData\\Local\\Microsoft\\WinGet\\Packages\\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\\mingw64\\bin';
const cargoBin = path.join(os.homedir(), '.cargo', 'bin');

const pathParts = [];
if (fs.existsSync(mingwBin)) pathParts.push(mingwBin);
if (fs.existsSync(cargoBin)) pathParts.push(cargoBin);
pathParts.push(process.env.PATH || '');

const env = {
  ...process.env,
  PATH: pathParts.join(path.delimiter),
  CARGO_TARGET_DIR: process.env.CARGO_TARGET_DIR || path.join(os.tmpdir(), 'pctracker-target'),
};

const cwd = process.cwd();

// Sanitizzazione o caricamento della chiave privata per la firma auto-updater
if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  const keyFile = path.join(cwd, 'user-backups', 'tauri-updater-private-key.txt');
  if (fs.existsSync(keyFile)) {
    const lines = fs.readFileSync(keyFile, 'utf8').split('\n');
    const keyLine = lines.find((l) => l.trim().startsWith('dW50'));
    if (keyLine) {
      env.TAURI_SIGNING_PRIVATE_KEY = keyLine.trim().replace(/^['"]|['"]$/g, '');
    }
  }
} else {
  // Se passata tramite env/secret, estrai la riga effettiva che inizia con dW50
  const lines = env.TAURI_SIGNING_PRIVATE_KEY.split(/\r?\n/);
  const keyLine = lines.find((l) => l.trim().startsWith('dW50'));
  if (keyLine) {
    env.TAURI_SIGNING_PRIVATE_KEY = keyLine.trim().replace(/^['"]|['"]$/g, '');
  } else {
    env.TAURI_SIGNING_PRIVATE_KEY = env.TAURI_SIGNING_PRIVATE_KEY.trim().replace(/^['"]|['"]$/g, '');
  }
}

if (env.TAURI_SIGNING_PRIVATE_KEY) {
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '';
  console.log(`[tauri.cjs] Signing key present (sanitized length: ${env.TAURI_SIGNING_PRIVATE_KEY.length}).`);
} else {
  console.log('[tauri.cjs] No TAURI_SIGNING_PRIVATE_KEY found in env or local backups.');
}
let runCwd = cwd;
let mappedDrive = null;

// Gestione trasparente percorsi Windows con spazi/parentesi/e-commerciale (&)
if (process.platform === 'win32' && /[ ()&]/.test(cwd)) {
  mappedDrive = 'P:';
  try {
    spawnSync('subst', [mappedDrive, cwd], { stdio: 'ignore' });
    runCwd = `${mappedDrive}\\`;
  } catch {
    runCwd = cwd;
  }
}

const tauriCli = path.join(runCwd, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');

const result = spawnSync('node', [tauriCli, ...args], {
  cwd: runCwd,
  env,
  stdio: 'inherit',
});

process.exit(result.status ?? 0);
