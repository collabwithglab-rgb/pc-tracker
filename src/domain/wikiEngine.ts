import { WikiArticle, WikiBadge, WikiCategory } from '../types/wiki';
import { ReleaseChangelog, APP_CHANGELOG } from '../constants/changelog';
import { WIKI_ARTICLES } from '../constants/wikiData';

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
 * Genera automaticamente articoli completi per la Mini-Wiki a partire dal registro
 * dei Changelog delle release (APP_CHANGELOG).
 * 
 * Ogni release viene trasformata in un articolo strutturato con:
 * - Titolo e sintesi ufficiale
 * - Sezione Domande Frequenti (Q&A) sulle novità, miglioramenti e fix
 * - Procedure passo-passo operative
 * - Action links interattivi verso le sezioni dell'app
 * - Indicizzazione per parole chiave
 */
export function generateWikiArticlesFromChangelog(changelogs: ReleaseChangelog[]): WikiArticle[] {
  return changelogs.map((rel) => {
    const articleId = rel.wikiArticleId || `release-v${rel.version}`;
    const totalChanges = rel.added.length + rel.improved.length + rel.fixed.length;
    const readTime = `${Math.max(2, Math.ceil(totalChanges / 2))} min`;

    // Contenuto strutturato Q&A
    const content: string[] = [
      `La versione ufficiale v${rel.version} di PC Tracker è stata pubblicata il ${rel.date}. Questo rilascio include ${rel.added.length} nuove funzionalità, ${rel.improved.length} ottimizzazioni dell'esperienza utente e ${rel.fixed.length} correzioni di stabilità.`,
      `Panoramica sintetica: ${rel.summary}`,
    ];

    if (rel.added.length > 0) {
      content.push(`### ❓ Quali sono le nuove funzionalità introdotte nella v${rel.version}?`);
      rel.added.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    if (rel.improved.length > 0) {
      content.push(`### ⚡ Quali miglioramenti e ottimizzazioni include?`);
      rel.improved.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    if (rel.fixed.length > 0) {
      content.push(`### 🛠️ Quali bug o criticità sono stati corretti?`);
      rel.fixed.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    // Passaggi operativi personalizzati per release note
    const steps: string[] = [];
    if (rel.version === '0.3.0') {
      steps.push('Premi Ctrl+K (o Cmd+K) da qualsiasi schermata per aprire la Command Palette e cercare componenti, eseguire azioni rapide o navigare direttamente.');
      steps.push('Accedi a "Il Mio PC Attuale" o a un Checkpoint storico e clicca su "Confronta Rig" per visualizzare le differenze di hardware, costo e assorbimento energetico (TDP).');
      steps.push('Usa il pulsante Inverti ⇄ per scambiare la baseline di confronto e analizzare il differenziale speculare.');
    } else if (rel.version === '0.2.2') {
      steps.push('Apri la schermata "Il Mio PC" per visualizzare la stima in tempo reale del Power Budget e verificare l\'adeguatezza del tuo alimentatore (PSU).');
      steps.push('Accedi alla scheda di un componente a magazzino e clicca "Genera Annuncio" per creare in 1 click testi pronti per Subito, eBay e Vinted.');
      steps.push('Apri la Cassaforte Ricevute per allegare scontrini o fatture PDF/PNG e monitorare il conto alla rovescia della garanzia.');
    } else if (rel.version === '0.2.0') {
      steps.push('Accedi alla sezione "Time Travel" per riavvolgere la linea temporale e ricostruire la configurazione esatta del PC in qualsiasi data passata.');
      steps.push('Crea Checkpoint immutabili per congelare pietre miliari storiche del tuo computer.');
    } else {
      steps.push('Verifica la presenza dell\'aggiornamento installato tramite la versione visualizzata nella barra laterale.');
      steps.push('Esplora le novità descritte accedendo alle relative sezioni dedicate dell\'applicazione.');
      steps.push('Salva un backup di sicurezza JSON periodico dalla barra superiore per la massima tranquillità.');
    }

    const tips: string[] = [
      'Tutti gli aggiornamenti di PC Tracker per Windows sono firmati crittograficamente con chiave Ed25519 e preservano al 100% i tuoi dati residenti su IndexedDB.',
      'Puoi rivedere le note di rilascio sintetiche in qualsiasi momento cliccando sul numero di versione in fondo alla barra laterale.',
    ];

    // Parole chiave per ricerca
    const keywords: string[] = [
      'release',
      'aggiornamento',
      'novita',
      'changelog',
      'versione',
      `v${rel.version}`,
      ...rel.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
      ...rel.added.map((a) => a.title.toLowerCase()),
      ...rel.improved.map((i) => i.title.toLowerCase()),
    ];

    // Action links
    const actionLinks = rel.version === '0.3.0'
      ? [
          { label: 'Il Mio PC Attuale', targetSection: 'current-rig', iconName: 'Cpu' as const },
          { label: 'Time Travel & Checkpoint', targetSection: 'time-travel', iconName: 'History' as const },
          { label: 'Storico Upgrade', targetSection: 'upgrades', iconName: 'ArrowUpRight' as const },
        ]
      : rel.version === '0.2.2'
      ? [
          { label: 'Il Mio PC Attuale', targetSection: 'current-rig', iconName: 'Cpu' as const },
          { label: 'Vendite & Annunci', targetSection: 'marketplace', iconName: 'Tag' as const },
        ]
      : [
          { label: 'Dashboard', targetSection: 'dashboard', iconName: 'Cpu' as const },
          { label: 'Impostazioni', targetSection: 'settings', iconName: 'Settings' as const },
        ];

    return {
      id: articleId,
      title: `Guida Release v${rel.version}: ${rel.title}`,
      category: 'releases',
      badge: 'RELEASE',
      readTime,
      summary: rel.summary,
      content,
      steps,
      tips,
      keywords,
      actionLinks,
    };
  });
}

/**
 * Restituisce l'elenco completo unificato di tutti gli articoli della Mini-Wiki,
 * fondendo la knowledge base manuale con gli articoli auto-generati dal changelog delle release.
 */
export function getAllWikiArticles(): WikiArticle[] {
  const generated = generateWikiArticlesFromChangelog(APP_CHANGELOG);
  const existingIds = new Set(WIKI_ARTICLES.map((a) => a.id));
  const uniqueGenerated = generated.filter((a) => !existingIds.has(a.id));
  return [...uniqueGenerated, ...WIKI_ARTICLES];
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
    releases: 0,
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
    RELEASE: 0,
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

