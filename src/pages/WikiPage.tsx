import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  X,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Sparkles,
  Cpu,
  History,
  ArrowUpRight,
  Archive,
  Tag,
  BarChart3,
  Wrench,
  Settings,
  Plus,
  Calculator,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Star,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from '../constants/wikiData';
import { WikiActionLink, WikiArticle, WikiBadge, WikiCategory } from '../types/wiki';
import { searchWikiArticles, getWikiStats, formatArticleForClipboard } from '../domain/wikiEngine';
import { NavSection } from '../components/layout/Sidebar';

interface WikiPageProps {
  initialArticleId?: string | null;
  referrerSection?: NavSection | null;
  onBackToReferrer?: () => void;
  onNavigate?: (section: NavSection) => void;
  onOpenMovementSelector?: () => void;
  onOpenQuickSetup?: () => void;
}

const getReferrerLabel = (section: NavSection): string => {
  switch (section) {
    case 'dashboard':
      return 'Dashboard';
    case 'current-rig':
      return 'Il Mio PC Attuale';
    case 'time-travel':
      return 'Time Travel';
    case 'archive':
      return 'Archivio Componenti';
    case 'upgrades':
      return 'Storico Upgrade';
    case 'marketplace':
      return 'Vendite & Annunci';
    case 'stats':
      return 'Statistiche & Finanze';
    case 'maintenance':
      return 'Windows Maintenance Center';
    case 'settings':
      return 'Impostazioni';
    default:
      return 'Schermata Precedente';
  }
};

export const WikiPage: React.FC<WikiPageProps> = ({
  initialArticleId,
  referrerSection,
  onBackToReferrer,
  onNavigate,
  onOpenMovementSelector,
  onOpenQuickSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<WikiCategory>('all');
  const [activeBadge, setActiveBadge] = useState<WikiBadge | 'ALL'>('ALL');
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['first-rig-setup', 'the-four-financial-metrics']));
  const [targetHighlightId, setTargetHighlightId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Caricamento preferiti da localStorage
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pctracker_wiki_bookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Gestione apertura contestuale mirata (Deep-Link da altre schermate)
  useEffect(() => {
    if (initialArticleId) {
      setExpandedIds((prev) => new Set([...prev, initialArticleId]));
      setTargetHighlightId(initialArticleId);
      setActiveCategory('all');
      setActiveBadge('ALL');
      setOnlyBookmarks(false);
      setSearchQuery('');

      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`wiki-article-${initialArticleId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      const clearHighlightTimer = setTimeout(() => {
        setTargetHighlightId(null);
      }, 3500);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearHighlightTimer);
      };
    }
  }, [initialArticleId]);

  // Scorciatoie da Tastiera: '/' per focus e 'Escape' per pulizia
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle Preferiti con persistenza
  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('pctracker_wiki_bookmarks', JSON.stringify(Array.from(next)));
      } catch {
        // Nessun blocco se localStorage è ristretto
      }
      return next;
    });
  };

  // Copia Guida negli Appunti
  const handleCopyArticle = async (article: WikiArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const formatted = formatArticleForClipboard(article);
      await navigator.clipboard.writeText(formatted);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Impossibile copiare negli appunti:', err);
    }
  };

  // Statistiche e conteggi
  const stats = useMemo(() => getWikiStats(WIKI_ARTICLES), []);

  // Filtraggio live ottimizzato tramite useMemo
  const filteredArticles = useMemo(() => {
    const base = searchWikiArticles(WIKI_ARTICLES, searchQuery, activeCategory, activeBadge);
    if (!onlyBookmarks) return base;
    return base.filter((a) => bookmarkedIds.has(a.id));
  }, [searchQuery, activeCategory, activeBadge, onlyBookmarks, bookmarkedIds]);

  // Toggle apertura/chiusura singolo articolo
  const toggleArticle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Espandi tutto / Comprimi tutto
  const handleExpandAll = () => {
    setExpandedIds(new Set(filteredArticles.map((a) => a.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Ripristina filtri di ricerca
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setActiveBadge('ALL');
    setOnlyBookmarks(false);
  };

  // Esecuzione Deep-Link Interattivi
  const handleActionClick = (link: WikiActionLink) => {
    if (link.actionType === 'new-movement' && onOpenMovementSelector) {
      onOpenMovementSelector();
      return;
    }
    if (link.actionType === 'quick-setup' && onOpenQuickSetup) {
      onOpenQuickSetup();
      return;
    }
    if (link.targetSection && onNavigate) {
      onNavigate(link.targetSection as NavSection);
      return;
    }
  };

  // Render dell'icona corretta per l'action link
  const renderActionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu size={14} />;
      case 'History':
        return <History size={14} />;
      case 'ArrowUpRight':
        return <ArrowUpRight size={14} />;
      case 'Archive':
        return <Archive size={14} />;
      case 'Tag':
        return <Tag size={14} />;
      case 'BarChart3':
        return <BarChart3 size={14} />;
      case 'Wrench':
        return <Wrench size={14} />;
      case 'Settings':
        return <Settings size={14} />;
      case 'Plus':
        return <Plus size={14} />;
      case 'Sparkles':
        return <Sparkles size={14} />;
      default:
        return <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />;
    }
  };

  // Helper classe CSS del badge
  const getBadgeClass = (badge: WikiBadge): string => {
    switch (badge) {
      case 'TUTORIAL':
        return 'wiki-badge-tutorial';
      case 'CONCETTO CHIAVE':
        return 'wiki-badge-concetto-chiave';
      case 'TIP PRO':
        return 'wiki-badge-tip-pro';
      case 'FAQ':
        return 'wiki-badge-faq';
      case 'FINANZE':
        return 'wiki-badge-finanze';
      case 'WINDOWS':
        return 'wiki-badge-windows';
      default:
        return 'wiki-badge-tutorial';
    }
  };

  // Evidenziazione visiva <mark> dei termini cercati
  const renderHighlighted = (text: string): React.ReactNode => {
    const q = searchQuery.trim();
    if (!q) return text;

    const tokens = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (tokens.length === 0) return text;

    const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="wiki-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const BADGE_OPTIONS: Array<{ id: WikiBadge | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Tutti i formati' },
    { id: 'TUTORIAL', label: 'Tutorial' },
    { id: 'CONCETTO CHIAVE', label: 'Concetti Chiave' },
    { id: 'TIP PRO', label: 'Tip Pro' },
    { id: 'FINANZE', label: 'Finanze' },
    { id: 'WINDOWS', label: 'Windows' },
    { id: 'FAQ', label: 'FAQ' },
  ];

  return (
    <div className="wiki-container" id="wiki-page">
      {/* Banner di Ritorno Intelligente alla Schermata Precedente */}
      {referrerSection && onBackToReferrer && (
        <div className="wiki-referrer-banner animate-slide-up">
          <button
            type="button"
            className="wiki-back-to-referrer-btn micro-press"
            onClick={onBackToReferrer}
            id="btn-wiki-back-to-referrer"
          >
            <ArrowLeft size={14} />
            <span>Torna a {getReferrerLabel(referrerSection)}</span>
          </button>
          <span className="wiki-referrer-hint">
            Stavi visualizzando questa sezione prima di aprire la guida
          </span>
        </div>
      )}

      {/* 1. Hero & Search Header */}
      <section className="wiki-hero">
        <div className="wiki-hero-header">
          <div className="wiki-hero-title-group">
            <h2 className="wiki-hero-title">
              <BookOpen size={24} color="var(--accent-primary)" />
              <span>Wiki & Guida Ufficiale</span>
            </h2>
            <p className="wiki-hero-subtitle">
              Manuale d'uso interattivo, dizionario hardware per enthusiast, spiegazione formule finanziarie e risposte immediate.
            </p>
          </div>

          <div className="wiki-hero-stats">
            <span className="wiki-stat-pill" title="Totale guide e schede tecniche disponibili">
              <strong>{stats.totalArticles}</strong> Guide & Voci
            </span>
            <span className="wiki-stat-pill" title="Architettura 100% in locale su IndexedDB">
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              100% Offline & Locale
            </span>
          </div>
        </div>

        {/* Barra di Ricerca Live con Kbd Hint */}
        <div className="wiki-search-wrapper">
          <Search size={18} className="wiki-search-input-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="wiki-search-input"
            placeholder="Cerca qualsiasi argomento o premi '/' per cercare (es. subito, ram, formula, shader, pcie, undervolt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="input-wiki-search"
          />
          {searchQuery.trim().length === 0 ? (
            <span className="wiki-search-kbd-hint" title="Premi '/' per cercare rapidamente">/</span>
          ) : (
            <button
              type="button"
              className="wiki-search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              title="Azzera ricerca (Esc)"
              id="btn-wiki-search-clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* 2. Categorie a Chips Orizzontali con Tasto Salvati */}
      <div className="wiki-category-chips" role="tablist" aria-label="Categorie Wiki">
        {/* Chip Filtro Preferiti */}
        <button
          type="button"
          className={`wiki-chip ${onlyBookmarks ? 'active' : ''}`}
          onClick={() => setOnlyBookmarks(!onlyBookmarks)}
          role="tab"
          aria-selected={onlyBookmarks}
          title="Mostra solo le guide contrassegnate con la stella"
          style={onlyBookmarks ? { borderColor: '#f59e0b', color: '#f59e0b' } : {}}
        >
          <Star size={13} fill={onlyBookmarks ? '#f59e0b' : 'none'} color="#f59e0b" />
          <span>Salvati</span>
          <span className="wiki-chip-count">{bookmarkedIds.size}</span>
        </button>

        {WIKI_CATEGORIES.map((cat) => {
          const isActive = !onlyBookmarks && activeCategory === cat.id;
          const count = stats.categoryCounts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              className={`wiki-chip ${isActive ? 'active' : ''}`}
              onClick={() => {
                setOnlyBookmarks(false);
                setActiveCategory(cat.id);
              }}
              role="tab"
              aria-selected={isActive}
              title={cat.description}
            >
              <span>{cat.label}</span>
              <span className="wiki-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Toolbar Controlli & Filtri Badge */}
      <div className="wiki-toolbar">
        <div className="wiki-badge-filters">
          {BADGE_OPTIONS.map((opt) => {
            const isActive = activeBadge === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`wiki-badge-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveBadge(opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="wiki-expand-collapse-group">
          <button
            type="button"
            className="btn btn-secondary micro-press"
            onClick={handleExpandAll}
            style={{ fontSize: '12px', padding: '5px 10px' }}
            title="Espandi tutte le schede visibili"
            id="btn-wiki-expand-all"
          >
            <ChevronsDownUp size={14} />
            <span>Espandi Tutto</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary micro-press"
            onClick={handleCollapseAll}
            style={{ fontSize: '12px', padding: '5px 10px' }}
            title="Comprimi tutte le schede"
            id="btn-wiki-collapse-all"
          >
            <ChevronsUpDown size={14} />
            <span>Comprimi Tutto</span>
          </button>
        </div>
      </div>

      {/* 4. Lista Schede Accordion o Stato Vuoto */}
      {filteredArticles.length === 0 ? (
        <div className="wiki-empty-state">
          <HelpCircle size={44} className="wiki-empty-icon" />
          <h3 className="wiki-empty-title">Nessun argomento trovato</h3>
          <p className="wiki-empty-desc">
            {onlyBookmarks
              ? 'Non hai ancora salvato alcuna guida nei preferiti. Clicca sulla stella in alto a destra su qualsiasi articolo per ritrovarlo qui!'
              : 'Non ci sono guide o risposte che corrispondono ai criteri di ricerca attuali. Prova con termini generici o ripristina i filtri.'}
          </p>
          <button
            type="button"
            className="btn btn-secondary micro-press"
            onClick={handleResetFilters}
            style={{ marginTop: '8px' }}
          >
            <RotateCcw size={15} />
            <span>Ripristina Tutti i Filtri</span>
          </button>
        </div>
      ) : (
        <div className="wiki-articles-list">
          {filteredArticles.map((article: WikiArticle) => {
            const isExpanded = expandedIds.has(article.id);
            const isTarget = targetHighlightId === article.id;
            const isBookmarked = bookmarkedIds.has(article.id);
            const isCopied = copiedId === article.id;
            const catMeta = WIKI_CATEGORIES.find((c) => c.id === article.category);

            return (
              <article
                key={article.id}
                className={`wiki-article-card ${isExpanded ? 'expanded' : ''} ${isTarget ? 'target-highlighted' : ''}`}
                id={`wiki-article-${article.id}`}
              >
                {/* Header Scheda (Click per espandere/comprimere) */}
                <button
                  type="button"
                  className="wiki-article-header"
                  onClick={() => toggleArticle(article.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="wiki-article-header-main">
                    <div className="wiki-article-meta-row">
                      <span className={`wiki-badge ${getBadgeClass(article.badge)}`}>
                        {article.badge}
                      </span>
                      {catMeta && catMeta.id !== 'all' && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {catMeta.label}
                        </span>
                      )}
                      <span className="wiki-read-time">{article.readTime} di lettura</span>
                    </div>

                    <h3 className="wiki-article-title">{renderHighlighted(article.title)}</h3>
                    <p className="wiki-article-summary">{renderHighlighted(article.summary)}</p>
                  </div>

                  <div className="wiki-card-action-tools">
                    {/* Pulsante Copia negli Appunti */}
                    <button
                      type="button"
                      className={`wiki-icon-btn wiki-copy-btn ${isCopied ? 'copied' : ''}`}
                      onClick={(e) => handleCopyArticle(article, e)}
                      title={isCopied ? 'Copiato negli appunti!' : 'Copia guida/scheda formattata'}
                    >
                      {isCopied ? <Check size={15} /> : <Copy size={15} />}
                    </button>

                    {/* Pulsante Segnalibro / Preferiti */}
                    <button
                      type="button"
                      className={`wiki-icon-btn wiki-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                      onClick={(e) => toggleBookmark(article.id, e)}
                      title={isBookmarked ? 'Rimuovi dai preferiti' : 'Salva tra le guide preferite'}
                    >
                      <Star size={15} fill={isBookmarked ? '#f59e0b' : 'none'} />
                    </button>

                    <ChevronDown size={18} className="wiki-article-chevron" />
                  </div>
                </button>

                {/* Corpo Scheda Espanso */}
                {isExpanded && (
                  <div className="wiki-article-body">
                    {/* Paragrafi di spiegazione */}
                    <div className="wiki-paragraphs">
                      {article.content.map((paragraph, idx) => (
                        <p key={idx} className="wiki-paragraph">
                          {renderHighlighted(paragraph)}
                        </p>
                      ))}
                    </div>

                    {/* Procedura Passo-Passo (se presente) */}
                    {article.steps && article.steps.length > 0 && (
                      <div className="wiki-steps-container">
                        <div className="wiki-steps-title">
                          <CheckCircle2 size={15} />
                          <span>Procedura Passo-Passo</span>
                        </div>
                        {article.steps.map((step, idx) => (
                          <div key={idx} className="wiki-step-item">
                            <span className="wiki-step-number">{idx + 1}</span>
                            <span className="wiki-step-text">{renderHighlighted(step)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Box Formule Matematiche / Finanziarie (se presente) */}
                    {article.formula && (
                      <div className="wiki-formula-box">
                        <div className="wiki-formula-title">
                          <Calculator size={15} />
                          <span>{article.formula.title}</span>
                        </div>
                        <pre className="wiki-formula-code">{article.formula.equation}</pre>
                        <p className="wiki-formula-desc">{article.formula.explanation}</p>
                      </div>
                    )}

                    {/* Box Consigli Utili & Chicche Pro (se presente) */}
                    {article.tips && article.tips.length > 0 && (
                      <div className="wiki-tip-box">
                        <div className="wiki-tip-title">
                          <Lightbulb size={15} />
                          <span>Consiglio Pro</span>
                        </div>
                        {article.tips.map((tip, idx) => (
                          <p key={idx} className="wiki-tip-item">
                            💡 {renderHighlighted(tip)}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Action Bar Deep-Link Interattiva */}
                    {article.actionLinks && article.actionLinks.length > 0 && (
                      <div className="wiki-action-bar">
                        <span className="wiki-action-label">Azioni rapide collegate:</span>
                        {article.actionLinks.map((link, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="wiki-action-btn micro-press"
                            onClick={() => handleActionClick(link)}
                            title={`Vai a ${link.label}`}
                          >
                            {renderActionIcon(link.iconName)}
                            <span>{link.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
