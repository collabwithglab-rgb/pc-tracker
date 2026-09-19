import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Cpu,
  Wrench,
  Sparkles,
  Download,
  Upload,
  Bookmark,
  BookOpen,
  Sliders,
  Tag,
  DollarSign,
  Layers,
  CornerDownLeft,
  Activity,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  CommandItem,
  COMMAND_CATEGORY_LABELS,
  Component,
  ComponentComputedState,
} from '../../types';
import {
  STATIC_NAVIGATION_COMMANDS,
  STATIC_ACTION_COMMANDS,
  buildComponentCommands,
  searchCommands,
} from '../../domain/commandRegistry';
import { HardwareIconBadge } from '../common/ComponentIcon';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: CommandItem) => void;
  components: Component[];
  getComputed?: (id: string) => ComponentComputedState | undefined;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
  components,
  getComputed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Insieme combinato e memoizzato dei comandi statici e dinamici
  const allCommands = useMemo(() => {
    const compCommands = buildComponentCommands(components, getComputed);
    return [...STATIC_NAVIGATION_COMMANDS, ...STATIC_ACTION_COMMANDS, ...compCommands];
  }, [components, getComputed]);

  // Risultati filtrati e ordinati deterministicamente
  const filteredResults = useMemo(() => {
    return searchCommands(searchQuery, allCommands, 15);
  }, [searchQuery, allCommands]);

  // Gestione apertura/chiusura, focus autofocus e focus restoration
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    setSearchQuery('');
    setSelectedIndex(0);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 25);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  // Reset dell'indice di selezione quando cambia la query
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto-scroll sull'elemento attivo quando cambia la selezione
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        onExecuteCommand(selected);
        onClose();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      // Blocca il tab all'interno dell'input di ricerca per evitare dispersioni di focus
      e.preventDefault();
    }
  };

  const getCommandIcon = (item: CommandItem) => {
    if (item.componentMeta) {
      return (
        <HardwareIconBadge
          category={item.componentMeta.category}
          size={15}
          style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
        />
      );
    }

    switch (item.id) {
      case 'nav-dashboard':
        return <Activity size={16} color="var(--accent-primary)" />;
      case 'nav-current-rig':
        return <Cpu size={16} color="var(--accent-primary)" />;
      case 'nav-time-travel':
        return <History size={16} color="var(--accent-primary)" />;
      case 'nav-upgrades':
        return <Sparkles size={16} color="var(--accent-amber)" />;
      case 'nav-archive':
        return <Layers size={16} color="var(--text-secondary)" />;
      case 'nav-marketplace':
      case 'deep-marketplace-storage':
      case 'deep-marketplace-sold':
        return <DollarSign size={16} color="var(--accent-emerald)" />;
      case 'nav-stats':
        return <Activity size={16} color="var(--accent-primary)" />;
      case 'nav-maintenance':
      case 'deep-maintenance-registro':
      case 'deep-maintenance-scan':
      case 'deep-maintenance-tools':
      case 'deep-maintenance-tuning':
        return <Wrench size={16} color="var(--accent-cyan)" />;
      case 'nav-wiki':
      case 'action-open-wiki':
        return <BookOpen size={16} color="var(--accent-primary)" />;
      case 'nav-settings':
      case 'action-open-settings':
      case 'deep-settings-preferences':
      case 'deep-settings-appearance':
      case 'deep-settings-data':
        return <Sliders size={16} color="var(--text-secondary)" />;
      case 'deep-settings-backup':
      case 'action-quick-backup':
        return <Download size={16} color="var(--accent-emerald)" />;
      case 'action-import-backup':
        return <Upload size={16} color="var(--accent-cyan)" />;
      case 'action-create-checkpoint':
        return <Bookmark size={16} color="var(--accent-amber)" />;
      case 'action-new-movement':
        return <Sparkles size={16} color="var(--accent-primary)" />;
      case 'action-add-component':
        return <Cpu size={16} color="var(--accent-primary)" />;
      default:
        return <Tag size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div
      className="modal-overlay command-palette-overlay"
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Globale"
    >
      <div
        className="command-palette-dialog animate-slide-up"
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Barra di Ricerca Superiore */}
        <div style={styles.searchBar}>
          <Search size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            style={styles.input}
            placeholder="Cerca comandi, pagine, strumenti o componenti... (↑↓ navigare, ↵ scegliere)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filteredResults[selectedIndex] ? `cmd-item-${filteredResults[selectedIndex].id}` : undefined
            }
          />
          <kbd style={styles.kbdBadge}>ESC</kbd>
        </div>

        {/* Lista dei Risultati */}
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Risultati di ricerca"
          style={styles.listContainer}
        >
          {filteredResults.length === 0 ? (
            <div style={styles.emptyState}>
              <AlertCircle size={22} color="var(--text-tertiary)" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Nessun comando o componente trovato per "{searchQuery}"
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 3 }}>
                Prova a cercare per marca, modello, categoria (es. GPU, SSD) o funzione di sistema.
              </p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onExecuteCommand(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    ...styles.item,
                    backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  }}
                  className={`command-palette-item ${isSelected ? 'is-selected' : ''}`}
                >
                  <div style={styles.itemIconBox}>
                    {getCommandIcon(item)}
                  </div>

                  <div style={styles.itemContent}>
                    <div style={styles.itemLabelRow}>
                      <span style={styles.itemLabel}>{item.label}</span>
                      {item.shortcutHint && (
                        <span style={styles.itemShortcut}>{item.shortcutHint}</span>
                      )}
                    </div>
                    {item.subtitle && (
                      <span style={styles.itemSubtitle}>{item.subtitle}</span>
                    )}
                  </div>

                  <div style={styles.itemCategoryBadge}>
                    <span style={styles.badgeText}>
                      {COMMAND_CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft size={13} color="var(--accent-primary)" style={{ marginLeft: 6 }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra di Stato Inferiore */}
        <div style={styles.footer}>
          <div style={styles.footerHints}>
            <span>
              <kbd style={styles.miniKbd}>↑</kbd> <kbd style={styles.miniKbd}>↓</kbd> Naviga
            </span>
            <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>•</span>
            <span>
              <kbd style={styles.miniKbd}>↵</kbd> Seleziona
            </span>
            <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>•</span>
            <span>
              <kbd style={styles.miniKbd}>Esc</kbd> Chiudi
            </span>
          </div>
          <div style={styles.footerCount}>
            {filteredResults.length} {filteredResults.length === 1 ? 'risultato' : 'risultati'}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-overlay)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 'clamp(40px, 12vh, 120px)',
    paddingLeft: '16px',
    paddingRight: '16px',
    zIndex: 1200,
  },
  dialog: {
    width: '100%',
    maxWidth: '640px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 60px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    outline: 'none',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  kbdBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '4px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
  listContainer: {
    maxHeight: '380px',
    overflowY: 'auto',
    padding: '6px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 16px',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    userSelect: 'none',
  },
  itemIconBox: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemLabel: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemSubtitle: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemShortcut: {
    fontSize: '10.5px',
    color: 'var(--accent-primary)',
    backgroundColor: 'var(--accent-primary-subtle)',
    padding: '1px 5px',
    borderRadius: '3px',
    fontWeight: 500,
  },
  itemCategoryBadge: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '2px 6px',
  },
  emptyState: {
    padding: '36px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 18px',
    borderTop: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-surface)',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  footerHints: {
    display: 'flex',
    alignItems: 'center',
  },
  miniKbd: {
    padding: '1px 4px',
    fontSize: '10px',
    fontWeight: 600,
    borderRadius: '3px',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    marginRight: '2px',
  },
  footerCount: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
};
