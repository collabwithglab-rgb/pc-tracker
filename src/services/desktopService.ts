/**
 * Desktop Adapter Service
 * 
 * Fornisce accesso trasparente alle API native di Windows (Tauri Dialog e Filesystem)
 * con fallback automatico e sicuro su API Web standard quando l'applicazione viene eseguita nel browser o nei test.
 */

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export interface SaveFileResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface ReadFileResult {
  success: boolean;
  canceled?: boolean;
  fileName?: string;
  content?: string;
  error?: string;
}

/**
 * Salva un file di backup:
 * - Su Desktop (Tauri): apre la finestra nativa di Windows "Salva con nome..." e scrive su disco.
 * - Su Web: crea un Blob e avvia il download del browser.
 */
export async function saveBackupFileWithDialog(
  defaultFilename: string,
  content: string
): Promise<SaveFileResult> {
  if (isDesktopApp()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const selectedPath = await save({
        defaultPath: defaultFilename,
        filters: [
          {
            name: 'PC Tracker Backup (*.json)',
            extensions: ['json'],
          },
        ],
      });

      if (!selectedPath) {
        return { success: false, canceled: true };
      }

      await writeTextFile(selectedPath, content);
      return { success: true, filePath: selectedPath };
    } catch (err) {
      console.warn('Errore salvataggio nativo desktop, fallback su download web:', err);
      // Fallback trasparente su download web se fallisce il plugin nativo
      triggerWebDownload(defaultFilename, content);
      return { success: true };
    }
  }

  // Ambiente Web / Browser
  triggerWebDownload(defaultFilename, content);
  return { success: true };
}

/**
 * Seleziona e legge un file di backup:
 * - Su Desktop (Tauri): apre la finestra nativa di Windows per selezionare il file JSON e ne legge il contenuto.
 * - Su Web: restituisce canceled: false per permettere all'input type="file" di gestire la selezione.
 */
export async function pickAndReadBackupFileWithDialog(): Promise<ReadFileResult> {
  if (isDesktopApp()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'PC Tracker Backup (*.json)',
            extensions: ['json'],
          },
        ],
      });

      if (!selected) {
        return { success: false, canceled: true };
      }

      const filePath = typeof selected === 'string' ? selected : (selected as { path?: string })?.path || '';
      if (!filePath) {
        return { success: false, canceled: true };
      }

      const content = await readTextFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || 'backup.json';

      return {
        success: true,
        fileName,
        content,
      };
    } catch (err) {
      console.warn('Errore selezione file nativo desktop:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  // In ambiente web, delega al file input
  return { success: false, canceled: false };
}

/**
 * Helper per download browser standard via Blob.
 */
export function triggerWebDownload(filename: string, content: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
