import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { WIKI_ARTICLES, WIKI_CATEGORIES } from '../constants/wikiData';
import { WikiActionLink, WikiArticle, WikiBadge, WikiCategory } from '../types/wiki';
import { searchWikiArticles, getWikiStats } from '../domain/wikiEngine';
import { NavSection } from '../components/layout/Sidebar';

interface WikiPageProps {
  onNavigate?: (section: NavSection) => void;
  onOpenMovementSelector?: () => void;
  onOpenQuickSetup?: () => void;
}

export const WikiPage: React.FC<WikiPageProps> = ({
  onNavigate,
  onOpenMovementSelector,
  onOpenQuickSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<WikiCategory>('all');
  const [activeBadge, setActiveBadge] = useState<WikiBadge | 'ALL'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['first-rig-setup', 'the-four-financial-metrics']));

  // Statistiche e conteggi
  const stats = useMemo(() => getWikiStats(WIKI_ARTICLES), []);

  // Filtraggio live ottimizzato tramite useMemo
  const filteredArticles = useMemo(() => {
    return searchWikiArticles(WIKI_ARTICLES, searchQuery, activeCategory, activeBadge);
  }, [searchQuery, activeCategory, activeBadge]);

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
      {/* 1. Hero & Search Header */}
      <section className="wiki-hero">
        <div className="wiki-hero-header">
          <div className="wiki-hero-title-group">
            <h2 className="wiki-hero-title">
              <BookOpen size={24} color="var(--accent-primary)" />
              <span>Wiki & Guida Ufficiale</span>
            </h2>
            <p className="wiki-hero-subtitle">
              Manuale d'uso interattivo, spiegazione formule finanziarie, tutorial di montaggio e risposte immediate ai tuoi dubbi hardware.
            </p>
          </div>

          <div className="wiki-hero-stats">
            <span className="wiki-stat-pill" title="Totale guide e articoli tecnici pronti all'uso">
              <strong>{stats.totalArticles}</strong> Guide Complete
            </span>
            <span className="wiki-stat-pill" title="Architettura 100% in locale su IndexedDB">
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              100% Offline & Locale
            </span>
          </div>
        </div>

        {/* Barra di Ricerca Live */}
        <div className="wiki-search-wrapper">
          <Search size={18} className="wiki-search-input-icon" />
          <input
            type="text"
            className="wiki-search-input"
            placeholder="Cerca qualsiasi argomento (es. subito, ram, formula, shader, checkpoint, upgrade)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="input-wiki-search"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              className="wiki-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Azzera ricerca"
              id="btn-wiki-search-clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* 2. Categorie a Chips Orizzontali */}
      <div className="wiki-category-chips" role="tablist" aria-label="Categorie Wiki">
        {WIKI_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count = stats.categoryCounts[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              className={`wiki-chip ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
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
            Non ci sono guide o risposte che corrispondono ai criteri di ricerca attuali. Prova con termini generici o ripristina i filtri.
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
            const catMeta = WIKI_CATEGORIES.find((c) => c.id === article.category);

            return (
              <article
                key={article.id}
                className={`wiki-article-card ${isExpanded ? 'expanded' : ''}`}
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

                    <h3 className="wiki-article-title">{article.title}</h3>
                    <p className="wiki-article-summary">{article.summary}</p>
                  </div>

                  <ChevronDown size={18} className="wiki-article-chevron" />
                </button>

                {/* Corpo Scheda Espanso */}
                {isExpanded && (
                  <div className="wiki-article-body">
                    {/* Paragrafi di spiegazione */}
                    <div className="wiki-paragraphs">
                      {article.content.map((paragraph, idx) => (
                        <p key={idx} className="wiki-paragraph">
                          {paragraph}
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
                            <span className="wiki-step-text">{step}</span>
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
                            💡 {tip}
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
