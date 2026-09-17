import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Printer,
  Download,
  Share2,
  Sparkles,
  MessageSquare,
  FileText,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  ExportDetailLevel,
  GeminiPromptPreset,
  RigExportOptions,
  generateGeminiPrompt,
  generateDiscordMarkdown,
  generateWhatsAppText,
  generatePlainMarkdown,
  getWhatsAppShareUrl,
} from '../../domain/rigExportEngine';
import { InstalledComponentItem } from '../../store/PCContext';
import { saveBackupFileWithDialog, isDesktopApp } from '../../services';

export type ExportChannel = 'gemini' | 'discord' | 'whatsapp' | 'markdown' | 'print';

interface RigExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  installedComponents: InstalledComponentItem[];
  rigName?: string;
  rigDescription?: string;
  buildYear?: number;
  currentRigCost?: number;
  onNotify?: (type: 'success' | 'error', text: string) => void;
}

export const RigExportModal: React.FC<RigExportModalProps> = ({
  isOpen,
  onClose,
  installedComponents,
  rigName = 'Gaming PC',
  rigDescription,
  buildYear,
  currentRigCost = 0,
  onNotify,
}) => {
  const [detailLevel, setDetailLevel] = useState<ExportDetailLevel>('quick');
  const [channel, setChannel] = useState<ExportChannel>('gemini');
  const [geminiPreset, setGeminiPreset] = useState<GeminiPromptPreset>('upgrade');
  const [includeCost, setIncludeCost] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const exportOptions: RigExportOptions = useMemo(
    () => ({
      detailLevel,
      geminiPreset,
      rigName,
      rigDescription,
      buildYear,
      includeCost,
    }),
    [detailLevel, geminiPreset, rigName, rigDescription, buildYear, includeCost]
  );

  // Generazione del testo in base al canale selezionato
  const previewText = useMemo(() => {
    switch (channel) {
      case 'gemini':
        return generateGeminiPrompt(installedComponents, exportOptions);
      case 'discord':
        return generateDiscordMarkdown(installedComponents, exportOptions);
      case 'whatsapp':
        return generateWhatsAppText(installedComponents, exportOptions);
      case 'markdown':
      case 'print':
      default:
        return generatePlainMarkdown(installedComponents, exportOptions);
    }
  }, [channel, installedComponents, exportOptions]);

  // Gestione Copia negli Appunti con feedback
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2200);
      if (onNotify) {
        onNotify('success', 'Testo copiato negli appunti con successo!');
      }
    } catch {
      if (onNotify) {
        onNotify('error', 'Impossibile accedere agli appunti del sistema.');
      }
    }
  };

  // Condivisione diretta su WhatsApp
  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppText(installedComponents, exportOptions);
    const url = getWhatsAppShareUrl(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Download file Markdown (.md)
  const handleDownloadFile = async () => {
    const mdContent = generatePlainMarkdown(installedComponents, exportOptions);
    const safeRigName = rigName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const filename = `scheda-pc-${safeRigName || 'build'}.md`;

    if (isDesktopApp()) {
      await saveBackupFileWithDialog(filename, mdContent);
    } else {
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    if (onNotify) {
      onNotify('success', `File ${filename} salvato!`);
    }
  };

  // Stampa / Salva in PDF
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Esporta & Condividi Scheda PC"
      subtitle={`${rigName} • ${installedComponents.length} componenti operativi`}
      maxWidth="720px"
    >
      <div style={styles.container}>
        {/* Controlli Superiori: Livello di Dettaglio & Canale */}
        <div style={styles.topControlCard}>
          <div style={styles.levelRow}>
            <div style={styles.labelGroup}>
              <SlidersHorizontal size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Livello di Dettaglio
              </span>
            </div>

            <div style={styles.segmentedGroup}>
              <button
                type="button"
                className={`segmented-btn ${detailLevel === 'quick' ? 'active' : ''}`}
                onClick={() => setDetailLevel('quick')}
                style={styles.segmentedBtn(detailLevel === 'quick')}
              >
                🚀 Sintetica / Veloce (Clean)
              </button>
              <button
                type="button"
                className={`segmented-btn ${detailLevel === 'detailed' ? 'active' : ''}`}
                onClick={() => setDetailLevel('detailed')}
                style={styles.segmentedBtn(detailLevel === 'detailed')}
              >
                📋 Completa / Dettagliata
              </button>
            </div>
          </div>

          {detailLevel === 'detailed' && (
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={includeCost}
                onChange={(e) => setIncludeCost(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Includi prezzi di acquisto e valore totale (€ {currentRigCost.toFixed(2)})</span>
            </label>
          )}
        </div>

        {/* Tab / Canali di Destinazione */}
        <div style={styles.channelTabs}>
          <button
            type="button"
            style={styles.tabBtn(channel === 'gemini')}
            onClick={() => setChannel('gemini')}
            title="Prompt ottimizzato per Gemini, ChatGPT e Claude"
          >
            <Sparkles size={15} color={channel === 'gemini' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>Gemini / AI</span>
          </button>

          <button
            type="button"
            style={styles.tabBtn(channel === 'discord')}
            onClick={() => setChannel('discord')}
            title="Formattazione con emoji per Discord, Reddit e Forum"
          >
            <MessageSquare size={15} color={channel === 'discord' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>Discord / Forum</span>
          </button>

          <button
            type="button"
            style={styles.tabBtn(channel === 'whatsapp')}
            onClick={() => setChannel('whatsapp')}
            title="Formato WhatsApp con testo pronto e link rapido"
          >
            <Send size={15} color={channel === 'whatsapp' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            style={styles.tabBtn(channel === 'markdown')}
            onClick={() => setChannel('markdown')}
            title="Documento Markdown completo"
          >
            <FileText size={15} color={channel === 'markdown' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>Markdown</span>
          </button>

          <button
            type="button"
            style={styles.tabBtn(channel === 'print')}
            onClick={() => setChannel('print')}
            title="Scheda per stampa cartacea o salvataggio in PDF"
          >
            <Printer size={15} color={channel === 'print' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span>Stampa / PDF</span>
          </button>
        </div>

        {/* Sezione Preset Speciali per Gemini / AI */}
        {channel === 'gemini' && (
          <div style={styles.presetBox}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Obiettivo della richiesta a Gemini:
            </span>
            <div style={styles.presetPills}>
              <button
                type="button"
                style={styles.presetPill(geminiPreset === 'upgrade')}
                onClick={() => setGeminiPreset('upgrade')}
              >
                💡 Consulenza Upgrade
              </button>
              <button
                type="button"
                style={styles.presetPill(geminiPreset === 'bottleneck')}
                onClick={() => setGeminiPreset('bottleneck')}
              >
                ⚡ Verifica Bottleneck & PSU
              </button>
              <button
                type="button"
                style={styles.presetPill(geminiPreset === 'specs_only')}
                onClick={() => setGeminiPreset('specs_only')}
              >
                📋 Solo Specifiche Pure
              </button>
            </div>
          </div>
        )}

        {/* Anteprima Testo Live */}
        <div style={styles.previewContainer}>
          <div style={styles.previewHeader}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Anteprima Generata
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {previewText.length} caratteri
            </span>
          </div>
          <pre style={styles.codeBlock}>{previewText}</pre>
        </div>

        {/* Barra Azioni Principali */}
        <div style={styles.actionRow}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-primary micro-press"
              id="btn-copy-rig-export"
              style={{ minWidth: '150px' }}
            >
              {hasCopied ? (
                <>
                  <Check size={16} color="var(--accent-emerald)" />
                  <span>Copiato negli appunti!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>
                    {channel === 'gemini'
                      ? 'Copia per Gemini'
                      : channel === 'discord'
                      ? 'Copia per Discord'
                      : 'Copia Testo'}
                  </span>
                </>
              )}
            </button>

            {channel === 'whatsapp' && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="btn btn-secondary micro-press"
                title="Apri WhatsApp con il testo precaricato"
              >
                <Share2 size={15} color="var(--accent-emerald)" />
                <span>Invia su WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadFile}
              className="btn btn-secondary micro-press"
              title="Salva come file .md"
            >
              <Download size={15} />
              <span>Scarica .md</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary micro-press"
              title="Stampa o esporta in PDF tramite la finestra di sistema"
            >
              <Printer size={15} />
              <span>Stampa / PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary micro-press"
          >
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};

const styles: Record<string, any> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  topControlCard: {
    padding: '12px 14px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  levelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  segmentedGroup: {
    display: 'inline-flex',
    backgroundColor: 'var(--bg-canvas)',
    padding: '3px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
  },
  segmentedBtn: (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    backgroundColor: active ? 'var(--bg-surface-elevated)' : 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
  }),
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    marginTop: '2px',
  },
  channelTabs: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    paddingBottom: '4px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  tabBtn: (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    fontSize: '12.5px',
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--accent-primary-subtle)' : 'transparent',
    border: active ? '1px solid var(--accent-primary-border)' : '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  }),
  presetBox: {
    padding: '10px 12px',
    backgroundColor: 'var(--bg-surface-subtle)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  presetPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  presetPill: (active: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    fontSize: '11.5px',
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
    backgroundColor: active ? 'var(--accent-primary-subtle)' : 'var(--bg-surface-elevated)',
    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  previewContainer: {
    backgroundColor: 'var(--bg-canvas)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  previewHeader: {
    padding: '8px 12px',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBlock: {
    margin: 0,
    padding: '12px 14px',
    maxHeight: '220px',
    overflowY: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
};
