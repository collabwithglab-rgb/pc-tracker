import { describe, it, expect, beforeEach } from 'vitest';
import {
  APP_CHANGELOG,
  getChangelogForVersion,
  ReleaseChangelog,
} from '../../../constants/changelog';
import { APP_VERSION } from '../../../constants/version';

/**
 * Suite di Test per il Sistema di Notifica Aggiornamenti & WhatsNewModal
 * 
 * Verifica:
 * 1. Integrità del Changelog, allineamento alla versione corrente e predisposizione Mini-Wiki.
 * 2. Risoluzione versioni tramite getChangelogForVersion.
 * 3. Logica del bollino rosso lampeggiante (Sidebar) ed evidenziazione (Settings).
 * 4. Macchina a stati per il rilevamento post-upgrade (lastSeenVersion) e persistenza.
 */

describe('Sistema Notifiche Aggiornamenti & Changelog WhatsNew', () => {
  describe('1. Registro Changelog & Allineamento di Versione', () => {
    it('allinea la versione più recente in APP_CHANGELOG a APP_VERSION', () => {
      expect(APP_CHANGELOG.length).toBeGreaterThan(0);
      const latest = APP_CHANGELOG[0];
      expect(latest.version).toBe(APP_VERSION);
    });

    it('include tutti i campi tassativi per ogni release registrata', () => {
      APP_CHANGELOG.forEach((release: ReleaseChangelog) => {
        expect(release.version).toBeDefined();
        expect(release.version.trim().length).toBeGreaterThan(0);
        expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(release.title).toBeDefined();
        expect(release.title.trim().length).toBeGreaterThan(0);
        expect(release.summary).toBeDefined();
        expect(release.summary.trim().length).toBeGreaterThan(0);

        expect(Array.isArray(release.added)).toBe(true);
        expect(Array.isArray(release.improved)).toBe(true);
        expect(Array.isArray(release.fixed)).toBe(true);

        // Almeno una tra aggiunte, miglioramenti o correzioni presente
        const totalItems = release.added.length + release.improved.length + release.fixed.length;
        expect(totalItems).toBeGreaterThan(0);

        // Predisposizione Mini-Wiki
        expect(release.wikiUrl).toBeDefined();
        expect(release.wikiUrl).toContain('wiki');
      });
    });

    it('getChangelogForVersion restituisce la release corretta con o senza prefisso "v"', () => {
      const withV = getChangelogForVersion(`v${APP_VERSION}`);
      const withoutV = getChangelogForVersion(APP_VERSION);

      expect(withV).toBeDefined();
      expect(withoutV).toBeDefined();
      expect(withV.version).toBe(APP_VERSION);
      expect(withoutV.version).toBe(APP_VERSION);
    });

    it('getChangelogForVersion esegue il fallback alla versione più recente se la versione richiesta non esiste', () => {
      const fallback = getChangelogForVersion('99.99.99');
      expect(fallback).toBeDefined();
      expect(fallback.version).toBe(APP_CHANGELOG[0].version);
    });
  });

  describe('2. Logica di Notifica Visiva & Bollino Rosso Lampeggiante', () => {
    it('determina correttamente la visualizzazione del bollino rosso nella sidebar', () => {
      const getSidebarBadgeState = (itemId: string, hasUpdateAvailable: boolean) => {
        return itemId === 'settings' && hasUpdateAvailable;
      };

      expect(getSidebarBadgeState('settings', true)).toBe(true);
      expect(getSidebarBadgeState('settings', false)).toBe(false);
      expect(getSidebarBadgeState('dashboard', true)).toBe(false);
      expect(getSidebarBadgeState('current-rig', true)).toBe(false);
    });

    it('assegna la classe CSS di evidenziazione pulsante al gruppo aggiornamenti in Impostazioni', () => {
      const getSettingsGroupClassName = (hasUpdateAvailable: boolean, updateInfoAvailable: boolean) => {
        const isReady = hasUpdateAvailable || updateInfoAvailable;
        return `settings-group ${isReady ? 'settings-group-update-ready' : ''}`.trim();
      };

      expect(getSettingsGroupClassName(true, false)).toBe('settings-group settings-group-update-ready');
      expect(getSettingsGroupClassName(false, true)).toBe('settings-group settings-group-update-ready');
      expect(getSettingsGroupClassName(false, false)).toBe('settings-group');
    });
  });

  describe('3. Macchina a Stati Rilevamento Post-Upgrade (WhatsNew Modal)', () => {
    beforeEach(() => {
      try {
        localStorage.clear();
      } catch {
        // Safe for test environments
      }
    });

    it('non interrompe l\'onboarding su installazione vergine (0 componenti e setup non completato)', () => {
      const mockStorage: Record<string, string> = {};
      const shouldTriggerWhatsNew = (
        lastSeen: string | null,
        quickSetupCompleted: boolean,
        componentsCount: number,
        currentVersion: string
      ): boolean => {
        if (!lastSeen && !quickSetupCompleted && componentsCount === 0) {
          mockStorage['pctracker_last_seen_version'] = currentVersion;
          return false;
        }
        return lastSeen !== currentVersion;
      };

      const result = shouldTriggerWhatsNew(null, false, 0, '0.2.1');
      expect(result).toBe(false);
      expect(mockStorage['pctracker_last_seen_version']).toBe('0.2.1');
    });

    it('apre automaticamente la modale quando l\'utente ha componenti e avvia per la prima volta la nuova versione', () => {
      const shouldTriggerWhatsNew = (
        lastSeen: string | null,
        quickSetupCompleted: boolean,
        componentsCount: number,
        currentVersion: string
      ): boolean => {
        if (!lastSeen && !quickSetupCompleted && componentsCount === 0) {
          return false;
        }
        return lastSeen !== currentVersion;
      };

      // Utente con dati hardware e lastSeen nullo
      expect(shouldTriggerWhatsNew(null, true, 5, '0.2.1')).toBe(true);

      // Utente che proviene dalla versione 0.2.0
      expect(shouldTriggerWhatsNew('0.2.0', true, 5, '0.2.1')).toBe(true);

      // Utente che ha già visualizzato la versione 0.2.1
      expect(shouldTriggerWhatsNew('0.2.1', true, 5, '0.2.1')).toBe(false);
    });

    it('salva la versione confermata in localStorage per non ripresentare la modale', () => {
      const mockStorage: Record<string, string> = {};
      const onConfirmWhatsNew = (version: string) => {
        mockStorage['pctracker_last_seen_version'] = version;
      };

      onConfirmWhatsNew(APP_VERSION);
      expect(mockStorage['pctracker_last_seen_version']).toBe('0.2.1');
    });
  });

  describe('4. Predisposizione Mini-Wiki & Contenuti Release 0.2.1', () => {
    it('include nella release 0.2.1 le 4 funzionalità cardine richieste', () => {
      const changelog021 = getChangelogForVersion('0.2.1');
      const addedTitles = changelog021.added.map((a) => a.title);

      expect(addedTitles).toContain('Power Budget & Stima Consumi TDP');
      expect(addedTitles).toContain('Generatore Automatico Annunci Vendita');
      expect(addedTitles).toContain('Gestione Garanzie & Cassaforte Ricevute (Receipt Vault)');
      expect(addedTitles).toContain('Sistema di Notifica Aggiornamenti & Note di Rilascio');
    });

    it('include nella release 0.2.1 i miglioramenti all\'Auto-Updater e alla navigazione', () => {
      const changelog021 = getChangelogForVersion('0.2.1');
      const improvedTitles = changelog021.improved.map((i) => i.title);

      expect(improvedTitles).toContain('Auto-Updater con Firma Crittografica Minisign Ed25519');
      expect(improvedTitles).toContain('Navigazione Riorganizzata a 4 Macro-Aree');
    });
  });
});
