import { describe, it, expect } from 'vitest';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from '../../constants/wikiData';
import { searchWikiArticles, getWikiStats, normalizeSearchTerm, formatArticleForClipboard, getAllWikiArticles } from '../wikiEngine';

describe('Wiki Engine & Knowledge Base Suite', () => {
  it('should have properly configured categories metadata', () => {
    expect(WIKI_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    expect(WIKI_CATEGORIES.some((c) => c.id === 'all')).toBe(true);
    expect(WIKI_CATEGORIES.some((c) => c.id === 'getting-started')).toBe(true);
    expect(WIKI_CATEGORIES.some((c) => c.id === 'finances')).toBe(true);
    expect(WIKI_CATEGORIES.some((c) => c.id === 'marketplace')).toBe(true);
    expect(WIKI_CATEGORIES.some((c) => c.id === 'maintenance')).toBe(true);
  });

  it('should ensure all wiki articles have unique IDs and complete required fields', () => {
    const idSet = new Set<string>();

    for (const article of WIKI_ARTICLES) {
      expect(article.id).toBeDefined();
      expect(article.id.trim().length).toBeGreaterThan(0);
      expect(idSet.has(article.id)).toBe(false);
      idSet.add(article.id);

      expect(article.title.trim().length).toBeGreaterThan(0);
      expect(article.summary.trim().length).toBeGreaterThan(0);
      expect(article.content.length).toBeGreaterThan(0);
      expect(article.keywords.length).toBeGreaterThan(0);
      expect(article.readTime.trim().length).toBeGreaterThan(0);

      // Categoria valida
      expect(WIKI_CATEGORIES.some((cat) => cat.id === article.category)).toBe(true);

      // Se ha formule, devono essere complete
      if (article.formula) {
        expect(article.formula.title.trim().length).toBeGreaterThan(0);
        expect(article.formula.equation.trim().length).toBeGreaterThan(0);
      }

      // Se ha actionLinks, devono avere label valida
      if (article.actionLinks) {
        for (const link of article.actionLinks) {
          expect(link.label.trim().length).toBeGreaterThan(0);
          expect(Boolean(link.targetSection || link.actionType)).toBe(true);
        }
      }
    }
  });

  it('should normalize search terms and remove accents correctly', () => {
    expect(normalizeSearchTerm('  CPU & Scheda Madre  ')).toBe('cpu & scheda madre');
    expect(normalizeSearchTerm('Qualità & Velocità')).toBe('qualita & velocita');
  });

  it('should return all articles when query is empty and category is all', () => {
    const results = searchWikiArticles(WIKI_ARTICLES, '', 'all', 'ALL');
    expect(results.length).toBe(WIKI_ARTICLES.length);
  });

  it('should filter articles by category', () => {
    const financesArticles = searchWikiArticles(WIKI_ARTICLES, '', 'finances', 'ALL');
    expect(financesArticles.length).toBeGreaterThan(0);
    expect(financesArticles.every((a) => a.category === 'finances')).toBe(true);

    const maintenanceArticles = searchWikiArticles(WIKI_ARTICLES, '', 'maintenance', 'ALL');
    expect(maintenanceArticles.length).toBeGreaterThan(0);
    expect(maintenanceArticles.every((a) => a.category === 'maintenance')).toBe(true);
  });

  it('should filter articles by badge', () => {
    const tutorialArticles = searchWikiArticles(WIKI_ARTICLES, '', 'all', 'TUTORIAL');
    expect(tutorialArticles.length).toBeGreaterThan(0);
    expect(tutorialArticles.every((a) => a.badge === 'TUTORIAL')).toBe(true);

    const faqArticles = searchWikiArticles(WIKI_ARTICLES, '', 'all', 'FAQ');
    expect(faqArticles.length).toBeGreaterThan(0);
    expect(faqArticles.every((a) => a.badge === 'FAQ')).toBe(true);
  });

  it('should search accurately across titles, summaries, keywords and formulas', () => {
    // Ricerca su keyword Subito / Marketplace
    const subitoResults = searchWikiArticles(WIKI_ARTICLES, 'subito', 'all', 'ALL');
    expect(subitoResults.length).toBeGreaterThan(0);
    expect(subitoResults.some((a) => a.id === 'listing-generator-guide')).toBe(true);

    // Ricerca su RAM Kit
    const ramResults = searchWikiArticles(WIKI_ARTICLES, 'ram kit', 'all', 'ALL');
    expect(ramResults.length).toBeGreaterThan(0);
    expect(ramResults.some((a) => a.id === 'faq-ram-kit')).toBe(true);

    // Ricerca su Shader Cache
    const shaderResults = searchWikiArticles(WIKI_ARTICLES, 'shader cache', 'all', 'ALL');
    expect(shaderResults.length).toBeGreaterThan(0);
    expect(shaderResults.some((a) => a.id === 'windows-tools-explained')).toBe(true);

    // Ricerca su Checkpoint
    const checkpointResults = searchWikiArticles(WIKI_ARTICLES, 'checkpoint', 'all', 'ALL');
    expect(checkpointResults.length).toBeGreaterThan(0);
    expect(checkpointResults.some((a) => a.id === 'checkpoints-immutability')).toBe(true);

    // Ricerca senza corrispondenze
    const noResults = searchWikiArticles(WIKI_ARTICLES, 'nonexistentxyzterm12345', 'all', 'ALL');
    expect(noResults.length).toBe(0);
  });

  it('should calculate accurate wiki statistics', () => {
    const stats = getWikiStats(WIKI_ARTICLES);
    expect(stats.totalArticles).toBe(WIKI_ARTICLES.length);
    expect(stats.categoryCounts.all).toBe(WIKI_ARTICLES.length);
    expect(stats.badgeCounts.ALL).toBe(WIKI_ARTICLES.length);

    let sumCategories = 0;
    for (const cat of WIKI_CATEGORIES) {
      if (cat.id !== 'all') {
        sumCategories += stats.categoryCounts[cat.id] || 0;
      }
    }
    expect(sumCategories).toBe(WIKI_ARTICLES.length);
    expect(stats.categoryCounts.glossary).toBe(11);
  });

  it('should search and retrieve hardware glossary technical terms accurately', () => {
    const undervoltRes = searchWikiArticles(WIKI_ARTICLES, 'undervolt', 'all', 'ALL');
    expect(undervoltRes.length).toBeGreaterThan(0);
    expect(undervoltRes.some((a) => a.id === 'glossary-undervolt')).toBe(true);

    const tdpRes = searchWikiArticles(WIKI_ARTICLES, 'tdp tgp', 'all', 'ALL');
    expect(tdpRes.length).toBeGreaterThan(0);
    expect(tdpRes.some((a) => a.id === 'glossary-tdp-tgp')).toBe(true);

    const clRes = searchWikiArticles(WIKI_ARTICLES, 'cas latency cl30', 'all', 'ALL');
    expect(clRes.length).toBeGreaterThan(0);
    expect(clRes.some((a) => a.id === 'glossary-cas-latency')).toBe(true);
  });

  it('should format articles cleanly for clipboard in Markdown with all metadata', () => {
    const sampleArticle = WIKI_ARTICLES.find((a) => a.id === 'glossary-cas-latency');
    expect(sampleArticle).toBeDefined();

    if (sampleArticle) {
      const formatted = formatArticleForClipboard(sampleArticle);
      expect(formatted).toContain(`# ${sampleArticle.title}`);
      expect(formatted).toContain(`> ${sampleArticle.summary}`);
      expect(formatted).toContain('Formula');
      expect(formatted).toContain('Consigli Pro');
      expect(formatted).toContain('PC Tracker');
    }
  });

  it('should generate complete wiki articles with QA and steps from changelogs', () => {
    const allArticles = getAllWikiArticles();
    expect(allArticles.length).toBeGreaterThan(WIKI_ARTICLES.length);

    // Deve includere l'articolo di release v3.1.0
    const v250Article = allArticles.find((a) => a.id === 'release-v3.1.0');
    expect(v250Article).toBeDefined();
    expect(v250Article?.category).toBe('releases');
    expect(v250Article?.badge).toBe('RELEASE');
    expect(v250Article?.content.some((c) => c.includes('PC Care Center'))).toBe(true);
    expect(v250Article?.steps?.length).toBeGreaterThan(0);
    expect(v250Article?.actionLinks?.length).toBeGreaterThan(0);

    // Deve includere l'articolo di release v0.3.0
    const v030Article = allArticles.find((a) => a.id === 'release-v0.3.0');
    expect(v030Article).toBeDefined();
    expect(v030Article?.category).toBe('releases');
    expect(v030Article?.badge).toBe('RELEASE');
    expect(v030Article?.content.some((c) => c.includes('Command Palette'))).toBe(true);
    expect(v030Article?.steps?.length).toBeGreaterThan(0);
    expect(v030Article?.actionLinks?.length).toBeGreaterThan(0);

    // Ricerca per numero versione
    const search310 = searchWikiArticles(allArticles, '3.1.0', 'all', 'ALL');
    expect(search310.some((a) => a.id === 'release-v3.1.0')).toBe(true);
    const search030 = searchWikiArticles(allArticles, '0.3.0', 'all', 'ALL');
    expect(search030.some((a) => a.id === 'release-v0.3.0')).toBe(true);

    // Ricerca per feature nella release
    const searchPalette = searchWikiArticles(allArticles, 'command palette', 'releases', 'ALL');
    expect(searchPalette.length).toBeGreaterThan(0);
    expect(searchPalette.every((a) => a.category === 'releases')).toBe(true);

    // Statistiche corrette
    const stats = getWikiStats(allArticles);
    expect(stats.categoryCounts.releases).toBeGreaterThanOrEqual(4);
    expect(stats.badgeCounts.RELEASE).toBeGreaterThanOrEqual(4);
  });
});
