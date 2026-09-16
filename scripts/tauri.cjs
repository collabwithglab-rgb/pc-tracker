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
};

const cwd = process.cwd();
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
