import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Info,
  Search,
} from 'lucide-react';
import {
  WindowsServicesSnapshot,
  WindowsServiceNativeFact,
  WINDOWS_SERVICES_CATALOG,
  WindowsServiceOperationalModel,
} from '../../types/diagnostics';
import { Modal } from '../common/Modal';

interface WindowsServicesInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicesSnapshot?: WindowsServicesSnapshot | null;
}

/**
 * Valutazione deterministica e oggettiva dello stato del servizio basata sul Modello a 3 Classi (Sezione 2.7).
 */
function evaluateServiceHealth(fact: WindowsServiceNativeFact): {
  isProblematic: boolean;
  statusBadgeClass: string;
  statusLabel: string;
  explanation: string;
} {
  // 1. Servizi Always Running (EventLog, Winmgmt)
  if (fact.operationalModel === 'always_running') {
    if (fact.currentState !== 'running') {
      return {
        isProblematic: true,
        statusBadgeClass: 'badge-ruby',
        statusLabel: 'Arrestato (Anomalia)',
        explanation: 'Servizio di sistema essenziale non in esecuzione. Compromette la registrazione log o la telemetria WMI.',
      };
    }
    if (fact.startType === 'disabled') {
      return {
        isProblematic: true,
        statusBadgeClass: 'badge-amber',
        statusLabel: 'Disabilitato (Avviso)',
        explanation: 'Il tipo di avvio è disabilitato, impedendone il normale avvio automatico con Windows.',
      };
    }
    return {
      isProblematic: false,
      statusBadgeClass: 'badge-emerald',
      statusLabel: 'In Esecuzione',
      explanation: 'Servizio di sistema primario attivo e operativo con esito nominale.',
    };
  }

  // 2. Servizi On Demand (wuauserv, TrustedInstaller, VSS)
  if (fact.operationalModel === 'on_demand') {
    if (fact.startType === 'disabled') {
      return {
        isProblematic: true,
        statusBadgeClass: 'badge-amber',
        statusLabel: 'Disabilitato',
        explanation: 'Il servizio è disabilitato. Windows non potrà avviare aggiornamenti, componenti o punti di ripristino su richiesta.',
      };
    }
    if (fact.win32ExitCode !== 0 && fact.currentState === 'stopped') {
      return {
        isProblematic: true,
        statusBadgeClass: 'badge-amber',
        statusLabel: `Errore Uscita (${fact.win32ExitCode})`,
        explanation: `Il servizio si è arrestato con codice Win32 ${fact.win32ExitCode}.`,
      };
    }
    if (fact.currentState === 'running') {
      return {
        isProblematic: false,
        statusBadgeClass: 'badge-cyan',
        statusLabel: 'In Esecuzione (Attivo)',
        explanation: 'Il servizio è attualmente attivo per gestire richieste di sistema o installazioni in corso.',
      };
    }
    return {
      isProblematic: false,
      statusBadgeClass: 'badge-subtle',
      statusLabel: 'A Riposo (Normale)',
      explanation: 'Normale stato a riposo per un servizio su richiesta. Verrà avviato da Windows quando necessario.',
    };
  }

  // 3. Servizi Contestuali (WinDefend)
  if (fact.operationalModel === 'contextual') {
    if (fact.currentState === 'stopped') {
      return {
        isProblematic: false,
        statusBadgeClass: 'badge-subtle',
        statusLabel: 'Arrestato (Contestuale)',
        explanation: 'Normale se nel sistema è presente e registrato un antivirus/EDR di terze parti attivo in Windows Security Center.',
      };
    }
    return {
      isProblematic: false,
      statusBadgeClass: 'badge-emerald',
      statusLabel: 'In Esecuzione (Attivo)',
      explanation: 'Protezione integrata Microsoft Defender attiva in tempo reale.',
    };
  }

  return {
    isProblematic: false,
    statusBadgeClass: 'badge-subtle',
    statusLabel: fact.currentState,
    explanation: 'Stato rilevato dal Service Control Manager di Windows.',
  };
}

export const WindowsServicesInspectionModal: React.FC<WindowsServicesInspectionModalProps> = ({
  isOpen,
  onClose,
  servicesSnapshot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('all');

  // Mappa di fallback per combinare i servizi del catalogo con i fatti rilevati
  const servicesList: WindowsServiceNativeFact[] = useMemo(() => {
    if (!servicesSnapshot || !servicesSnapshot.services || servicesSnapshot.services.length === 0) {
      // Fallback catalogo vuoto se non rilevato
      return WINDOWS_SERVICES_CATALOG.map((c) => ({
        serviceName: c.serviceName,
        displayName: c.fallbackDisplayName,
        operationalModel: c.operationalModel,
        currentState: 'unknown' as const,
        startType: 'unknown' as const,
        win32ExitCode: 0,
      }));
    }
    return servicesSnapshot.services;
  }, [servicesSnapshot]);

  // Conteggi sintetici
  const summaryCounts = useMemo(() => {
    let running = 0;
    let stopped = 0;
    let problematic = 0;

    for (const s of servicesList) {
      if (s.currentState === 'running') running++;
      else if (s.currentState === 'stopped') stopped++;
      const evalHealth = evaluateServiceHealth(s);
      if (evalHealth.isProblematic) problematic++;
    }

    return { total: servicesList.length, running, stopped, problematic };
  }, [servicesList]);

  // Filtro di ricerca
  const filteredServices = useMemo(() => {
    return servicesList.filter((s) => {
      if (modelFilter !== 'all' && s.operationalModel !== modelFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.serviceName.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q)
      );
    });
  }, [servicesList, modelFilter, searchQuery]);

  const getOperationalModelLabel = (model: WindowsServiceOperationalModel) => {
    switch (model) {
      case 'always_running':
        return 'Sempre Attivo (Kernel Core)';
      case 'on_demand':
        return 'Su Richiesta (A Riposo)';
      case 'contextual':
        return 'Contestuale (Sicurezza)';
    }
  };

  const getStartTypeLabel = (startType: string) => {
    switch (startType) {
      case 'auto':
        return 'Automatico';
      case 'auto_delayed':
        return 'Automatico (Avvio Ritardato)';
      case 'demand':
        return 'Manuale (Su Richiesta)';
      case 'disabled':
        return 'Disabilitato';
      case 'boot':
        return 'Boot Driver';
      case 'system':
        return 'Sistema';
      default:
        return startType || 'Non specificato';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Servizi di Sistema Windows (SCM Diagnostics)"
      subtitle="Interrogazione diretta Service Control Manager (Advapi32.dll) — 6 Servizi Critici"
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Banner pedagogico sul modello a 3 classi (Sezione 2.7) */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Modello Diagnostico a 3 Classi Operative:</strong>
            <p style={{ margin: '4px 0 0' }}>
              I servizi <em>on-demand</em> (Windows Update, Moduli di Installazione, Volume Shadow Copy) sono fisiologicamente arrestati a riposo e non costituiscono anomalia. Solo arresti anomali di servizi sempre attivi (Event Log, WMI) o tipi di avvio disabilitati vengono considerati problemi.
            </p>
          </div>
        </div>

        {/* Toolbar di ricerca e filtri modello */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: modelFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-input)',
                color: modelFilter === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setModelFilter('all')}
            >
              Tutti ({summaryCounts.total})
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: modelFilter === 'always_running' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
                color: modelFilter === 'always_running' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setModelFilter('always_running')}
            >
              Sempre Attivi
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: modelFilter === 'on_demand' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-input)',
                color: modelFilter === 'on_demand' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setModelFilter('on_demand')}
            >
              On Demand (Su Richiesta)
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                backgroundColor: modelFilter === 'contextual' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                color: modelFilter === 'contextual' ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => setModelFilter('contextual')}
            >
              Contestuali
            </button>
          </div>

          <div style={{ position: 'relative', width: '180px' }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Cerca servizio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '28px', height: '30px', fontSize: '0.78rem' }}
            />
          </div>
        </div>

        {/* Griglia o lista dei 6 servizi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredServices.map((service) => {
            const evaluation = evaluateServiceHealth(service);

            return (
              <div
                key={service.serviceName}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: evaluation.isProblematic
                    ? '1px solid rgba(244, 63, 94, 0.4)'
                    : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Header riga: Nome Display, Nome Tecnico, Badge Stato */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {service.displayName}
                      </strong>
                      <code style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-input)', padding: '1px 5px', borderRadius: '4px' }}>
                        {service.serviceName}
                      </code>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Modello: {getOperationalModelLabel(service.operationalModel)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${evaluation.statusBadgeClass}`} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      {evaluation.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Spiegazione oggettiva */}
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {evaluation.explanation}
                </p>

                {/* Dettagli tecnici SCM */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '6px',
                    marginTop: '2px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>
                      Tipo Avvio: <strong style={{ color: service.startType === 'disabled' ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>{getStartTypeLabel(service.startType)}</strong>
                    </span>
                    {service.processId !== null && service.processId !== undefined && (
                      <span>
                        PID: <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{service.processId}</code>
                      </span>
                    )}
                    <span>
                      Win32 Exit: <strong style={{ color: service.win32ExitCode !== 0 ? 'var(--accent-ruby)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{service.win32ExitCode}</strong>
                    </span>
                  </div>

                  {evaluation.isProblematic && (
                    <span style={{ color: 'var(--accent-amber)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={11} />
                      <span>Richiede revisione in services.msc</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-xs)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};
