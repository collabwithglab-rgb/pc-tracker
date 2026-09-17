import { ComponentCategory, COMPONENT_CATEGORY_LABELS } from '../types/component';
import { InstalledComponentItem } from '../store/PCContext';

export type ExportDetailLevel = 'quick' | 'detailed';
export type GeminiPromptPreset = 'upgrade' | 'bottleneck' | 'specs_only';

export interface RigExportOptions {
  detailLevel: ExportDetailLevel;
  geminiPreset?: GeminiPromptPreset;
  rigName?: string;
  rigDescription?: string;
  buildYear?: number;
  includeCost?: boolean;
}

export const CATEGORY_ORDER: ComponentCategory[] = [
  'cpu',
  'cooling',
  'motherboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'monitor',
  'peripherals',
  'accessories',
  'other',
];

export const CATEGORY_EMOJI: Record<ComponentCategory, string> = {
  cpu: '🧠',
  cooling: '❄️',
  motherboard: '🔲',
  ram: '⚡',
  gpu: '🎮',
  storage: '💾',
  psu: '🔌',
  case: '📦',
  monitor: '🖥️',
  peripherals: '⌨️',
  accessories: '🎛️',
  other: '🧩',
};

export const CATEGORY_DISCORD_LABEL: Record<ComponentCategory, string> = {
  cpu: 'CPU',
  cooling: 'COOLING',
  motherboard: 'MOBO',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'STORAGE',
  psu: 'PSU',
  case: 'CASE',
  monitor: 'MONITOR',
  peripherals: 'PERIPHERALS',
  accessories: 'ACCESSORIES',
  other: 'OTHER',
};

/**
 * Ordina i componenti montati per importanza logica hardware
 */
export function sortInstalledComponents(items: InstalledComponentItem[]): InstalledComponentItem[] {
  return [...items].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.component.category);
    const idxB = CATEGORY_ORDER.indexOf(b.component.category);
    const pA = idxA === -1 ? 99 : idxA;
    const pB = idxB === -1 ? 99 : idxB;
    if (pA !== pB) return pA - pB;
    return a.component.name.localeCompare(b.component.name);
  });
}

/**
 * Format string per un componente in modalità sintetica (marca + nome/modello)
 */
function formatQuickItem(item: InstalledComponentItem): string {
  const { component } = item;
  let title = component.name;
  if (component.model && !title.toLowerCase().includes(component.model.toLowerCase())) {
    title += ` - ${component.model}`;
  }
  return title;
}

/**
 * Genera il prompt Markdown formattato per Gemini / ChatGPT / Claude
 */
export function generateGeminiPrompt(
  items: InstalledComponentItem[],
  options: RigExportOptions
): string {
  const sorted = sortInstalledComponents(items);
  const rigTitle = options.rigName || 'PC Desktop';
  const detail = options.detailLevel;
  const preset = options.geminiPreset || 'upgrade';

  const lines: string[] = [];

  // Intestazione prompt
  lines.push(`Ecco la configurazione hardware attuale del mio ${rigTitle}:`);
  lines.push('');

  if (sorted.length === 0) {
    lines.push('(Nessun componente attualmente montato nel database)');
  } else {
    for (const item of sorted) {
      const catLabel = COMPONENT_CATEGORY_LABELS[item.component.category];
      if (detail === 'quick') {
        lines.push(`- **${catLabel}**: ${formatQuickItem(item)}`);
      } else {
        const parts: string[] = [`- **${catLabel}**: ${formatQuickItem(item)}`];
        const extras: string[] = [];
        if (item.lastInstallEvent?.slotOrLocation) {
          extras.push(`Slot: ${item.lastInstallEvent.slotOrLocation}`);
        }
        if (options.includeCost && item.computed.totalPurchaseCost > 0) {
          extras.push(`Costo d'acquisto: € ${item.computed.totalPurchaseCost.toFixed(2)}`);
        }
        if (item.component.notes) {
          extras.push(`Note: ${item.component.notes}`);
        }
        if (extras.length > 0) {
          parts.push(`  *${extras.join(' | ')}*`);
        }
        lines.push(parts.join('\n  '));
      }
    }
  }

  lines.push('');

  // Coda del prompt a seconda del preset scelto
  switch (preset) {
    case 'upgrade':
      lines.push(
        'Vorrei valutare un upgrade mirato. Considerando i componenti attuali (in particolare processore, scheda video, alimentatore e scheda madre), quali modifiche o sostituzioni mi consigli di pianificare per prime, e con quali modelli compatibili?'
      );
      break;
    case 'bottleneck':
      lines.push(
        'Analizza questa configurazione: ci sono colli di bottiglia (bottleneck) evidenti, limiti di alimentazione (wattaggio PSU) o incompatibilità tra i componenti attuali?'
      );
      break;
    case 'specs_only':
      // Nessuna domanda aggiuntiva
      break;
  }

  return lines.join('\n').trim();
}

/**
 * Genera il testo ottimizzato per Discord e Forum con emoji hardware e markdown
 */
export function generateDiscordMarkdown(
  items: InstalledComponentItem[],
  options: RigExportOptions
): string {
  const sorted = sortInstalledComponents(items);
  const rigTitle = (options.rigName || 'PC SPECIFICATIONS').toUpperCase();
  const detail = options.detailLevel;

  const lines: string[] = [];
  lines.push(`🖥️ **${rigTitle}**`);
  if (options.buildYear) {
    lines.push(`*Build originaria: ${options.buildYear}*`);
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (sorted.length === 0) {
    lines.push('*(Nessun componente installato)*');
  } else {
    for (const item of sorted) {
      const emoji = CATEGORY_EMOJI[item.component.category] || '▫️';
      const label = CATEGORY_DISCORD_LABEL[item.component.category] || item.component.category.toUpperCase();
      const mainText = formatQuickItem(item);

      if (detail === 'quick') {
        lines.push(`▫️ ${emoji} **${label}:** ${mainText}`);
      } else {
        let line = `▫️ ${emoji} **${label}:** ${mainText}`;
        const meta: string[] = [];
        if (item.lastInstallEvent?.slotOrLocation) {
          meta.push(`Slot: ${item.lastInstallEvent.slotOrLocation}`);
        }
        if (options.includeCost && item.computed.totalPurchaseCost > 0) {
          meta.push(`€${item.computed.totalPurchaseCost.toFixed(2)}`);
        }
        if (meta.length > 0) {
          line += ` _(${meta.join(' • ')})_`;
        }
        lines.push(line);
      }
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (options.includeCost && detail === 'detailed') {
    const totalCost = sorted.reduce((sum, i) => sum + i.computed.totalPurchaseCost, 0);
    if (totalCost > 0) {
      lines.push(`💰 **Costo Totale Componenti Montati:** € ${totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Genera il testo per WhatsApp con grassetti nativi (*testo*) ed emoji
 */
export function generateWhatsAppText(
  items: InstalledComponentItem[],
  options: RigExportOptions
): string {
  const sorted = sortInstalledComponents(items);
  const rigTitle = options.rigName || 'Mio PC';
  const detail = options.detailLevel;

  const lines: string[] = [];
  lines.push(`🖥️ *SPECIFICHE PC — ${rigTitle}*`);
  if (options.buildYear) {
    lines.push(`_Assemblato nel ${options.buildYear}_`);
  }
  lines.push('');

  if (sorted.length === 0) {
    lines.push('_(Nessun componente installato)_');
  } else {
    for (const item of sorted) {
      const emoji = CATEGORY_EMOJI[item.component.category] || '•';
      const label = COMPONENT_CATEGORY_LABELS[item.component.category];
      const mainText = formatQuickItem(item);

      if (detail === 'quick') {
        lines.push(`${emoji} *${label}:* ${mainText}`);
      } else {
        let line = `${emoji} *${label}:* ${mainText}`;
        const meta: string[] = [];
        if (item.lastInstallEvent?.slotOrLocation) {
          meta.push(`Pos: ${item.lastInstallEvent.slotOrLocation}`);
        }
        if (options.includeCost && item.computed.totalPurchaseCost > 0) {
          meta.push(`€ ${item.computed.totalPurchaseCost.toFixed(2)}`);
        }
        if (meta.length > 0) {
          line += `\n   ↳ _${meta.join(' | ')}_`;
        }
        lines.push(line);
      }
    }
  }

  if (options.includeCost && detail === 'detailed') {
    const totalCost = sorted.reduce((sum, i) => sum + i.computed.totalPurchaseCost, 0);
    if (totalCost > 0) {
      lines.push('');
      lines.push(`💰 *Valore Hardware Montato:* € ${totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Genera il documento Markdown completo pronto per download come file (.md)
 */
export function generatePlainMarkdown(
  items: InstalledComponentItem[],
  options: RigExportOptions
): string {
  const sorted = sortInstalledComponents(items);
  const rigTitle = options.rigName || 'Specifiche Tecniche PC';
  const detail = options.detailLevel;
  const dateStr = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });

  const lines: string[] = [];
  lines.push(`# ${rigTitle}`);
  lines.push(`> Generato con PC Tracker il ${dateStr}`);
  if (options.rigDescription) {
    lines.push(`> ${options.rigDescription}`);
  }
  lines.push('');

  if (sorted.length === 0) {
    lines.push('_Nessun componente attualmente installato._');
    return lines.join('\n');
  }

  if (detail === 'quick') {
    lines.push('## Specifiche Hardware');
    lines.push('');
    for (const item of sorted) {
      const catLabel = COMPONENT_CATEGORY_LABELS[item.component.category];
      lines.push(`- **${catLabel}**: ${formatQuickItem(item)}`);
    }
  } else {
    lines.push('## Tabella Configurazione Attuale');
    lines.push('');
    lines.push('| Categoria | Componente | Specifiche / Note | Slot / Posizione |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const item of sorted) {
      const catLabel = COMPONENT_CATEGORY_LABELS[item.component.category];
      const name = `${item.component.brand} ${item.component.name}`.trim();
      const notes = (item.component.notes || item.component.model || '-').replace(/\|/g, '/');
      const slot = item.lastInstallEvent?.slotOrLocation || '-';
      lines.push(`| **${catLabel}** | ${name} | ${notes} | ${slot} |`);
    }

    if (options.includeCost) {
      const totalCost = sorted.reduce((sum, i) => sum + i.computed.totalPurchaseCost, 0);
      lines.push('');
      lines.push(`**Costo Totale Hardware Montato:** € ${totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Genera l'URL di condivisione WhatsApp Web/App
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
