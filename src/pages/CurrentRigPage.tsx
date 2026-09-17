import React from 'react';
import { usePCStore } from '../store';
import { formatDate } from '../utils';
import {
  Component,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  InstallEvent,
} from '../types';
import {
  Cpu,
  Layers,
  HardDrive,
  Fan,
  Box,
  Monitor,
  Keyboard,
  Cable,
  HelpCircle,
  Plus,
  ArrowRightLeft,
  Package,
  Wrench,
  Clock,
  MapPin,
  Zap,
  Bookmark,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { CheckpointModal } from '../components/checkpoint';

interface CurrentRigPageProps {
  onSelectComponent: (componentId: string) => void;
  onOpenInstallModal: (category?: ComponentCategory) => void;
  onOpenUninstallModal: (component: Component) => void;
  onOpenReplaceModal: (component: Component, lastInstallEvent?: InstallEvent) => void;
  onOpenQuickSetup?: () => void;
}

interface CategoryGroup {
  id: string;
  title: string;
  description: string;
  categories: ComponentCategory[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'core',
    title: 'Piattaforma Core',
    description: 'Processore, scheda madre, memoria RAM e scheda video',
    categories: ['cpu', 'motherboard', 'ram', 'gpu'],
  },
  {
    id: 'storage_cooling',
    title: 'Storage & Raffreddamento',
    description: 'SSD NVMe, unità secondarie e dissipazione termica',
    categories: ['storage', 'cooling'],
  },
  {
    id: 'power_chassis',
    title: 'Alimentazione & Chassis',
    description: 'Alimentatore con certificazione energetica e case',
    categories: ['psu', 'case'],
  },
  {
    id: 'peripherals',
    title: 'Postazione & Periferiche',
    description: 'Monitor, periferiche di input e accessori',
    categories: ['monitor', 'peripherals', 'accessories', 'other'],
  },
];

// Categorie hardware fondamentali: se assenti, mostrano uno strip compatto; le categorie secondarie non ingombrano se vuote
const CORE_ESSENTIAL_CATEGORIES: Set<ComponentCategory> = new Set([
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
]);

export const CurrentRigPage: React.FC<CurrentRigPageProps> = ({
  onSelectComponent,
  onOpenInstallModal,
  onOpenUninstallModal,
  onOpenReplaceModal,
  onOpenQuickSetup,
}) => {
  const { getInstalledComponents, isLoading, settings } = usePCStore();
  const [isSaveCheckpointOpen, setIsSaveCheckpointOpen] = React.useState<boolean>(false);

  const installedItems = getInstalledComponents();

  // Raggruppa i componenti montati per categoria
  const installedByCategory = new Map<ComponentCategory, typeof installedItems>();
  for (const item of installedItems) {
    const list = installedByCategory.get(item.component.category) || [];
    list.push(item);
    installedByCategory.set(item.component.category, list);
  }

  const getCategoryIcon = (category: ComponentCategory, size = 16) => {
    switch (category) {
      case 'cpu':
        return <Cpu size={size} color="var(--accent-primary)" />;
      case 'gpu':
        return <Sliders size={size} color="var(--accent-primary)" />;
      case 'motherboard':
        return <Layers size={size} color="var(--accent-indigo)" />;
      case 'ram':
        return <Box size={size} color="var(--accent-indigo)" />;
      case 'storage':
        return <HardDrive size={size} color="var(--accent-primary)" />;
      case 'cooling':
        return <Fan size={size} color="var(--accent-primary)" />;
      case 'psu':
        return <Zap size={size} color="var(--accent-amber)" />;
      case 'case':
        return <Box size={size} color="var(--text-secondary)" />;
      case 'monitor':
        return <Monitor size={size} color="var(--accent-primary)" />;
      case 'peripherals':
        return <Keyboard size={size} color="var(--accent-primary)" />;
      case 'accessories':
        return <Cable size={size} color="var(--accent-primary)" />;
      default:
        return <HelpCircle size={size} color="var(--text-muted)" />;
    }
  };

  if (isLoading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Caricamento configurazione...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Barra di Riepilogo Sintetica e Discreta (Apple-Style Slide-Up) */}
      <div className="animate-slide-up" style={styles.summaryBar}>
        <div style={styles.summaryLeft}>
          <div style={styles.summaryCount}>
            <span className="font-mono" style={styles.countNum}>{installedItems.length}</span>
            <span style={styles.countLabel}>componenti montati</span>
          </div>
          <div style={styles.summaryDivider} />
          <p style={styles.summaryText}>
            {installedItems.length === 0
              ? 'Nessun componente è attualmente installato nella macchina.'
              : settings.buildYear
              ? `${settings.rigName ? `${settings.rigName} — ` : ''}Build originaria del ${settings.buildYear} (${new Date().getFullYear() - settings.buildYear === 0 ? '<1 anno' : `${new Date().getFullYear() - settings.buildYear} anni`} di vita)`
              : settings.rigName
              ? `${settings.rigName} — Configurazione hardware assemblata e operativa.`
              : 'Configurazione hardware assemblata e operativa.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenQuickSetup && (
            <button
              onClick={onOpenQuickSetup}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Avvia il Quick Setup con rilevamento automatico hardware"
            >
              <Sparkles size={14} color="var(--accent-primary)" />
              <span>Quick Setup</span>
            </button>
          )}

          <button
            onClick={() => setIsSaveCheckpointOpen(true)}
            className="btn btn-secondary micro-press"
            style={{ fontSize: '13px', padding: '7px 14px' }}
            title="Salva la configurazione hardware montata come checkpoint"
          >
            <Bookmark size={15} color="var(--accent-amber)" />
            <span>Salva Checkpoint</span>
          </button>

          <button
            onClick={() => onOpenInstallModal()}
            className="btn btn-primary micro-press"
            style={{ fontSize: '13px', padding: '7px 14px' }}
          >
            <Wrench size={15} />
            <span>Monta nel PC</span>
          </button>
        </div>
      </div>

      {/* Gruppi Hardware */}
      {CATEGORY_GROUPS.map((group, groupIdx) => {
        // Raccogli tutti i componenti montati per questo gruppo
        const groupInstalled = group.categories.flatMap(
          (category) => installedByCategory.get(category) || []
        );

        // Identifica categorie essenziali che risultano completamente prive di componenti
        const missingCoreCategories = group.categories.filter(
          (category) =>
            CORE_ESSENTIAL_CATEGORIES.has(category) &&
            (!installedByCategory.get(category) || installedByCategory.get(category)!.length === 0)
        );

        return (
          <section
            key={group.id}
            className={`animate-slide-up stagger-${Math.min(groupIdx + 1, 5)}`}
            style={styles.groupContainer}
            aria-label={group.title}
          >
            <div style={styles.groupHeader}>
              <div style={styles.groupHeaderLeft}>
                <h3 style={styles.groupTitle}>{group.title}</h3>
                <span style={styles.groupCountBadge}>
                  {groupInstalled.length} {groupInstalled.length === 1 ? 'pezzo' : 'pezzi'}
                </span>
                <span style={styles.groupDescription}>• {group.description}</span>
              </div>

              <button
                onClick={() => onOpenInstallModal(group.categories[0])}
                className="btn btn-ghost micro-press"
                style={{ fontSize: '12px', padding: '4px 10px', color: 'var(--text-secondary)' }}
                title={`Aggiungi un componente in ${group.title}`}
              >
                <Plus size={13} />
                <span>Aggiungi pezzo</span>
              </button>
            </div>

            {groupInstalled.length === 0 && missingCoreCategories.length === 0 ? (
              <div style={styles.groupEmptyNotice}>
                <span>Nessun componente montato in questa sezione.</span>
                <button
                  onClick={() => onOpenInstallModal(group.categories[0])}
                  className="btn btn-ghost micro-press"
                  style={{ fontSize: '12px', color: 'var(--accent-primary)', padding: '2px 8px' }}
                >
                  <Plus size={12} />
                  <span>Monta ora</span>
                </button>
              </div>
            ) : (
              <div style={styles.categoriesGrid}>
                {/* 1. Componenti Montati */}
                {groupInstalled.map((item) => {
                  const categoryLabel =
                    COMPONENT_CATEGORY_LABELS[item.component.category] || item.component.category;

                  return (
                    <div
                      key={item.component.id}
                      className="card card-interactive"
                      style={styles.installedCard}
                      onClick={() => onSelectComponent(item.component.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelectComponent(item.component.id);
                      }}
                      title={`Visualizza dettaglio di ${item.component.name}`}
                      aria-label={`Componente ${item.component.name}, categoria ${categoryLabel}, montato`}
                    >
                      <div style={styles.cardTop}>
                        <div style={styles.categoryBadge}>
                          {getCategoryIcon(item.component.category, 15)}
                          <span>{categoryLabel}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.computed.totalPurchaseCost > 0 && (
                            <span
                              className="font-mono"
                              style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' }}
                            >
                              €{item.computed.totalPurchaseCost.toFixed(0)}
                            </span>
                          )}
                          <span className="badge badge-in-use">In Uso</span>
                        </div>
                      </div>

                      <div style={styles.cardMain}>
                        <h4 style={styles.componentName}>{item.component.name}</h4>
                        <p style={styles.componentBrand}>
                          {item.component.brand} {item.component.model && `• ${item.component.model}`}
                        </p>
                      </div>

                      {/* Metadati Tecnici di Montaggio */}
                      <div style={styles.metadataBox}>
                        {item.lastInstallEvent?.slotOrLocation && (
                          <div style={styles.metaRow}>
                            <MapPin size={12} color="var(--accent-primary)" />
                            <span>
                              Alloggiamento:{' '}
                              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                                {item.lastInstallEvent.slotOrLocation}
                              </strong>
                            </span>
                          </div>
                        )}

                        <div style={styles.metaRow}>
                          <Clock size={12} color="var(--text-muted)" />
                          <span>
                            Montato il{' '}
                            {formatDate(
                              item.computed.lastInstallDate || item.lastInstallEvent?.date,
                              settings.dateFormat
                            )}{' '}
                            •{' '}
                            <strong className="font-mono" style={{ color: 'var(--accent-primary)' }}>
                              {item.computed.daysInUse} gg
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Azioni Rapide (Sostituisci primaria, Smonta secondaria discreta) */}
                      <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenReplaceModal(item.component, item.lastInstallEvent)}
                          className="btn btn-secondary micro-press"
                          style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                          title="Sostituisci questo componente con un upgrade"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Sostituisci</span>
                        </button>

                        <button
                          onClick={() => onOpenUninstallModal(item.component)}
                          className="btn btn-ghost micro-press"
                          style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--accent-amber)' }}
                          title="Smonta dal PC e sposta in magazzino"
                        >
                          <Package size={13} />
                          <span>Smonta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Slot Essenziali Non Occupati (Strip compatto e ordinato, zero card giganti) */}
                {missingCoreCategories.map((category) => (
                  <div key={`empty-${category}`} className="compact-empty-slot" style={styles.compactEmptySlot}>
                    <div style={styles.compactEmptyLeft}>
                      <div style={styles.compactEmptyIcon}>
                        {getCategoryIcon(category, 14)}
                      </div>
                      <div style={styles.compactEmptyTextGroup}>
                        <span style={styles.compactEmptyTitle}>
                          {COMPONENT_CATEGORY_LABELS[category]}
                        </span>
                        <span style={styles.compactEmptySubtitle}>Slot libero</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenInstallModal(category)}
                      className="btn btn-ghost micro-press"
                      style={{ fontSize: '11.5px', padding: '4px 10px', color: 'var(--accent-primary)' }}
                      title={`Monta ${COMPONENT_CATEGORY_LABELS[category]}`}
                    >
                      <Plus size={12} />
                      <span>Monta</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Modale Salva come Checkpoint */}
      <CheckpointModal
        isOpen={isSaveCheckpointOpen}
        onClose={() => setIsSaveCheckpointOpen(false)}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '26px',
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  summaryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  summaryCount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  countNum: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  countLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  summaryDivider: {
    width: '1px',
    height: '18px',
    backgroundColor: 'var(--border-subtle)',
  },
  summaryText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  groupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '8px',
    flexWrap: 'wrap',
  },
  groupHeaderLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    flexWrap: 'wrap',
  },
  groupTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  groupCountBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--bg-surface-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
  },
  groupDescription: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  groupEmptyNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-subtle)',
    border: '1px dashed var(--border-subtle)',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '14px',
  },
  installedCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cardMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  componentName: {
    fontSize: '14.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.35,
  },
  componentBrand: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  metadataBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
  },
  compactEmptySlot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
  },
  compactEmptyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  compactEmptyIcon: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: 0.8,
  },
  compactEmptyTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  compactEmptyTitle: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  compactEmptySubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
};
