import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Importa la baseline statica congelata
import baseline from './hardcodedStringsBaseline.json';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const EXCLUDE = [
  /__tests__/,
  /[\\/]locales[\\/]/,
  /wikiData(En)?\.ts$/,
  /changelog\.ts$/,
  /\.d\.ts$/,
];

const IT_WORDS = /\b(il|lo|la|gli|le|di|del|della|dei|delle|per|con|non|una|uno|sono|è|alle|al|nel|nella|dal|dalla|questo|questa|tramite|Nessun[oa]?|Salva|Annulla|Elimina|Modifica|Aggiungi|Chiudi|Conferma|Componente|Componenti|Impostazioni|Dati|Data|Prezzo|Costo|Vendita|Acquisto|Installazione|Smontato|Montato|Garanzia|Scansione|Movimenti|Configurazione|eseguita|salvato|attiva|giorni|anni|mesi)\b/;
const ACCENTS = /[àèéìòù]/;

function scanCurrentHardcodedStrings(): Record<string, number> {
  const files: string[] = [];

  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !EXCLUDE.some((r) => r.test(p))) {
        files.push(p);
      }
    }
  }

  walk(SRC);

  const perFile: Record<string, number> = {};

  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    let count = 0;
    lines.forEach((line) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('import ')) return;
      if (/console\.(log|warn|error|info)/.test(t)) return;
      const literals = [...line.matchAll(/'([^'\\]|\\.){3,}'|"([^"\\]|\\.){3,}"|`([^`\\]|\\.){3,}`|>([^<>{}]{3,})</g)].map((m) => m[0]);
      for (const lit of literals) {
        const body = lit.slice(1, -1);
        if (!/[a-zA-Zàèéìòù]{3,}\s+[a-zA-Zàèéìòù]/.test(body) && !ACCENTS.test(body)) continue;
        if (IT_WORDS.test(body) || ACCENTS.test(body)) {
          count++;
          break;
        }
      }
    });

    if (count > 0) {
      const relPath = path.relative(ROOT, f).replace(/\\/g, '/');
      perFile[relPath] = count;
    }
  }

  return perFile;
}

describe('Guardia Anti-Regressione i18n (Ratchet Guard Test)', () => {
  const current = scanCurrentHardcodedStrings();
  const baselineRecord = baseline as Record<string, number>;

  it('nessun NUOVO file deve introdurre stringhe italiane hardcoded', () => {
    const newFiles = Object.keys(current).filter((f) => !(f in baselineRecord));
    expect(
      newFiles,
      `I seguenti file nuovi contengono stringhe italiane hardcoded non autorizzate:\n${newFiles.map((f) => ` - ${f}: ${current[f]} righe`).join('\n')}\nUtilizza translate() e definisci le chiavi in it.json ed en.json!`
    ).toEqual([]);
  });

  it('nessun file esistente deve aumentare il conteggio delle stringhe hardcoded', () => {
    const regressions: string[] = [];
    for (const [file, currentCount] of Object.entries(current)) {
      const maxAllowed = baselineRecord[file] ?? 0;
      if (currentCount > maxAllowed) {
        regressions.push(`${file}: attuale ${currentCount} > massimo consentito ${maxAllowed} (+${currentCount - maxAllowed})`);
      }
    }

    expect(
      regressions,
      `Rilevata regressione i18n nei seguenti file (il conteggio è aumentato):\n${regressions.join('\n')}`
    ).toEqual([]);
  });

  it('il totale complessivo delle righe hardcoded non deve mai superare la baseline', () => {
    const currentTotal = Object.values(current).reduce((a, b) => a + b, 0);
    const baselineTotal = Object.values(baselineRecord).reduce((a, b) => a + b, 0);

    expect(currentTotal).toBeLessThanOrEqual(baselineTotal);
  });
});
