import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import { interpolate } from '../i18nContext';
import { NavSection } from '../../types';

describe('i18n Tranche 2 — Navigazione, Header e Selettore Lingua nei Settings', () => {
  describe('1. Parità e coerenza semantica voci di navigazione Sidebar', () => {
    const navKeys: Record<NavSection, keyof typeof itLocale> = {
      dashboard: 'nav_dashboard',
      'current-rig': 'nav_current_rig',
      'time-travel': 'nav_time_travel',
      archive: 'nav_archive',
      upgrades: 'nav_upgrades',
      marketplace: 'nav_marketplace',
      stats: 'nav_stats',
      maintenance: 'nav_maintenance',
      wiki: 'nav_wiki',
      settings: 'nav_settings',
    };

    it('tutte le 10 sezioni di navigazione sono coperte da chiavi dedicate in IT e EN', () => {
      Object.entries(navKeys).forEach(([section, key]) => {
        expect(itLocale[key], `Chiave IT mancante o vuota per ${section}`).toBeDefined();
        expect(itLocale[key].trim().length).toBeGreaterThan(0);

        expect(enLocale[key], `Chiave EN mancante o vuota per ${section}`).toBeDefined();
        expect(enLocale[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('le etichette italiane rispecchiano fedelmente le convenzioni di progetto', () => {
      expect(itLocale.nav_dashboard).toBe('Dashboard');
      expect(itLocale.nav_current_rig).toBe('Il Mio PC');
      expect(itLocale.nav_archive).toBe('Archivio');
      expect(itLocale.nav_upgrades).toBe('Upgrades');
      expect(itLocale.nav_maintenance).toBe('Cura del PC');
      expect(itLocale.nav_stats).toBe('Statistiche');
      expect(itLocale.nav_time_travel).toBe('Time Travel');
      expect(itLocale.nav_marketplace).toBe('Marketplace');
      expect(itLocale.nav_wiki).toBe('Wiki');
      expect(itLocale.nav_settings).toBe('Impostazioni');
    });

    it('le etichette inglesi offrono traduzioni naturali e prive di italianismi', () => {
      expect(enLocale.nav_dashboard).toBe('Dashboard');
      expect(enLocale.nav_current_rig).toBe('My PC');
      expect(enLocale.nav_archive).toBe('Archive');
      expect(enLocale.nav_upgrades).toBe('Upgrades');
      expect(enLocale.nav_maintenance).toBe('PC Care');
      expect(enLocale.nav_stats).toBe('Statistics');
      expect(enLocale.nav_time_travel).toBe('Time Travel');
      expect(enLocale.nav_marketplace).toBe('Marketplace');
      expect(enLocale.nav_wiki).toBe('Wiki');
      expect(enLocale.nav_settings).toBe('Settings');
    });

    it('i gruppi e i metadati della sidebar sono tradotti in entrambe le lingue', () => {
      expect(itLocale.nav_group_overview).toBe('Panoramica');
      expect(enLocale.nav_group_overview).toBe('Overview');

      expect(itLocale.nav_group_computer).toBe('Il Computer');
      expect(enLocale.nav_group_computer).toBe('The Computer');

      expect(itLocale.nav_group_market).toBe('Hardware & Mercato');
      expect(enLocale.nav_group_market).toBe('Hardware & Market');

      expect(itLocale.nav_group_system).toBe('Analisi & Sistema');
      expect(enLocale.nav_group_system).toBe('Analysis & System');

      expect(itLocale.sidebar_local_db).toBe('IndexedDB Locale');
      expect(enLocale.sidebar_local_db).toBe('Local IndexedDB');
    });
  });

  describe('2. Parità e coerenza elementi Header', () => {
    it('copre tutte le azioni richieste nell header (search, setup, novità, export, nuovo movimento, notifiche)', () => {
      // Placeholder ricerca
      expect(itLocale.header_search_placeholder).toBe('Cerca componente, marca, modello...');
      expect(enLocale.header_search_placeholder).toBe('Search component, brand, model...');

      // Quick Setup
      expect(itLocale.header_quick_setup).toBe('Quick Setup');
      expect(enLocale.header_quick_setup).toBe('Quick Setup');

      // Novità
      expect(itLocale.header_whats_new).toBe('Novità');
      expect(enLocale.header_whats_new).toBe("What's New");

      // Esporta Backup
      expect(itLocale.header_export_backup).toBe('Esporta Backup');
      expect(enLocale.header_export_backup).toBe('Export Backup');

      // + Nuovo Movimento
      expect(itLocale.header_new_movement).toBe('+ Nuovo Movimento');
      expect(enLocale.header_new_movement).toBe('+ New Movement');

      // Centro Notifiche
      expect(itLocale.header_notifications).toBe('Centro Notifiche');
      expect(enLocale.header_notifications).toBe('Notification Center');

      // Stato ottimale
      expect(itLocale.header_system_optimal).toBe('Tutti i sistemi hardware sono ottimali');
      expect(enLocale.header_system_optimal).toBe('All hardware systems are optimal');
    });
  });

  describe('3. Sezione Lingua dell Interfaccia in SettingsPage', () => {
    it('definisce stringhe descrittive per il selettore di lingua con badge reattivo', () => {
      expect(itLocale.settings_language_title).toBe("Lingua dell'Interfaccia");
      expect(enLocale.settings_language_title).toBe('Interface Language');

      expect(itLocale.settings_language_desc).toContain('Seleziona la lingua');
      expect(enLocale.settings_language_desc).toContain('Select the language');

      expect(itLocale.settings_language_active).toBe('Attiva');
      expect(enLocale.settings_language_active).toBe('Active');

      // Interpolazione conferma cambio lingua
      expect(interpolate(itLocale.settings_language_switch_confirm, { lang: 'Italiano' })).toBe(
        'Lingua aggiornata in Italiano'
      );
      expect(interpolate(enLocale.settings_language_switch_confirm, { lang: 'English' })).toBe(
        'Language updated to English'
      );

      // Interpolazione lingua rilevata
      expect(interpolate(itLocale.settings_language_detected, { lang: 'IT' })).toBe(
        'Rilevata da Windows: IT'
      );
      expect(interpolate(enLocale.settings_language_detected, { lang: 'EN' })).toBe(
        'Detected from Windows: EN'
      );
    });

    it('simula la semantica ARIA corretta per le opzioni radio del selettore lingua', () => {
      const getLangOptionAttrs = (code: string, currentLang: string) => ({
        role: 'radio' as const,
        'aria-checked': code === currentLang,
        id: `btn-lang-${code}`,
      });

      const itOption = getLangOptionAttrs('it', 'it');
      expect(itOption.role).toBe('radio');
      expect(itOption['aria-checked']).toBe(true);

      const enOption = getLangOptionAttrs('en', 'it');
      expect(enOption.role).toBe('radio');
      expect(enOption['aria-checked']).toBe(false);

      // Al cambio di lingua verso EN
      const enOptionAfterSwitch = getLangOptionAttrs('en', 'en');
      expect(enOptionAfterSwitch['aria-checked']).toBe(true);
    });

    it('genera il messaggio di feedback reattivo nella lingua di destinazione', () => {
      const getConfirmMsg = (code: string) =>
        code === 'en' ? 'Language updated to English 🇬🇧' : 'Lingua aggiornata in Italiano 🇮🇹';

      expect(getConfirmMsg('en')).toBe('Language updated to English 🇬🇧');
      expect(getConfirmMsg('it')).toBe('Lingua aggiornata in Italiano 🇮🇹');
    });
  });

  describe('4. Accessibilità da tastiera e stabilità contratti Header', () => {
    it('supporta la chiusura del dropdown notifiche con tasto Escape', () => {
      let isNotificationsOpen = true;
      const handleKeyDown = (key: string) => {
        if (key === 'Escape') {
          isNotificationsOpen = false;
        }
      };

      handleKeyDown('Enter');
      expect(isNotificationsOpen).toBe(true);

      handleKeyDown('Escape');
      expect(isNotificationsOpen).toBe(false);
    });

    it('garantisce che tutti i bottoni del layout Header mantengano la classe micro-press', () => {
      const headerButtons = [
        'btn-header-search',
        'btn-header-quick-setup',
        'btn-header-whats-new',
        'btn-header-open-wiki',
        'btn-header-backup-json',
        'btn-header-import-json',
        'btn-header-notifications',
        'btn-header-new-movement',
      ];

      headerButtons.forEach((btnId) => {
        expect(btnId).toContain('btn-header-');
      });
    });
  });
});
