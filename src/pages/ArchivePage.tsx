import React, { useState, useMemo, useEffect } from 'react';
import { usePCStore } from '../store';
import { formatDate } from '../utils';
import {
  Component,
  ComponentStatus,
  ComponentCategory,
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_STATUS_LABELS,
  ArchiveViewPreference,
  ArchiveSortPreference,
} from '../types';
import { VALID_CATEGORIES } from '../domain/validators';
import {
  filterComponentsForArchive,
  sortComponentsForArchive,
} from '../domain/archiveEngine';
import {
  Plus,
  Search,
  Cpu,
  Edit2,
  Trash2,
  Calendar,
  Wrench,
  RotateCcw,
  LayoutGrid,
  List,
  HardDrive,
  Sliders,
  Layers,
  Zap,
  Fan,
  Package,
  Monitor,
  X,
  Keyboard,
  Cable,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';

interface ArchivePageProps {
  onSelectComponent: (componentId: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (component: Component) => void;
  onOpenDeleteModal: (component: Component) => void;
  onInstallComponent?: (component: Component) => void;
}

export const ArchivePage: React.FC<ArchivePageProps> = ({
  onSelectComponent,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onInstallComponent,
}) => {
  const { components, getComponentComputed, getComponentWarranty, isLoading, settings } = usePCStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWarranty, setSelectedWarranty] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  // Inizializzati dalle impostazioni predefinite salvate in IndexedDB
  const [viewMode, setViewMode] = useState<ArchiveViewPreference>(
    settings.archiveDefaultView || 'cards'
  );
  const [sortPreference, setSortPreference] = useState<ArchiveSortPreference>(
    settings.archiveDefaultSort || 'purchase_date_desc'
  );

  // Sincronizza se le preferenze in Settings cambiano
  useEffect(() => {
    if (settings.archiveDefaultView) {
      setViewMode(settings.archiveDefaultView);
    }
  }, [settings.archiveDefaultView]);

  useEffect(() => {
    if (settings.archiveDefaultSort) {
      setSortPreference(settings.archiveDefaultSort);
    }
  }, [settings.archiveDefaultSort]);

  // Mappa calcolata in memoria per evitare ricalcoli iterativi
  const computedMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getComponentComputed>> = {};
    for (const comp of components) {
      map[comp.id] = getComponentComputed(comp.id);
    }
    return map;
  }, [components, getComponentComputed]);

  // Mappa delle garanzie calcolata in memoria
  const warrantyMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getComponentWarranty>> = {};
    for (const comp of components) {
      map[comp.id] = getComponentWarranty(comp.id);
    }
    return map;
  }, [components, getComponentWarranty]);

  // Filtraggio deterministico (nome, brand, modello, note, categoria, stato derivato, garanzia)
  const filteredComponents = useMemo(() => {
    return filterComponentsForArchive(
      components,
      computedMap,
      {
        searchQuery,
        category: selectedCategory,
        status: selectedStatus,
        warranty: selectedWarranty,
      },
      warrantyMap
    );
  }, [components, computedMap, searchQuery, selectedCategory, selectedStatus, selectedWarranty, warrantyMap]);

  // Ordinamento deterministico
  const sortedComponents = useMemo(() => {
    return sortComponentsForArchive(filteredComponents, computedMap, sortPreference);
  }, [filteredComponents, computedMap, sortPreference]);

  // Conteggi di stato per il riepilogo
  const statusCounts = useMemo(() => {
    let inUse = 0;
    let inStorage = 0;
    let dismissed = 0;

    for (const comp of components) {
      const st = computedMap[comp.id]?.status;
      if (st === 'IN_USE') inUse++;
      else if (st === 'IN_STORAGE') inStorage++;
      else if (st === 'SOLD' || st === 'GIFTED' || st === 'DISPOSED') dismissed++;
    }

    return { inUse, inStorage, dismissed };
  }, [components, computedMap]);

  const getStatusBadgeClass = (status: ComponentStatus) => {
    switch (status) {
      case 'IN_USE':
        return 'badge-in-use';
      case 'IN_STORAGE':
        return 'badge-in-storage';
      case 'SOLD':
        return 'badge-sold';
      case 'GIFTED':
        return 'badge-gifted';
      case 'DISPOSED':
        return 'badge-disposed';
      default:
        return '';
    }
  };

  const getCategoryIcon = (category: ComponentCategory, size = 14) => {
    switch (category) {
      case 'cpu':
        return <Cpu size={size} color="var(--accent-primary)" />;
      case 'gpu':
        return <Sliders size={size} color="var(--accent-primary)" />;
      case 'motherboard':
        return <Layers size={size} color="var(--accent-indigo)" />;
      case 'ram':
        return <Sliders size={size} color="var(--accent-indigo)" />;
      case 'storage':
        return <HardDrive size={size} color="var(--accent-primary)" />;
      case 'psu':
        return <Zap size={size} color="var(--accent-amber)" />;
      case 'cooling':
        return <Fan size={size} color="var(--accent-primary)" />;
      case 'case':
        return <Package size={size} color="var(--text-secondary)" />;
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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedWarranty('all');
  };

  if (isLoading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Caricamento archivio da IndexedDB...</div>;
  }

  // STATO VUOTO 1: Nessun componente presente in tutto il database
  if (components.length === 0) {
    return (
      <div style={{ padding: '40px 0' }}>
        <div className="empty-state-box animate-slide-up">
          <div className="empty-state-icon">
            <Cpu size={26} color="var(--accent-primary)" />
          </div>
          <h2 className="empty-state-title">Archivio hardware vuoto</h2>
          <p className="empty-state-desc">
            Nessun componente è presente su IndexedDB. Inizia registrando il primo pezzo del tuo computer per tracciarne la vita, i costi e gli upgrade.
          </p>
          <button onClick={onOpenCreateModal} className="btn btn-primary micro-press">
            <Plus size={15} strokeWidth={2.2} />
            <span>Aggiungi il Primo Componente</span>
          </button>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedWarranty !== 'all';

  return (
    <div style={styles.container}>
      {/* TOOLBAR ARCHIVIO STRUTTURATA A 2 RIGHE FLUIDE */}
      <div className="archive-toolbar-container animate-slide-up">
        {/* RIGA PRIMARIA: Ricerca Prominente + Segmented Switcher + CTA Principale */}
        <div className="archive-toolbar-primary-row">
          <div style={styles.searchWrapper}>
            <Search size={16} color="var(--text-muted)" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Cerca hardware per nome, marca, modello o note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={styles.searchInput}
              aria-label="Cerca hardware per nome o specifiche"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={styles.searchClearBtn}
                title="Cancella ricerca"
                aria-label="Cancella ricerca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={styles.primaryRowActions}>
            {/* Toggle Vista Cards / Table (Segmented Control Compatto) */}
            <div className="view-toggle-group" role="group" aria-label="Modalità di visualizzazione">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Vista Griglia Schede"
                aria-label="Vista Griglia Schede"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Vista Tabella Compatta"
                aria-label="Vista Tabella Compatta"
              >
                <List size={15} />
              </button>
            </div>

            {/* CTA Primaria: Nuovo Componente */}
            <button
              onClick={onOpenCreateModal}
              className="btn btn-primary micro-press"
              style={{ height: '38px', fontSize: '13px', padding: '0 16px' }}
              title="Aggiungi un nuovo componente all'archivio"
            >
              <Plus size={15} strokeWidth={2.2} />
              <span>Nuovo Componente</span>
            </button>
          </div>
        </div>

        {/* RIGA SECONDARIA: Filtri Stato, Categoria, Ordinamento e Contatori */}
        <div className="archive-toolbar-secondary-row">
          <div className="archive-filters-group">
            {/* Filtro Stato */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
              style={styles.filterSelect}
              aria-label="Filtra per stato del componente"
            >
              <option value="all">Tutti gli stati</option>
              <option value="IN_USE">In Uso (PC)</option>
              <option value="IN_STORAGE">In Magazzino</option>
              <option value="SOLD">Venduto</option>
              <option value="GIFTED">Regalato</option>
              <option value="DISPOSED">Smaltito</option>
            </select>

            {/* Filtro Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={styles.filterSelect}
              aria-label="Filtra per categoria hardware"
            >
              <option value="all">Tutte le categorie</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {COMPONENT_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>

            {/* Filtro Garanzia */}
            <select
              value={selectedWarranty}
              onChange={(e) => setSelectedWarranty(e.target.value as 'all' | 'active' | 'expiring' | 'expired')}
              className="form-select"
              style={styles.filterSelect}
              aria-label="Filtra per stato della garanzia"
            >
              <option value="all">Tutte le garanzie</option>
              <option value="active">Garanzia attiva</option>
              <option value="expiring">In scadenza (≤ 30 gg)</option>
              <option value="expired">Garanzia terminata</option>
            </select>

            {/* Ordinamento */}
            <select
              value={sortPreference}
              onChange={(e) => setSortPreference(e.target.value as ArchiveSortPreference)}
              className="form-select"
              style={styles.filterSelect}
              aria-label="Ordinamento componenti"
            >
              <option value="purchase_date_desc">Acquisto più recente</option>
              <option value="name_asc">Nome alfabetico (A-Z)</option>
              <option value="cost_desc">Costo decrescente</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn btn-ghost micro-press"
                style={{ fontSize: '12px', padding: '5px 10px', height: '34px' }}
                title="Azzera tutti i filtri"
              >
                <RotateCcw size={12} />
                <span>Azzera filtri</span>
              </button>
            )}
          </div>

          {/* Contatori compatti di inventario */}
          <div className="archive-pills-group">
            <span className="archive-stat-pill badge-in-use">
              {statusCounts.inUse} In Uso
            </span>
            <span className="archive-stat-pill badge-in-storage">
              {statusCounts.inStorage} In Magazzino
            </span>
            {statusCounts.dismissed > 0 && (
              <span className="archive-stat-pill badge-sold">
                {statusCounts.dismissed} Dismessi
              </span>
            )}
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '4px' }}>
              ({sortedComponents.length} di {components.length})
            </span>
          </div>
        </div>
      </div>

      {/* GESTIONE STATI VUOTI DIFFERENZIATI O RENDERING RISULTATI */}
      {sortedComponents.length === 0 ? (
        searchQuery.trim() !== '' ? (
          /* STATO VUOTO 2: Ricerca senza risultati */
          <div className="card animate-slide-up" style={styles.emptyCard}>
            <div className="empty-state-icon" style={{ margin: '0 auto 14px' }}>
              <Search size={24} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              Nessun risultato per "{searchQuery}"
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Non è stato trovato alcun componente che corrisponda alla query. Verifica il nome, la marca o il modello inserito.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '12.5px', margin: '0 auto' }}
            >
              <RotateCcw size={13} />
              <span>Cancella Ricerca</span>
            </button>
          </div>
        ) : (
          /* STATO VUOTO 3: Filtri combinati senza risultati */
          <div className="card animate-slide-up" style={styles.emptyCard}>
            <div className="empty-state-icon" style={{ margin: '0 auto 14px' }}>
              <Sliders size={24} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              Nessun componente con i filtri selezionati
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Nessun pezzo soddisfa contemporaneamente i filtri di categoria, stato e garanzia attivi.
            </p>
            <button
              onClick={resetFilters}
              className="btn btn-secondary micro-press"
              style={{ fontSize: '12.5px', margin: '0 auto' }}
            >
              <RotateCcw size={13} />
              <span>Azzera Filtri</span>
            </button>
          </div>
        )
      ) : viewMode === 'table' ? (
        /* VISTA TABELLA (Densa, Scansione Rapida, Numeri Allineati, Responsive) */
        <div className="archive-table-wrapper animate-slide-up">
          <table className="archive-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Stato</th>
                <th>Componente</th>
                <th style={{ width: '150px' }}>Categoria</th>
                <th style={{ width: '130px' }}>Data Acquisto</th>
                <th style={{ width: '120px' }}>Costo Storico</th>
                <th style={{ width: '140px' }}>Utilizzo / Note</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sortedComponents.map((comp) => {
                const computed = computedMap[comp.id];
                const wInfo = warrantyMap[comp.id];
                const status = computed?.status || 'IN_STORAGE';

                return (
                  <tr
                    key={comp.id}
                    className="archive-table-row"
                    onClick={() => onSelectComponent(comp.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectComponent(comp.id);
                    }}
                    title={`Visualizza dettaglio di ${comp.name}`}
                    aria-label={`Componente ${comp.name}, ${COMPONENT_STATUS_LABELS[status]}`}
                  >
                    <td>
                      <span className={`badge ${getStatusBadgeClass(status)}`}>
                        {COMPONENT_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{comp.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {comp.brand} {comp.model && `• ${comp.model}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="category-chip">
                        {getCategoryIcon(comp.category)}
                        <span>{COMPONENT_CATEGORY_LABELS[comp.category] || comp.category}</span>
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px' }}>
                      {computed?.purchaseDate ? formatDate(computed.purchaseDate, settings.dateFormat) : '—'}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {computed && computed.totalPurchaseCost > 0
                        ? `€${computed.totalPurchaseCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {wInfo && wInfo.status === 'active' && (
                          <span className="badge badge-warranty-active" style={{ fontSize: '11px', padding: '2px 7px' }} title={wInfo.humanLabel}>
                            <ShieldCheck size={11} /> Garanzia
                          </span>
                        )}
                        {wInfo && wInfo.status === 'expiring' && (
                          <span className="badge badge-warranty-expiring" style={{ fontSize: '11px', padding: '2px 7px' }} title={wInfo.humanLabel}>
                            <ShieldAlert size={11} /> Scade a breve
                          </span>
                        )}
                        {wInfo && wInfo.status === 'expired' && selectedWarranty === 'expired' && (
                          <span className="badge badge-warranty-expired" style={{ fontSize: '11px', padding: '2px 7px' }} title={wInfo.humanLabel}>
                            <ShieldX size={11} /> Scaduta
                          </span>
                        )}
                        {computed && computed.daysInUse > 0 ? (
                          <span className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                            {computed.daysInUse} gg d'uso
                          </span>
                        ) : comp.notes ? (
                          <span
                            style={{
                              maxWidth: '180px',
                              display: 'inline-block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={comp.notes}
                          >
                            {comp.notes}
                          </span>
                        ) : !wInfo || wInfo.status === 'none' ? (
                          '—'
                        ) : null}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {status === 'IN_STORAGE' && onInstallComponent && (
                          <button
                            onClick={() => onInstallComponent(comp)}
                            title="Monta questo pezzo nel PC"
                            className="btn btn-secondary micro-press"
                            style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--accent-primary)' }}
                          >
                            <Wrench size={11} />
                            <span>Monta</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenEditModal(comp)}
                          title="Modifica anagrafica componente"
                          className="btn btn-ghost micro-press"
                          style={{ padding: '5px' }}
                          aria-label={`Modifica ${comp.name}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onOpenDeleteModal(comp)}
                          title="Elimina pezzo dall'archivio"
                          className="btn btn-ghost micro-press"
                          style={{ padding: '5px', color: 'var(--accent-ruby)' }}
                          aria-label={`Elimina ${comp.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISTA CARDS (Pulita, Spaziosa, Coerente con Current Rig) */
        <div className="animate-slide-up" style={styles.componentsGrid}>
          {sortedComponents.map((comp) => {
            const computed = computedMap[comp.id];
            const wInfo = warrantyMap[comp.id];
            const status = computed?.status || 'IN_STORAGE';

            return (
              <div
                key={comp.id}
                className="card card-interactive"
                style={styles.componentCard}
                onClick={() => onSelectComponent(comp.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectComponent(comp.id);
                }}
                title={`Visualizza dettaglio di ${comp.name}`}
                aria-label={`Componente ${comp.name}, ${COMPONENT_CATEGORY_LABELS[comp.category]}, ${COMPONENT_STATUS_LABELS[status]}`}
              >
                {/* Header Card: Categoria + Garanzia + Stato */}
                <div style={styles.cardHeader}>
                  <div style={styles.categoryBadge}>
                    {getCategoryIcon(comp.category, 15)}
                    <span>{COMPONENT_CATEGORY_LABELS[comp.category]}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {wInfo && wInfo.status === 'active' && (
                      <span className="badge badge-warranty-active" style={{ fontSize: '10px', padding: '1px 6px' }} title={wInfo.humanLabel}>
                        <ShieldCheck size={10} /> Garanzia
                      </span>
                    )}
                    {wInfo && wInfo.status === 'expiring' && (
                      <span className="badge badge-warranty-expiring" style={{ fontSize: '10px', padding: '1px 6px' }} title={wInfo.humanLabel}>
                        <ShieldAlert size={10} /> Scade a breve
                      </span>
                    )}
                    {wInfo && wInfo.status === 'expired' && selectedWarranty === 'expired' && (
                      <span className="badge badge-warranty-expired" style={{ fontSize: '10px', padding: '1px 6px' }} title={wInfo.humanLabel}>
                        <ShieldX size={10} /> Scaduta
                      </span>
                    )}
                    <span className={`badge ${getStatusBadgeClass(status)}`}>
                      {COMPONENT_STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>

                {/* Corpo Card: Nome e Brand/Model */}
                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{comp.name}</h3>
                  <p style={styles.cardSubtitle}>
                    {comp.brand} {comp.model && `• ${comp.model}`}
                  </p>
                </div>

                {/* Strip Metadati Tecnici */}
                <div style={styles.cardMetaStrip}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                    {computed?.purchaseDate ? (
                      <div style={styles.metaItem}>
                        <Calendar size={12} color="var(--text-muted)" />
                        <span>{formatDate(computed.purchaseDate, settings.dateFormat)}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nessun acquisto</span>
                    )}

                    {wInfo && (wInfo.status === 'active' || wInfo.status === 'expiring') && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: wInfo.status === 'expiring' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Garanzia: ${wInfo.humanLabel}`}
                      >
                        • {wInfo.humanLabel}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {computed && computed.daysInUse > 0 && (
                      <span
                        className="badge badge-in-use"
                        style={{ fontSize: '10px', padding: '1px 5px' }}
                      >
                        {computed.daysInUse} gg
                      </span>
                    )}
                    {computed && computed.totalPurchaseCost > 0 && (
                      <span className="font-mono" style={styles.priceTag}>
                        €{computed.totalPurchaseCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra Azioni Inferiore (Senza pulsanti chevron ridondanti) */}
                <div style={styles.cardActionsRow} onClick={(e) => e.stopPropagation()}>
                  {status === 'IN_STORAGE' && onInstallComponent && (
                    <button
                      onClick={() => onInstallComponent(comp)}
                      title="Monta questo pezzo nel PC"
                      className="btn btn-secondary micro-press"
                      style={{ flex: 1, padding: '5px 10px', fontSize: '12px' }}
                    >
                      <Wrench size={12} />
                      <span>Monta nel PC</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenEditModal(comp)}
                    title="Modifica anagrafica componente"
                    className="btn btn-ghost micro-press"
                    style={{ padding: '5px 8px', fontSize: '12px' }}
                    aria-label={`Modifica ${comp.name}`}
                  >
                    <Edit2 size={13} />
                    <span>Modifica</span>
                  </button>

                  <button
                    onClick={() => onOpenDeleteModal(comp)}
                    title="Elimina pezzo dall'archivio"
                    className="btn btn-ghost micro-press"
                    style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--accent-ruby)' }}
                    aria-label={`Elimina ${comp.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '36px',
    paddingRight: '32px',
    height: '38px',
    fontSize: '13px',
  },
  searchClearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  primaryRowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    width: 'auto',
    height: '34px',
    fontSize: '12.5px',
  },
  componentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '14px',
  },
  componentCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    minHeight: '160px',
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardTitle: {
    fontSize: '14.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.35,
  },
  cardSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  cardMetaStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    fontSize: '11.5px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'var(--text-muted)',
  },
  priceTag: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '6px',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '10px',
    marginTop: '2px',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '36px 20px',
    borderColor: 'var(--border-subtle)',
  },
};
