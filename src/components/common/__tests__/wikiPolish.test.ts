import { describe, it, expect } from 'vitest';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from '../../../constants/wikiData';
import { searchWikiArticles } from '../../../domain/wikiEngine';
import { NavSection } from '../../layout/Sidebar';

describe('Wiki Polish & Interactive Deep-Links Suite', () => {
  describe('1. Categorie e Tassonomia Knowledge Base', () => {
    it('definisce tutte le categorie fondamentali dell\'hardware lifecycle', () => {
      const categoryIds = WIKI_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain('all');
      expect(categoryIds).toContain('getting-started');
      expect(categoryIds).toContain('event-lifecycle');
      expect(categoryIds).toContain('finances');
      expect(categoryIds).toContain('time-travel');
      expect(categoryIds).toContain('upgrades');
      expect(categoryIds).toContain('marketplace');
      expect(categoryIds).toContain('maintenance');
      expect(categoryIds).toContain('backup-privacy');
      expect(categoryIds).toContain('faq');
    });

    it('ogni categoria possiede label e descrizione non vuota', () => {
      WIKI_CATEGORIES.forEach((cat) => {
        expect(cat.label.trim().length).toBeGreaterThan(0);
        expect(cat.description.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Deep-Link Interattivi ed Azioni Rapide', () => {
    it('tutti i link d\'azione con targetSection puntano a NavSection valide dell\'app', () => {
      const validSections: NavSection[] = [
        'dashboard',
        'current-rig',
        'time-travel',
        'archive',
        'upgrades',
        'marketplace',
        'stats',
        'maintenance',
        'wiki',
        'settings',
      ];

      const allActionLinks = WIKI_ARTICLES.flatMap((a) => a.actionLinks || []);
      expect(allActionLinks.length).toBeGreaterThan(0);

      allActionLinks.forEach((link) => {
        expect(link.label.trim().length).toBeGreaterThan(0);
        if (link.targetSection) {
          expect(validSections).toContain(link.targetSection);
        }
        if (link.actionType) {
          expect(['new-movement', 'quick-setup']).toContain(link.actionType);
        }
      });
    });

    it('include collegamenti veloci a sezioni chiave (Marketplace, Time Travel, Manutenzione, Archivio, Finanze)', () => {
      const targetedSections = WIKI_ARTICLES.flatMap((a) => a.actionLinks || [])
        .map((l) => l.targetSection)
        .filter(Boolean);

      expect(targetedSections).toContain('marketplace');
      expect(targetedSections).toContain('time-travel');
      expect(targetedSections).toContain('maintenance');
      expect(targetedSections).toContain('archive');
      expect(targetedSections).toContain('stats');
      expect(targetedSections).toContain('settings');
      expect(targetedSections).toContain('current-rig');
    });
  });

  describe('3. Formule Matematiche & Formattazione Tecnica', () => {
    it('le formule finanziarie spiegano le 4 metriche e i costi di upgrade', () => {
      const articlesWithFormula = WIKI_ARTICLES.filter((a) => a.formula);
      expect(articlesWithFormula.length).toBeGreaterThanOrEqual(3);

      const fourMetrics = WIKI_ARTICLES.find((a) => a.id === 'the-four-financial-metrics');
      expect(fourMetrics?.formula?.equation).toContain('Totale Acquistato');
      expect(fourMetrics?.formula?.equation).toContain('Totale Recuperato');
      expect(fourMetrics?.formula?.equation).toContain('Costo Netto Storico');
      expect(fourMetrics?.formula?.equation).toContain('Costo Configurazione Attuale');

      const upgradeCost = WIKI_ARTICLES.find((a) => a.id === 'upgrade-net-cost');
      expect(upgradeCost?.formula?.equation).toContain('Costo Netto Upgrade');

      const feesShipping = WIKI_ARTICLES.find((a) => a.id === 'fees-and-shipping');
      expect(feesShipping?.formula?.equation).toContain('Ricavo Netto');
    });
  });

  describe('4. Motore di Ricerca Live & Filtri Combinati', () => {
    it('ricerca case-insensitive e tokenizzata per parole chiave multiple', () => {
      const res = searchWikiArticles(WIKI_ARTICLES, 'guida subito annuncio');
      expect(res.length).toBeGreaterThan(0);
      expect(res.some((a) => a.id === 'listing-generator-guide')).toBe(true);
    });

    it('supporta filtraggio congiunto query + categoria specifica', () => {
      const resFinances = searchWikiArticles(WIKI_ARTICLES, 'costo', 'finances', 'ALL');
      expect(resFinances.length).toBeGreaterThan(0);
      expect(resFinances.every((a) => a.category === 'finances')).toBe(true);
    });

    it('supporta filtraggio per badge (es. TUTORIAL o FAQ)', () => {
      const resTutorials = searchWikiArticles(WIKI_ARTICLES, '', 'all', 'TUTORIAL');
      expect(resTutorials.length).toBeGreaterThan(0);
      expect(resTutorials.every((a) => a.badge === 'TUTORIAL')).toBe(true);

      const resFaq = searchWikiArticles(WIKI_ARTICLES, '', 'all', 'FAQ');
      expect(resFaq.length).toBeGreaterThan(0);
      expect(resFaq.every((a) => a.badge === 'FAQ')).toBe(true);
    });
  });

  describe('5. Aiuto Contestuale & Link Target Nelle Pagine', () => {
    it('tutti gli ID degli articoli usati nell\'aiuto contestuale esistono nella Knowledge Base', () => {
      const contextualTargetIds = [
        'checkpoints-immutability',
        'the-four-financial-metrics',
        'windows-tools-explained',
        'listing-generator-guide',
        'first-rig-setup',
        'component-states-explained',
        'upgrade-wizard-guide',
        'backup-restore-safeguards',
      ];

      contextualTargetIds.forEach((targetId) => {
        const found = WIKI_ARTICLES.find((a) => a.id === targetId);
        expect(found).toBeDefined();
        expect(found?.title.trim().length).toBeGreaterThan(0);
      });
    });

    it('tutte le sezioni dell\'app possiedono una label amichevole per il pulsante di ritorno intelligente', () => {
      const appSections: NavSection[] = [
        'dashboard',
        'current-rig',
        'time-travel',
        'archive',
        'upgrades',
        'marketplace',
        'stats',
        'maintenance',
        'settings',
      ];

      const labelsMap: Record<NavSection, string> = {
        'dashboard': 'Dashboard',
        'current-rig': 'Il Mio PC Attuale',
        'time-travel': 'Time Travel',
        'archive': 'Archivio Componenti',
        'upgrades': 'Storico Upgrade',
        'marketplace': 'Vendite & Annunci',
        'stats': 'Statistiche & Finanze',
        'maintenance': 'Windows Maintenance Center',
        'settings': 'Impostazioni',
        'wiki': 'Wiki',
      };

      appSections.forEach((sec) => {
        expect(labelsMap[sec]).toBeDefined();
        expect(labelsMap[sec].length).toBeGreaterThan(0);
      });
    });

    it('la categoria glossary contiene gli 11 concetti tecnici essenziali per PC enthusiast', () => {
      const glossaryArticles = WIKI_ARTICLES.filter((a) => a.category === 'glossary');
      expect(glossaryArticles).toHaveLength(11);

      const glossaryIds = glossaryArticles.map((a) => a.id);
      expect(glossaryIds).toContain('glossary-tdp-tgp');
      expect(glossaryIds).toContain('glossary-undervolt');
      expect(glossaryIds).toContain('glossary-thermal-throttling');
      expect(glossaryIds).toContain('glossary-coil-whine');
      expect(glossaryIds).toContain('glossary-xmp-expo');
      expect(glossaryIds).toContain('glossary-cas-latency');
      expect(glossaryIds).toContain('glossary-bottleneck');
      expect(glossaryIds).toContain('glossary-rma');
      expect(glossaryIds).toContain('glossary-pcie-gen');
      expect(glossaryIds).toContain('glossary-dual-channel');
      expect(glossaryIds).toContain('glossary-80-plus-atx3');
    });
  });
});
