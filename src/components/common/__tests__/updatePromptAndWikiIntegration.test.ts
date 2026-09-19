import { describe, it, expect, vi } from 'vitest';
import { APP_CHANGELOG, getChangelogForVersion } from '../../../constants/changelog';
import { getAllWikiArticles, searchWikiArticles, getWikiStats } from '../../../domain/wikiEngine';

describe('Integrazione Aggiornamenti all\'Avvio & Changelog <-> Mini-Wiki', () => {
  describe('1. Logica di Salto Versione e Pop-up Proattivo all\'Avvio', () => {
    it('determina correttamente se aprire la modale all\'avvio in base a versione saltata', () => {
      const shouldPromptUpdate = (
        updateAvailable: boolean,
        newVersion: string | undefined,
        skippedVersion: string | null
      ): boolean => {
        if (!updateAvailable || !newVersion) return false;
        return skippedVersion !== newVersion;
      };

      // Nuovo aggiornamento disponibile, nessuna versione saltata -> apre prompt
      expect(shouldPromptUpdate(true, '0.3.1', null)).toBe(true);

      // Nuovo aggiornamento disponibile, ma l'utente ha saltato specificamente la 0.3.1 -> non apre
      expect(shouldPromptUpdate(true, '0.3.1', '0.3.1')).toBe(false);

      // Esce una versione successiva 0.4.0 dopo aver saltato la 0.3.1 -> riapre il prompt!
      expect(shouldPromptUpdate(true, '0.4.0', '0.3.1')).toBe(true);

      // Nessun aggiornamento disponibile -> non apre
      expect(shouldPromptUpdate(false, undefined, null)).toBe(false);
    });

    it('salva la versione saltata con la chiave convenzionale pctracker_skipped_update_version', () => {
      const mockStorage: Record<string, string> = {};
      const handleSkip = (version: string) => {
        mockStorage['pctracker_skipped_update_version'] = version;
      };

      handleSkip('0.4.0');
      expect(mockStorage['pctracker_skipped_update_version']).toBe('0.4.0');
    });
  });

  describe('2. Generazione Automatica Domande & Guide nella Mini-Wiki da APP_CHANGELOG', () => {
    it('genera un articolo per ogni release presente in APP_CHANGELOG', () => {
      const allArticles = getAllWikiArticles();
      
      APP_CHANGELOG.forEach((rel) => {
        const expectedId = rel.wikiArticleId || `release-v${rel.version}`;
        const found = allArticles.find((a) => a.id === expectedId);
        expect(found).toBeDefined();
        expect(found?.category).toBe('releases');
        expect(found?.badge).toBe('RELEASE');
        expect(found?.title).toContain(rel.version);
        expect(found?.title).toContain(rel.title);
      });
    });

    it('crea sezioni Q&A approfondite nel contenuto degli articoli di release', () => {
      const allArticles = getAllWikiArticles();
      const v030 = allArticles.find((a) => a.id === 'release-v0.3.0');
      expect(v030).toBeDefined();

      const contentText = v030!.content.join('\n');
      expect(contentText).toContain('❓ Quali sono le nuove funzionalità introdotte nella v0.3.0?');
      expect(contentText).toContain('Command Palette Globale');
      expect(contentText).toContain('Rig Comparison');
      expect(contentText).toContain('⚡ Quali miglioramenti e ottimizzazioni include?');
      expect(contentText).toContain('🛠️ Quali bug o criticità sono stati corretti?');
    });

    it('include passi procedurali ed action links verso le sezioni dell\'app', () => {
      const allArticles = getAllWikiArticles();
      const v030 = allArticles.find((a) => a.id === 'release-v0.3.0');
      expect(v030?.steps?.length).toBeGreaterThan(0);
      expect(v030?.steps?.some((s) => s.includes('Ctrl+K'))).toBe(true);

      expect(v030?.actionLinks?.length).toBeGreaterThan(0);
      expect(v030?.actionLinks?.some((l) => l.targetSection === 'current-rig')).toBe(true);
    });

    it('consente la ricerca multi-campo per parole chiave delle release', () => {
      const allArticles = getAllWikiArticles();
      
      // Ricerca per nome feature
      const resultsComp = searchWikiArticles(allArticles, 'Rig Comparison', 'all', 'ALL');
      expect(resultsComp.some((a) => a.id === 'release-v0.3.0')).toBe(true);

      // Ricerca per versione
      const resultsVer = searchWikiArticles(allArticles, '0.2.2', 'all', 'ALL');
      expect(resultsVer.some((a) => a.id === 'release-v0.2.2')).toBe(true);
    });

    it('aggiorna correttamente i contatori statistici della categoria releases e badge RELEASE', () => {
      const allArticles = getAllWikiArticles();
      const stats = getWikiStats(allArticles);

      expect(stats.categoryCounts.releases).toBe(APP_CHANGELOG.length);
      expect(stats.badgeCounts.RELEASE).toBe(APP_CHANGELOG.length);
      expect(stats.totalArticles).toBe(allArticles.length);
    });
  });

  describe('3. Connessione Tasto Mini-Wiki dal Changelog', () => {
    it('target del tasto Mini-Wiki corrisponde a wikiArticleId della release selezionata', () => {
      const targetVersion = '0.3.0';
      const changelog = getChangelogForVersion(targetVersion);
      expect(changelog.wikiArticleId).toBe('release-v0.3.0');

      const onOpenWikiArticle = vi.fn();
      const handleOpenWiki = (artId?: string) => {
        onOpenWikiArticle(artId || `release-v${changelog.version}`);
      };

      handleOpenWiki(changelog.wikiArticleId);
      expect(onOpenWikiArticle).toHaveBeenCalledWith('release-v0.3.0');
    });
  });
});
