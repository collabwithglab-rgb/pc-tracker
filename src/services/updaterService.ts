/**
 * Auto-Updater Service for Tauri 2
 * 
 * Gestisce la verifica, il download e l'installazione automatica degli aggiornamenti
 * distribuiti tramite GitHub Releases (con firma crittografica Ed25519).
 */

import { isDesktopApp } from './desktopService';

export interface AppUpdateInfo {
  available: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseNotes?: string;
  publishedDate?: string;
  error?: string;
}

export type UpdateProgressCallback = (downloaded: number, total: number | null, percent: number) => void;

export const APP_VERSION = '0.1.1';

// Riferimento cache all'oggetto Update nativo di Tauri
let cachedUpdate: import('@tauri-apps/plugin-updater').Update | null = null;

/**
 * Controlla se è disponibile una nuova versione dell'applicazione:
 * - Se in esecuzione su desktop (Tauri): interroga l'endpoint GitHub Releases.
 * - Se in ambiente web: restituisce available: false.
 */
export async function checkForAppUpdates(): Promise<AppUpdateInfo> {
  if (!isDesktopApp()) {
    return {
      available: false,
      currentVersion: APP_VERSION,
    };
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (update) {
      cachedUpdate = update;
      return {
        available: true,
        currentVersion: update.currentVersion || APP_VERSION,
        newVersion: update.version,
        releaseNotes: update.body || '',
        publishedDate: update.date || '',
      };
    }

    cachedUpdate = null;
    return {
      available: false,
      currentVersion: APP_VERSION,
    };
  } catch (err) {
    console.warn('[Auto-Updater] Errore durante il controllo aggiornamenti:', err);
    return {
      available: false,
      currentVersion: APP_VERSION,
      error: (err as Error).message || 'Impossibile verificare gli aggiornamenti.',
    };
  }
}

/**
 * Scarica e installa l'aggiornamento disponibile con tracciamento del progresso:
 * Su Windows, al completamento del download l'installer viene avviato e l'app viene riavviata.
 */
export async function downloadAndInstallUpdate(
  onProgress?: UpdateProgressCallback
): Promise<{ success: boolean; error?: string }> {
  if (!cachedUpdate) {
    // Tenta un nuovo controllo se la cache è vuota
    const checkResult = await checkForAppUpdates();
    if (!checkResult.available || !cachedUpdate) {
      return { success: false, error: 'Nessun aggiornamento disponibile da installare.' };
    }
  }

  try {
    let totalBytes: number | null = null;
    let downloadedBytes = 0;

    await cachedUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        totalBytes = event.data.contentLength || null;
        if (onProgress) {
          onProgress(0, totalBytes, 0);
        }
      } else if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength;
        const percent = totalBytes && totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        if (onProgress) {
          onProgress(downloadedBytes, totalBytes, percent);
        }
      } else if (event.event === 'Finished') {
        if (onProgress) {
          onProgress(downloadedBytes, totalBytes, 100);
        }
      }
    });

    // Riavvia l'applicazione consentendo a Windows di applicare il pacchetto aggiornato
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (relaunchErr) {
      console.warn('[Auto-Updater] Riavvio automatico completato o in attesa manuale:', relaunchErr);
    }

    return { success: true };
  } catch (err) {
    console.error('[Auto-Updater] Errore durante download e installazione:', err);
    return { success: false, error: (err as Error).message || 'Errore durante il download dell\'aggiornamento.' };
  }
}
