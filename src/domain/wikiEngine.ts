import { WikiArticle, WikiBadge, WikiCategory } from '../types/wiki';

/**
 * Normalizza una stringa per ricerca case-insensitive senza accenti/spazi superflui
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtra gli articoli della Wiki in base alla query di ricerca, alla categoria e al badge.
 * La ricerca è multi-campo su:
 * - Titolo
 * - Riassunto
 * - Paragrafi di contenuto
 * - Passaggi numerati (steps)
 * - Equazioni o spiegazioni formule
 * - Consigli pro (tips)
 * - Parole chiave (keywords)
 */
export function searchWikiArticles(
  articles: WikiArticle[],
  query: string,
  category: WikiCategory = 'all',
  badge: WikiBadge | 'ALL' = 'ALL'
): WikiArticle[] {
  const normalizedQuery = normalizeSearchTerm(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return articles.filter((article) => {
    // 1. Filtro Categoria
    if (category !== 'all' && article.category !== category) {
      return false;
    }

    // 2. Filtro Badge
    if (badge !== 'ALL' && article.badge !== badge) {
      return false;
    }

    // 3. Se la query è vuota, passa il filtro
    if (queryTokens.length === 0) {
      return true;
    }

    // 4. Ricerca testuale multi-campo normalizzata
    const searchableFields = [
      article.title,
      article.summary,
      ...article.content,
      ...(article.steps || []),
      ...(article.tips || []),
      ...(article.keywords || []),
      article.formula?.title || '',
      article.formula?.equation || '',
      article.formula?.explanation || '',
    ];

    const searchableText = normalizeSearchTerm(searchableFields.join(' '));

    // Tutti i token devono essere presenti nel testo cercabile (ricerca AND)
    return queryTokens.every((token) => searchableText.includes(token));
  });
}

/**
 * Calcola statistiche aggregate sugli articoli della Wiki
 */
export function getWikiStats(articles: WikiArticle[]) {
  const categoryCounts: Record<WikiCategory, number> = {
    all: articles.length,
    'getting-started': 0,
    'event-lifecycle': 0,
    finances: 0,
    'time-travel': 0,
    upgrades: 0,
    marketplace: 0,
    maintenance: 0,
    'backup-privacy': 0,
    glossary: 0,
    faq: 0,
  };

  const badgeCounts: Record<WikiBadge | 'ALL', number> = {
    ALL: articles.length,
    TUTORIAL: 0,
    'CONCETTO CHIAVE': 0,
    'TIP PRO': 0,
    FAQ: 0,
    FINANZE: 0,
    WINDOWS: 0,
  };

  for (const article of articles) {
    if (categoryCounts[article.category] !== undefined) {
      categoryCounts[article.category]++;
    }
    if (badgeCounts[article.badge] !== undefined) {
      badgeCounts[article.badge]++;
    }
  }

  return {
    totalArticles: articles.length,
    categoryCounts,
    badgeCounts,
  };
}

/**
 * Formatta un articolo della Wiki in Markdown pulito per la copia negli appunti
 */
export function formatArticleForClipboard(article: WikiArticle): string {
  const sections: string[] = [
    `# ${article.title}`,
    `*${article.badge} · Categoria: ${article.category} · Tempo di lettura: ${article.readTime}*`,
    '',
    `> ${article.summary}`,
    '',
    ...article.content,
  ];

  if (article.steps && article.steps.length > 0) {
    sections.push('', '### Procedura Passo-Passo:');
    article.steps.forEach((step, idx) => {
      sections.push(`${idx + 1}. ${step}`);
    });
  }

  if (article.formula) {
    sections.push('', `### Formula: ${article.formula.title}`);
    sections.push('```', article.formula.equation, '```');
    sections.push(article.formula.explanation);
  }

  if (article.tips && article.tips.length > 0) {
    sections.push('', '### Consigli Pro:');
    article.tips.forEach((tip) => {
      sections.push(`💡 ${tip}`);
    });
  }

  sections.push('', '---', 'PC Tracker — Hardware Lifecycle & Knowledge Base');
  return sections.join('\n');
}

