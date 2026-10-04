import { WikiArticle, WikiBadge, WikiCategory, WikiCategoryMeta } from '../types/wiki';
import { ReleaseChangelog, APP_CHANGELOG } from '../constants/changelog';
import { WIKI_CATEGORIES, WIKI_ARTICLES } from '../constants/wikiData';
import { WIKI_CATEGORIES_EN, WIKI_ARTICLES_EN } from '../constants/wikiDataEn';
import { SupportedLocale } from '../types';
import { resolveContentLocale } from '../locales/registry';

/**
 * Contenuti Wiki disponibili per lingua. Una lingua senza voce qui usa il primo
 * contenuto compatibile della sua catena di fallback (es. futuro de → en → it).
 */
const WIKI_CONTENT: Partial<Record<SupportedLocale, { categories: WikiCategoryMeta[]; articles: WikiArticle[] }>> = {
  it: { categories: WIKI_CATEGORIES, articles: WIKI_ARTICLES },
  en: { categories: WIKI_CATEGORIES_EN, articles: WIKI_ARTICLES_EN },
};

const WIKI_CONTENT_LOCALES = Object.keys(WIKI_CONTENT) as SupportedLocale[];

function getWikiContent(locale: SupportedLocale) {
  const contentLocale = resolveContentLocale(locale, WIKI_CONTENT_LOCALES);
  return { contentLocale, ...WIKI_CONTENT[contentLocale]! };
}

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
 * Restituisce le categorie della Wiki localizzate in base alla lingua attiva
 */
export function getWikiCategories(locale: SupportedLocale = 'it'): WikiCategoryMeta[] {
  return getWikiContent(locale).categories;
}

/**
 * Genera automaticamente articoli completi per la Mini-Wiki a partire dal registro
 * dei Changelog delle release (APP_CHANGELOG).
 * 
 * Supporta la generazione localizzata in Italiano e Inglese.
 */
export function generateWikiArticlesFromChangelog(
  changelogs: ReleaseChangelog[],
  locale: SupportedLocale = 'it'
): WikiArticle[] {
  const isEn = resolveContentLocale(locale, WIKI_CONTENT_LOCALES) === 'en';

  return changelogs.map((rel) => {
    const articleId = rel.wikiArticleId || `release-v${rel.version}`;
    const totalChanges = rel.added.length + rel.improved.length + rel.fixed.length;
    const readTime = `${Math.max(2, Math.ceil(totalChanges / 2))} min`;

    // Contenuto strutturato Q&A
    const content: string[] = isEn
      ? [
          `Official release v${rel.version} of PC Tracker was published on ${rel.date}. This release includes ${rel.added.length} new features, ${rel.improved.length} user experience improvements and ${rel.fixed.length} stability fixes.`,
          `Summary: ${rel.summary}`,
        ]
      : [
          `La versione ufficiale v${rel.version} di PC Tracker è stata pubblicata il ${rel.date}. Questo rilascio include ${rel.added.length} nuove funzionalità, ${rel.improved.length} ottimizzazioni dell'esperienza utente e ${rel.fixed.length} correzioni di stabilità.`,
          `Panoramica sintetica: ${rel.summary}`,
        ];

    if (rel.added.length > 0) {
      content.push(isEn ? `### ❓ What are the new features introduced in v${rel.version}?` : `### ❓ Quali sono le nuove funzionalità introdotte nella v${rel.version}?`);
      rel.added.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    if (rel.improved.length > 0) {
      content.push(isEn ? `### ⚡ What improvements and optimizations are included?` : `### ⚡ Quali miglioramenti e ottimizzazioni include?`);
      rel.improved.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    if (rel.fixed.length > 0) {
      content.push(isEn ? `### 🛠️ What bugs or critical issues were fixed?` : `### 🛠️ Quali bug o criticità sono stati corretti?`);
      rel.fixed.forEach((item) => {
        const tagBadge = item.tag ? ` [${item.tag}]` : '';
        content.push(`• **${item.title}**${tagBadge}: ${item.description}`);
      });
    }

    // Passaggi operativi personalizzati per release note
    const steps: string[] = [];
    if (rel.version.startsWith('3.')) {
      if (isEn) {
        steps.push('Open the new "PC Care & Health" section from the sidebar to view the Overview with Health Score (0-100) and actionable recommendations.');
        steps.push('Open the "Live Monitoring" tab to observe real-time CPU, RAM, disk usage, NVIDIA GPU temperatures and clock frequencies.');
        steps.push('Run transparent one-click optimizations (SSD TRIM, Disk Cleanup, SFC Repair) to keep your PC fast and efficient.');
      } else {
        steps.push('Accedi alla nuova sezione "Cura del PC" dalla barra laterale per consultare la Panoramica con Health Score (0-100) e le raccomandazioni motivate.');
        steps.push('Apri la scheda "Monitoraggio Live" per osservare in tempo reale il carico di CPU, RAM, spazio dischi e telemetria termica e frequenze GPU NVIDIA.');
        steps.push('Esegui con un click le ottimizzazioni trasparenti proposte (TRIM SSD, Pulizia disco, Riparazione SFC) per mantenere il computer sempre efficiente.');
      }
    } else if (rel.version === '0.3.0') {
      if (isEn) {
        steps.push('Press Ctrl+K (or Cmd+K) from any screen to open the Command Palette and search components, execute quick actions or navigate directly.');
        steps.push('Go to "My Current Rig" or a historical Checkpoint and click "Compare Builds" to analyze hardware, cost and power consumption (TDP) deltas.');
        steps.push('Use the Swap ⇄ button to switch comparison baseline and review the specular differential.');
      } else {
        steps.push('Premi Ctrl+K (o Cmd+K) da qualsiasi schermata per aprire la Command Palette e cercare componenti, eseguire azioni rapide o navigare direttamente.');
        steps.push('Accedi a "Il Mio PC Attuale" o a un Checkpoint storico e clicca su "Confronta Rig" per visualizzare le differenze di hardware, costo e assorbimento energetico (TDP).');
        steps.push('Usa il pulsante Inverti ⇄ per scambiare la baseline di confronto e analizzare il differenziale speculare.');
      }
    } else if (rel.version === '0.2.2') {
      if (isEn) {
        steps.push('Open the "My Current Rig" screen to view real-time Power Budget estimates and verify your PSU adequacy.');
        steps.push('Open any component in inventory and click "Generate Listing" to create ready-to-use descriptions for Subito, eBay and Vinted.');
        steps.push('Open the Receipt Vault to attach PDF/PNG invoice files and track warranty countdowns.');
      } else {
        steps.push('Apri la schermata "Il Mio PC" per visualizzare la stima in tempo reale del Power Budget e verificare l\'adeguatezza del tuo alimentatore (PSU).');
        steps.push('Accedi alla scheda di un componente a magazzino e clicca "Genera Annuncio" per creare in 1 click testi pronti per Subito, eBay e Vinted.');
        steps.push('Apri la Cassaforte Ricevute per allegare scontrini o fatture PDF/PNG e monitorare il conto alla rovescia della garanzia.');
      }
    } else if (rel.version === '0.2.0') {
      if (isEn) {
        steps.push('Access "Time Travel" to rewind the timeline and reconstruct your exact PC build at any historical date.');
        steps.push('Create immutable Checkpoints to freeze milestone builds of your computer.');
      } else {
        steps.push('Accedi alla sezione "Time Travel" per riavvolgere la linea temporale e ricostruire la configurazione esatta del PC in qualsiasi data passata.');
        steps.push('Crea Checkpoint immutabili per congelare pietre miliari storiche del tuo computer.');
      }
    } else {
      if (isEn) {
        steps.push('Verify the installed update through the version displayed in the sidebar.');
        steps.push('Explore new features by visiting their dedicated sections in the application.');
        steps.push('Save a periodic JSON safety backup from the top header for complete peace of mind.');
      } else {
        steps.push('Verifica la presenza dell\'aggiornamento installato tramite la versione visualizzata nella barra laterale.');
        steps.push('Esplora le novità descritte accedendo alle relative sezioni dedicate dell\'applicazione.');
        steps.push('Salva un backup di sicurezza JSON periodico dalla barra superiore per la massima tranquillità.');
      }
    }

    const tips: string[] = isEn
      ? [
          'All PC Tracker Windows updates are cryptographically signed with Ed25519 and preserve 100% of your local IndexedDB data.',
          'You can review concise release notes anytime by clicking the version number at the bottom of the sidebar.',
        ]
      : [
          'Tutti gli aggiornamenti di PC Tracker per Windows sono firmati crittograficamente con chiave Ed25519 e preservano al 100% i tuoi dati residenti su IndexedDB.',
          'Puoi rivedere le note di rilascio sintetiche in qualsiasi momento cliccando sul numero di versione in fondo alla barra laterale.',
        ];

    // Parole chiave per ricerca
    const keywords: string[] = [
      'release',
      'aggiornamento',
      'update',
      'novita',
      'changelog',
      'versione',
      `v${rel.version}`,
      ...rel.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
      ...rel.added.map((a) => a.title.toLowerCase()),
      ...rel.improved.map((i) => i.title.toLowerCase()),
    ];

    // Action links
    const actionLinks = rel.version.startsWith('3.')
      ? [
          { label: isEn ? 'PC Care & Health' : 'Cura del PC & Salute', targetSection: 'maintenance', iconName: 'Wrench' as const },
          { label: isEn ? 'My Current Rig' : 'Il Mio PC Attuale', targetSection: 'current-rig', iconName: 'Cpu' as const },
          { label: isEn ? 'Dashboard' : 'Dashboard', targetSection: 'dashboard', iconName: 'Cpu' as const },
        ]
      : rel.version === '0.3.0'
      ? [
          { label: isEn ? 'My Current Rig' : 'Il Mio PC Attuale', targetSection: 'current-rig', iconName: 'Cpu' as const },
          { label: isEn ? 'Time Travel & Checkpoints' : 'Time Travel & Checkpoint', targetSection: 'time-travel', iconName: 'History' as const },
          { label: isEn ? 'Upgrade History' : 'Storico Upgrade', targetSection: 'upgrades', iconName: 'ArrowUpRight' as const },
        ]
      : rel.version === '0.2.2'
      ? [
          { label: isEn ? 'My Current Rig' : 'Il Mio PC Attuale', targetSection: 'current-rig', iconName: 'Cpu' as const },
          { label: isEn ? 'Sales & Listings' : 'Vendite & Annunci', targetSection: 'marketplace', iconName: 'Tag' as const },
        ]
      : [
          { label: isEn ? 'Dashboard' : 'Dashboard', targetSection: 'dashboard', iconName: 'Cpu' as const },
          { label: isEn ? 'Settings' : 'Impostazioni', targetSection: 'settings', iconName: 'Settings' as const },
        ];

    return {
      id: articleId,
      title: isEn ? `Release Guide v${rel.version}: ${rel.title}` : `Guida Release v${rel.version}: ${rel.title}`,
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
export function getAllWikiArticles(locale: SupportedLocale = 'it'): WikiArticle[] {
  const generated = generateWikiArticlesFromChangelog(APP_CHANGELOG, locale);
  const baseArticles = getWikiContent(locale).articles;
  const existingIds = new Set(baseArticles.map((a) => a.id));
  const uniqueGenerated = generated.filter((a) => !existingIds.has(a.id));
  return [...uniqueGenerated, ...baseArticles];
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

const CLIPBOARD_LABELS: Record<'it' | 'en', { category: string; readTime: string; steps: string; formula: string; tips: string }> = {
  it: { category: 'Categoria', readTime: 'Tempo di lettura', steps: 'Procedura Passo-Passo', formula: 'Formula', tips: 'Consigli Pro' },
  en: { category: 'Category', readTime: 'Reading time', steps: 'Step-by-Step Procedure', formula: 'Formula', tips: 'Pro Tips' },
};

/**
 * Formatta un articolo della Wiki in Markdown pulito per la copia negli appunti
 */
export function formatArticleForClipboard(article: WikiArticle, locale: SupportedLocale = 'it'): string {
  const contentLocale = resolveContentLocale(locale, ['it', 'en']) as 'it' | 'en';
  const labels = CLIPBOARD_LABELS[contentLocale] || CLIPBOARD_LABELS.it;
  const sections: string[] = [
    `# ${article.title}`,
    `*${article.badge} · ${labels.category}: ${article.category} · ${labels.readTime}: ${article.readTime}*`,
    '',
    `> ${article.summary}`,
    '',
    ...article.content,
  ];

  if (article.steps && article.steps.length > 0) {
    sections.push('', `### ${labels.steps}:`);
    article.steps.forEach((step, idx) => {
      sections.push(`${idx + 1}. ${step}`);
    });
  }

  if (article.formula) {
    sections.push('', `### ${labels.formula}: ${article.formula.title}`);
    sections.push('```', article.formula.equation, '```');
    sections.push(article.formula.explanation);
  }

  if (article.tips && article.tips.length > 0) {
    sections.push('', `### ${labels.tips}:`);
    article.tips.forEach((tip) => {
      sections.push(`💡 ${tip}`);
    });
  }

  sections.push('', '---', 'PC Tracker — Hardware Lifecycle & Knowledge Base');
  return sections.join('\n');
}

