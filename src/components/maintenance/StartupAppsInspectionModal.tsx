import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Shield,
  Sliders,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  StartupAppsSnapshot,
  StartupAppItem,
  StartupScope,
  StartupImpact,
} from '../../types/windowsTools';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../locales';

interface StartupAppsInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot?: StartupAppsSnapshot | null;
  onOpenSettings?: () => void;
}

export const StartupAppsInspectionModal: React.FC<StartupAppsInspectionModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'enabled' | 'disabled'>('all');

  const apps = snapshot?.apps || [];

  const filteredApps = useMemo(() => {
    return apps.filter((app: StartupAppItem) => {
      if (filterState === 'enabled' && !app.enabled) return false;
      if (filterState === 'disabled' && app.enabled) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = app.name.toLowerCase().includes(query);
        const matchesCommand = app.command.toLowerCase().includes(query);
        return matchesName || matchesCommand;
      }
      return true;
    });
  }, [apps, filterState, searchQuery]);

  const getScopeBadge = (scope: StartupScope) => {
    switch (scope) {
      case 'current_user':
        return { label: 'HKCU (User)', color: 'var(--accent-cyan)' };
      case 'local_machine':
        return { label: 'HKLM (System 64)', color: 'var(--accent-primary)' };
      case 'local_machine_wow64':
        return { label: 'HKLM (WoW64 32)', color: 'var(--accent-purple, #a855f7)' };
      default:
        return { label: scope, color: 'var(--text-muted)' };
    }
  };

  const getImpactBadge = (impact: StartupImpact) => {
    switch (impact) {
      case 'high':
        return { label: 'Alto', badgeClass: 'badge-ruby' };
      case 'medium':
        return { label: 'Medio', badgeClass: 'badge-amber' };
      case 'low':
        return { label: 'Basso', badgeClass: 'badge-cyan' };
      case 'none':
        return { label: 'Minimo', badgeClass: 'badge-subtle' };
      default:
        return { label: 'Non calcolato', badgeClass: 'badge-subtle' };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('startup_modal_title')}
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner trasparenza anti-debloater */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
          }}
        >
          <Shield size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              {t('startup_modal_notice_title')}
            </div>
            {t('startup_modal_notice')}
          </div>
        </div>

        {/* Metriche rapide sintetiche */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {t('startup_apps_total')}
            </span>
            <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {snapshot?.totalApps ?? 0}
            </strong>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)' }}>
              {t('startup_apps_enabled')}
            </span>
            <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
              {snapshot?.enabledCount ?? 0}
            </strong>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {t('startup_apps_disabled')}
            </span>
            <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {snapshot?.disabledCount ?? 0}
            </strong>
          </div>
        </div>

        {/* Barra di ricerca, filtri e pulsante impostazioni Windows */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="input-field"
                placeholder={t('startup_modal_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '32px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`btn btn-xs ${filterState === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterState('all')}
              >
                {t('startup_modal_filter_all')}
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterState === 'enabled' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterState('enabled')}
              >
                {t('startup_modal_filter_enabled')}
              </button>
              <button
                type="button"
                className={`btn btn-xs ${filterState === 'disabled' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterState('disabled')}
              >
                {t('startup_modal_filter_disabled')}
              </button>
            </div>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onOpenSettings}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={13} />
              <span>{t('startup_apps_open_settings_btn')}</span>
            </button>
          )}
        </div>

        {/* Lista/Tabella delle applicazioni di avvio */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {filteredApps.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Sliders size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem' }}>{t('startup_modal_empty')}</div>
            </div>
          ) : (
            filteredApps.map((app: StartupAppItem) => {
              const scopeInfo = getScopeBadge(app.scope);
              const impactInfo = getImpactBadge(app.impact);

              return (
                <div
                  key={`${app.scope}-${app.name}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {app.name}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${scopeInfo.color}`,
                          color: scopeInfo.color,
                        }}
                      >
                        {scopeInfo.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`badge ${impactInfo.badgeClass}`}
                        style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                        title={`${t('startup_modal_col_impact')}: ${impactInfo.label}`}
                      >
                        {impactInfo.label}
                      </span>

                      <span
                        className={`badge ${app.enabled ? 'badge-emerald' : 'badge-subtle'}`}
                        style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {app.enabled ? (
                          <>
                            <CheckCircle2 size={11} />
                            <span>{t('startup_apps_enabled')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={11} />
                            <span>{t('startup_apps_disabled')}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Riga di comando / Percorso eseguibile */}
                  <div
                    style={{
                      marginTop: '2px',
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      wordBreak: 'break-all',
                    }}
                    title={app.command}
                  >
                    {app.command || t('startup_modal_no_command')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer modale */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-xs)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            {t('action_close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
