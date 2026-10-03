import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  HardDrive,
  Play,
  Pause,
  RefreshCw,
  Flame,
  Clock,
  ShieldAlert,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  useLiveMonitoring,
  isMetricAvailable,
  formatMetricValue,
} from '../../services/monitoringService';
import { MonitoringSnapshot } from '../../types/monitoring';

const DEMO_MONITORING_SNAPSHOT: MonitoringSnapshot = {
  timestamp: new Date().toISOString(),
  status: 'success',
  cpu: {
    utilizationPercent: {
      value: 18.4,
      availability: 'available',
      unit: '%',
      source: 'GetSystemTimes',
    },
    logicalProcessorCount: 16,
    baseFrequencyMhz: {
      value: 4850,
      availability: 'available',
      unit: 'MHz',
      source: 'CallNtPowerInformation',
    },
    packageTemperatureCelsius: {
      value: 52,
      availability: 'available',
      unit: '°C',
      source: 'Win32_ThermalZone',
    },
    packagePowerWatts: {
      value: 45.2,
      availability: 'available',
      unit: 'W',
      source: 'RAPL_Energy',
    },
  },
  memory: {
    totalBytes: 34_359_738_368,
    usedBytes: 14_200_000_000,
    availableBytes: 20_159_738_368,
    utilizationPercent: 41,
  },
  gpus: [
    {
      id: 'gpu-0',
      name: 'NVIDIA GeForce RTX 4080 16GB',
      vendor: 'NVIDIA',
      isDiscrete: true,
      utilizationPercent: {
        value: 26,
        availability: 'available',
        unit: '%',
        source: 'NVML',
      },
      vramTotalBytes: {
        value: 17_179_869_184,
        availability: 'available',
        unit: 'B',
        source: 'NVML',
      },
      vramUsedBytes: {
        value: 4_294_967_296,
        availability: 'available',
        unit: 'B',
        source: 'NVML',
      },
      vramUtilizationPercent: {
        value: 25,
        availability: 'available',
        unit: '%',
        source: 'NVML',
      },
      coreTemperatureCelsius: {
        value: 46,
        availability: 'available',
        unit: '°C',
        source: 'NVML',
      },
      hotspotTemperatureCelsius: {
        value: 55,
        availability: 'available',
        unit: '°C',
        source: 'NVML',
      },
      coreClockMhz: {
        value: 2505,
        availability: 'available',
        unit: 'MHz',
        source: 'NVML',
      },
      memoryClockMhz: {
        value: 11200,
        availability: 'available',
        unit: 'MHz',
        source: 'NVML',
      },
      powerWatts: {
        value: 82.5,
        availability: 'available',
        unit: 'W',
        source: 'NVML',
      },
      fanSpeedPercent: {
        value: 32,
        availability: 'available',
        unit: '%',
        source: 'NVML',
      },
    },
  ],
  storage: [
    {
      driveLetter: 'C:',
      label: 'Windows NVMe',
      fileSystem: 'NTFS',
      totalBytes: 2_000_000_000_000,
      usedBytes: 850_000_000_000,
      freeBytes: 1_150_000_000_000,
      utilizationPercent: 42,
    },
  ],
  system: {
    osVersion: 'Windows 11 Pro 64-bit',
    osBuild: '26100.1742',
    uptimeSeconds: 15420,
  },
};

export const CareLiveTab: React.FC = () => {
  const [showDemoLive, setShowDemoLive] = useState(false);
  const {
    currentSnapshot: liveSnapshot,
    isSmartPaused,
    isSupported,
    isPolling,
    pause,
    resume,
    refreshNow,
  } = useLiveMonitoring({ enabled: true, intervalMs: 2000 });

  const currentSnapshot = showDemoLive ? DEMO_MONITORING_SNAPSHOT : liveSnapshot;

  const formatUptime = (seconds: number): string => {
    if (seconds <= 0) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}g`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
  };

  const getThermalClass = (temp?: number | null): string => {
    if (temp === null || temp === undefined) return '';
    if (temp >= 85) return 'temp-critical';
    if (temp >= 76) return 'temp-warning';
    return 'temp-good';
  };

  const getHotspotThermalClass = (temp?: number | null): string => {
    if (temp === null || temp === undefined) return '';
    if (temp >= 110) return 'temp-critical';
    if (temp >= 100) return 'temp-warning';
    return 'temp-good';
  };

  if (!isSupported && !showDemoLive && liveSnapshot?.status === 'unsupported') {
    return (
      <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <ShieldAlert size={36} color="var(--accent-amber)" style={{ margin: '0 auto var(--space-sm)' }} />
        <h3 style={{ margin: '0 0 var(--space-xs)', fontSize: '1.2rem', fontWeight: 600 }}>
          Monitoraggio Live Disponibile in Ambiente Desktop Windows
        </h3>
        <p style={{ margin: '0 auto var(--space-md)', maxWidth: '580px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          La telemetria hardware in tempo reale (Win32 API, contatori di performance del kernel ed NVML GPU) opera nativamente nell'eseguibile desktop Windows di PC Tracker con zero overhead e zero daemon esterni.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowDemoLive(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
        >
          <Sparkles size={14} />
          <span>Attiva Anteprima Live (Dati Dimostrativi)</span>
        </button>
      </div>
    );
  }

  const cpu = currentSnapshot?.cpu;
  const mem = currentSnapshot?.memory;
  const gpus = currentSnapshot?.gpus || [];
  const storage = currentSnapshot?.storage || [];
  const system = currentSnapshot?.system;

  const cpuUsage = isMetricAvailable(cpu?.utilizationPercent) ? cpu.utilizationPercent.value : 0;
  const memUsage = mem && mem.totalBytes > 0 ? mem.utilizationPercent : 0;
  const memUsedGb = mem ? (mem.usedBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';
  const memTotalGb = mem ? (mem.totalBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
  const memAvailGb = mem ? (mem.availableBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';

  return (
    <div className="care-live-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* 1. TOP LIVE STATUS BAR WITH SMART PAUSE INDICATOR */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span className={`live-pulse-dot ${isPolling ? 'pulse-active' : isSmartPaused ? 'pulse-smart-paused' : 'pulse-paused'}`} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {isSmartPaused
                ? 'Smart Pause Attiva'
                : isPolling
                ? 'Telemetria Live (Intervallo: 2s)'
                : 'Telemetria in Pausa'}
            </span>
          </div>

          {isSmartPaused && (
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Info size={11} /> Polling sospeso: finestra inattiva
            </span>
          )}

          {showDemoLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} /> Anteprima Browser
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setShowDemoLive(false)}
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
              >
                Ripristina
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {isPolling ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={pause}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
              title="Metti in pausa il campionamento continuo"
            >
              <Pause size={13} />
              <span>Pausa</span>
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={resume}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
              title="Riprendi il monitoraggio continuo"
            >
              <Play size={13} />
              <span>Riprendi</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => refreshNow()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            title="Campiona subito lo stato istantaneo"
          >
            <RefreshCw size={13} />
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      {/* 2. GRID METRICHE PRINCIPALI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* CPU CARD */}
        <div className="card care-telemetry-card">
          <div className="care-telemetry-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Cpu size={18} color="var(--accent-cyan)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Processore (CPU)</h3>
            </div>
            <span className="badge badge-subtle">{cpu?.logicalProcessorCount || 0} Core Logici</span>
          </div>

          <div style={{ margin: 'var(--space-md) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Carico Totale</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {cpuUsage.toFixed(1)}%
              </span>
            </div>
            <div className="care-progress-track">
              <div className="care-progress-fill" style={{ width: `${Math.min(100, Math.max(0, cpuUsage))}%`, backgroundColor: cpuUsage > 85 ? 'var(--accent-ruby)' : 'var(--accent-cyan)' }} />
            </div>
          </div>

          <div className="care-telemetry-meta-grid">
            <div>
              <span className="care-meta-label">Frequenza Base</span>
              <span className="care-meta-val">
                {isMetricAvailable(cpu?.baseFrequencyMhz) ? `${cpu.baseFrequencyMhz.value} MHz` : 'N/D'}
              </span>
            </div>
            <div>
              <span className="care-meta-label">Temp Package</span>
              <span className="care-meta-val" title={cpu?.packageTemperatureCelsius.reason || ''}>
                {isMetricAvailable(cpu?.packageTemperatureCelsius) ? `${cpu.packageTemperatureCelsius.value}°C` : 'Non disp.'}
              </span>
            </div>
          </div>
        </div>

        {/* RAM CARD */}
        <div className="card care-telemetry-card">
          <div className="care-telemetry-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Zap size={18} color="var(--accent-purple, #818cf8)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Memoria RAM</h3>
            </div>
            <span className="badge badge-subtle">{memTotalGb} GB Totali</span>
          </div>

          <div style={{ margin: 'var(--space-md) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Utilizzo Memoria</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {memUsage.toFixed(1)}%
              </span>
            </div>
            <div className="care-progress-track">
              <div className="care-progress-fill" style={{ width: `${Math.min(100, Math.max(0, memUsage))}%`, backgroundColor: memUsage > 88 ? 'var(--accent-ruby)' : 'var(--accent-purple, #818cf8)' }} />
            </div>
          </div>

          <div className="care-telemetry-meta-grid">
            <div>
              <span className="care-meta-label">Memoria Utilizzata</span>
              <span className="care-meta-val">{memUsedGb} GB</span>
            </div>
            <div>
              <span className="care-meta-label">Disponibile / Cache</span>
              <span className="care-meta-val">{memAvailGb} GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GPU TELEMETRY SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <Flame size={18} color="var(--accent-ruby)" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Schede Video & Acceleratori GPU ({gpus.length})
          </h3>
        </div>

        {gpus.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nessuna GPU dedicata o sensore telemetrico rilevato.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
            {gpus.map((gpu) => {
              const coreTemp = isMetricAvailable(gpu.coreTemperatureCelsius) ? gpu.coreTemperatureCelsius.value : null;
              const vramUsedGb = isMetricAvailable(gpu.vramUsedBytes) ? (gpu.vramUsedBytes.value / (1024 * 1024 * 1024)).toFixed(1) : null;
              const vramTotalGb = isMetricAvailable(gpu.vramTotalBytes) ? (gpu.vramTotalBytes.value / (1024 * 1024 * 1024)).toFixed(1) : null;
              const vramPct = isMetricAvailable(gpu.vramUtilizationPercent) ? gpu.vramUtilizationPercent.value : 0;
              const gpuLoad = isMetricAvailable(gpu.utilizationPercent) ? gpu.utilizationPercent.value : 0;

              return (
                <div key={gpu.id} className="card care-telemetry-card">
                  <div className="care-telemetry-header">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{gpu.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{gpu.vendor}</span>
                    </div>
                    {gpu.isDiscrete ? (
                      <span className="badge badge-emerald">
                        Dedicata ({gpu.coreTemperatureCelsius.source || (gpu.vendor === 'AMD' ? 'ADL' : 'NVML')})
                      </span>
                    ) : (
                      <span className="badge badge-subtle">Integrata (iGPU)</span>
                    )}
                  </div>

                  {/* Core Temp, Hotspot (se presente) & Load */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMetricAvailable(gpu.hotspotTemperatureCelsius)
                        ? 'repeat(auto-fit, minmax(130px, 1fr))'
                        : '1fr 1fr',
                      gap: 'var(--space-md)',
                      margin: 'var(--space-md) 0',
                    }}
                  >
                    <div className="care-metric-box">
                      <span className="care-meta-label">Temperatura Core</span>
                      <div className={`care-metric-val ${getThermalClass(coreTemp)}`}>
                        {coreTemp !== null ? `${coreTemp.toFixed(0)}°C` : 'N/D'}
                      </div>
                    </div>

                    {isMetricAvailable(gpu.hotspotTemperatureCelsius) && (
                      <div className="care-metric-box">
                        <span className="care-meta-label">Hotspot Giunzione</span>
                        <div
                          className={`care-metric-val ${getHotspotThermalClass(
                            gpu.hotspotTemperatureCelsius.value
                          )}`}
                        >
                          {gpu.hotspotTemperatureCelsius.value.toFixed(0)}°C
                        </div>
                      </div>
                    )}

                    <div className="care-metric-box">
                      <span className="care-meta-label">Carico Core GPU</span>
                      <div className="care-metric-val">
                        {isMetricAvailable(gpu.utilizationPercent) ? `${gpuLoad.toFixed(0)}%` : 'N/D'}
                      </div>
                    </div>
                  </div>

                  {/* VRAM Bar */}
                  {vramTotalGb && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 'var(--space-2xs)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Memoria VRAM</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{vramUsedGb} / {vramTotalGb} GB ({vramPct.toFixed(0)}%)</span>
                      </div>
                      <div className="care-progress-track">
                        <div className="care-progress-fill" style={{ width: `${Math.min(100, Math.max(0, vramPct))}%`, backgroundColor: 'var(--accent-emerald)' }} />
                      </div>
                    </div>
                  )}

                  {/* Dettagli NVML secondari */}
                  <div className="care-telemetry-meta-grid">
                    <div>
                      <span className="care-meta-label">Giri Ventole</span>
                      <span className="care-meta-val">
                        {formatMetricValue(gpu.fanSpeedPercent)}
                      </span>
                    </div>
                    <div>
                      <span className="care-meta-label">Potenza Assorbita</span>
                      <span className="care-meta-val">
                        {formatMetricValue(gpu.powerWatts)}
                      </span>
                    </div>
                    <div>
                      <span className="care-meta-label">Clock Core</span>
                      <span className="care-meta-val">
                        {formatMetricValue(gpu.coreClockMhz)}
                      </span>
                    </div>
                    <div>
                      <span className="care-meta-label">Clock Memoria</span>
                      <span className="care-meta-val">
                        {formatMetricValue(gpu.memoryClockMhz)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. STORAGE VOLUMES & SYSTEM INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Storage volumes */}
        <div className="card care-telemetry-card">
          <div className="care-telemetry-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <HardDrive size={18} color="var(--accent-emerald)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Unità Disco & Partizioni</h3>
            </div>
            <span className="badge badge-subtle">{storage.length} Unità</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            {storage.map((d) => {
              const freeGb = (d.freeBytes / (1024 * 1024 * 1024)).toFixed(0);
              const totalGb = (d.totalBytes / (1024 * 1024 * 1024)).toFixed(0);
              const usage = d.utilizationPercent;

              return (
                <div key={d.driveLetter} style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2xs)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{d.driveLetter}</strong>{' '}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({d.label || 'Volume'} • {d.fileSystem})</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                      {freeGb} GB liberi su {totalGb} GB
                    </span>
                  </div>
                  <div className="care-progress-track">
                    <div
                      className="care-progress-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, usage))}%`,
                        backgroundColor: usage >= 85 ? 'var(--accent-ruby)' : usage >= 75 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System info */}
        <div className="card care-telemetry-card">
          <div className="care-telemetry-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Clock size={18} color="var(--accent-cyan)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Stato Sistema Operativo</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sistema Operativo</span>
              <strong style={{ color: 'var(--text-primary)' }}>{system?.osVersion || 'Windows'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Build Windows</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{system?.osBuild || 'N/D'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-xs) 0', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tempo di Attività (Uptime)</span>
              <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {formatUptime(system?.uptimeSeconds || 0)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
