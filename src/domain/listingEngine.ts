import {
  Component,
  ComponentComputedState,
  ComponentEvent,
  COMPONENT_CATEGORY_LABELS,
  WarrantyInfo,
  ListingOptions,
  MarketplacePlatform,
  MarketplaceListingOutput,
  AllMarketplaceListings,
  LISTING_CONDITION_LABELS,
  SHIPPING_OPTION_LABELS,
} from '../types';
import { formatDate } from '../utils';
import { findPurchaseEvent } from './warrantyEngine';

/**
 * Mappatura delle etichette brevi di condizione per i titoli degli annunci.
 */
const CONDITION_TITLE_HIGHLIGHTS: Record<string, string> = {
  like_new: 'Come Nuovo',
  excellent: 'Ottime Condizioni',
  good: 'Buone Condizioni',
  fair: 'Funzionante',
};

/**
 * Hashtag consigliati per Vinted suddivisi per categoria hardware.
 */
const CATEGORY_HASHTAGS: Record<string, string[]> = {
  gpu: ['#gpu', '#schedavideo', '#graphicscard', '#pcgaming', '#gamingpc', '#hardware'],
  cpu: ['#cpu', '#processore', '#intel', '#amd', '#ryzen', '#pcgaming', '#hardware'],
  motherboard: ['#motherboard', '#schedamadre', '#pcgaming', '#hardware', '#pcbuild'],
  ram: ['#ram', '#ddr4', '#ddr5', '#pcgaming', '#hardware', '#memory'],
  storage: ['#ssd', '#nvme', '#storage', '#pcgaming', '#hardware'],
  psu: ['#psu', '#alimentatore', '#powersupply', '#pcgaming', '#hardware'],
  case: ['#casepc', '#pcgaming', '#gamingcase', '#hardware'],
  cooling: ['#cooling', '#aio', '#dissipatore', '#pcgaming', '#hardware'],
  monitor: ['#monitor', '#display', '#gamingmonitor', '#pcgaming'],
  peripherals: ['#peripherals', '#periferiche', '#tastiera', '#mouse', '#gaming'],
  accessories: ['#accessori', '#pcgaming', '#cavi', '#modding'],
  other: ['#hardware', '#pcgaming', '#tech'],
};

/**
 * Converte i giorni di utilizzo reale calcolati da lifecycleEngine in una stringa discorsiva e trasparente in italiano.
 */
export function formatUsageDuration(daysInUse: number): string {
  if (daysInUse <= 0) {
    return 'Mai montato (nuovo / tenuto di scorta a magazzino)';
  }
  if (daysInUse === 1) {
    return '1 solo giorno di effettivo utilizzo';
  }
  if (daysInUse < 30) {
    return `${daysInUse} giorni di effettivo utilizzo`;
  }
  const totalMonths = Math.round(daysInUse / 30.4375);
  if (totalMonths < 12) {
    return totalMonths <= 1 ? 'circa 1 mese di effettivo utilizzo' : `circa ${totalMonths} mesi di effettivo utilizzo`;
  }
  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;
  if (remMonths > 0) {
    const yearStr = years === 1 ? '1 anno' : `${years} anni`;
    const monthStr = remMonths === 1 ? '1 mese' : `${remMonths} mesi`;
    return `circa ${yearStr} e ${monthStr} di effettivo utilizzo`;
  }
  return `circa ${years === 1 ? '1 anno' : `${years} anni`} di effettivo utilizzo`;
}

/**
 * Accorcia intelligentemente una stringa al limite massimo di caratteri senza troncare parole a metà.
 */
export function clampText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  const sliced = trimmed.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return sliced.slice(0, lastSpace).trim();
  }
  return sliced.trim();
}

/**
 * Costruisce il nome pulito del componente evitando ripetizioni (es. se la marca è già inclusa nel nome).
 */
export function buildComponentCleanName(component: Component): string {
  const brand = component.brand?.trim() || '';
  const name = component.name?.trim() || '';
  const model = component.model?.trim() || '';

  let fullName = name;
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    fullName = `${brand} ${name}`;
  }

  if (model && !fullName.toLowerCase().includes(model.toLowerCase())) {
    fullName = `${fullName} ${model}`;
  }

  return fullName.trim();
}

/**
 * Genera il titolo ottimizzato per marketplace entro i limiti di caratteri della piattaforma.
 * Limiti tipici:
 * - Subito.it: 100 caratteri
 * - eBay: 80 caratteri
 * - Vinted: 100 caratteri
 */
export function generateListingTitle(
  component: Component,
  options: ListingOptions,
  platform: MarketplacePlatform,
  warranty?: WarrantyInfo
): string {
  const cleanName = buildComponentCleanName(component);
  const conditionHighlight = CONDITION_TITLE_HIGHLIGHTS[options.condition] || 'Come Nuovo';

  let highlightPart = '';
  if (options.hasOriginalBox) {
    highlightPart = options.condition === 'like_new' ? 'Perfetto con Scatola' : 'Con Scatola';
  } else {
    highlightPart = conditionHighlight;
  }

  const warrantyTag = warranty?.isActive ? '(In Garanzia)' : '';

  let candidate = `${cleanName} - ${highlightPart}`;
  if (warrantyTag) {
    candidate += ` ${warrantyTag}`;
  }

  const maxLen = platform === 'ebay' ? 80 : 100;
  if (candidate.length <= maxLen) {
    return candidate;
  }

  // Se supera la lunghezza per eBay o Subito, proviamo prima rimuovendo la garanzia
  candidate = `${cleanName} - ${highlightPart}`;
  if (candidate.length <= maxLen) {
    return candidate;
  }

  // Se ancora troppo lungo, tronchiamo intelligentemente
  return clampText(candidate, maxLen);
}

/**
 * Genera l'annuncio completo per Subito.it.
 * Stile: pulito, cordiale, con sezioni emoji chiare ed elenchi puntati ad alta trasparenza.
 */
export function generateSubitoListing(
  component: Component,
  computed: ComponentComputedState,
  events: ComponentEvent[],
  warranty: WarrantyInfo | undefined,
  receiptCount: number,
  options: ListingOptions
): MarketplaceListingOutput {
  const title = generateListingTitle(component, options, 'subito', warranty);
  const cleanName = buildComponentCleanName(component);
  const categoryLabel = COMPONENT_CATEGORY_LABELS[component.category] || component.category;
  const usageText = formatUsageDuration(computed.daysInUse);
  const purchaseEvent = findPurchaseEvent(events);

  const lines: string[] = [];

  // Intestazione
  lines.push(`Vendo ${cleanName} (${categoryLabel}) per inutilizzo / passaggio ad altro hardware.`);
  if (options.askingPrice && options.askingPrice > 0) {
    lines.push(`💰 Prezzo richiesto: €${options.askingPrice.toFixed(2)}`);
  }
  lines.push('');

  // Sezione Stato e Utilizzo Reale
  lines.push('⚙️ STATO E UTILIZZO REALE');
  lines.push(`• Condizioni: ${LISTING_CONDITION_LABELS[options.condition]}`);
  lines.push(`• Tempo effettivo di utilizzo: ${usageText}`);
  if (options.smokeFreeNoMining) {
    lines.push('• Ambiente di utilizzo: postazione desktop domestica pulita, ambiente non fumatori, nessun utilizzo per mining e nessun overclock estremo');
  }
  lines.push('• Funzionamento: testato al 100%, perfettamente funzionante e privo di qualsiasi difetto');
  lines.push('');

  // Sezione Garanzia e Documenti
  lines.push('🛡️ GARANZIA E RICEVUTE');
  if (purchaseEvent?.store) {
    lines.push(`• Negozio d'acquisto: ${purchaseEvent.store}`);
  }
  if (warranty?.isActive && warranty.expiryDate) {
    const formattedExpiry = formatDate(warranty.expiryDate);
    lines.push(`• Garanzia ufficiale: ATTIVA fino al ${formattedExpiry} (${warranty.humanLabel.toLowerCase()})`);
    if (receiptCount > 0) {
      lines.push('• Ricevuta/Fattura d\'acquisto: presente e fornita all\'acquirente per la validità della garanzia');
    }
  } else if (warranty?.isExpired) {
    lines.push('• Garanzia del produttore: periodo terminato');
    lines.push('• Componente scrupolosamente testato e conservato con la massima cura');
  } else {
    lines.push('• Garanzia del produttore: non presente / scaduta');
    lines.push('• Componente perfettamente funzionante e verificato');
  }
  lines.push('');

  // Sezione Confezione e Accessori
  lines.push('📦 DOTAZIONE E IMBALLO');
  if (options.hasOriginalBox) {
    lines.push('• Scatola originale: PRESENTE e integra in ottime condizioni');
  } else {
    lines.push('• Scatola originale: non presente (verrà fornito con imballo antistatico sicuro e protettivo)');
  }
  if (options.hasAccessories) {
    lines.push('• Accessori e cavetteria: tutti gli accessori e cavi originali a corredo inclusi');
  } else {
    lines.push('• Accessori: venduto come componente singolo');
  }
  if (component.serialNumber) {
    lines.push(`• Numero seriale (S/N): ${component.serialNumber} (indicato per totale trasparenza)`);
  }
  lines.push('');

  // Note personalizzate o del componente
  if (options.customNotes?.trim() || component.notes?.trim()) {
    lines.push('📝 NOTE AGGIUNTIVE');
    if (options.customNotes?.trim()) {
      lines.push(`• ${options.customNotes.trim()}`);
    }
    if (component.notes?.trim() && component.notes.trim() !== options.customNotes?.trim()) {
      lines.push(`• ${component.notes.trim()}`);
    }
    lines.push('');
  }

  // Sezione Consegna e Spedizione
  lines.push('🚚 CONSEGNA E SPEDIZIONE');
  const citySuffix = options.handDeliveryCity?.trim() ? ` a ${options.handDeliveryCity.trim()}` : '';
  if (options.shippingOption === 'both') {
    lines.push(`• Ritiro a mano: disponibile e preferito per qualsiasi verifica di persona${citySuffix}`);
    lines.push('• Spedizione: disponibile tramite TuttoSubito con imballo accurato e a prova di urto');
  } else if (options.shippingOption === 'hand_only') {
    lines.push(`• Solo ritiro a mano${citySuffix}, disponibile a qualsiasi prova prima dell'acquisto`);
  } else {
    lines.push('• Spedizione tracciata con corriere espresso e imballaggio professionale multistrato');
  }
  lines.push('');

  // Chiusura e trasparenza tra privati
  lines.push('🤝 CONDIZIONI DI VENDITA');
  lines.push('Vendita tra privati con formula visto e piaciuto. Massima serietà offerta e richiesta, no perditempo.');

  const description = lines.join('\n');
  return {
    title,
    description,
    platform: 'subito',
    characterCount: description.length,
  };
}

/**
 * Genera l'annuncio per eBay.
 * Stile: layout strutturato a blocchi con separatori orizzontali e schede tecniche leggibili.
 */
export function generateEbayListing(
  component: Component,
  computed: ComponentComputedState,
  events: ComponentEvent[],
  warranty: WarrantyInfo | undefined,
  receiptCount: number,
  options: ListingOptions
): MarketplaceListingOutput {
  const title = generateListingTitle(component, options, 'ebay', warranty);
  const cleanName = buildComponentCleanName(component);
  const categoryLabel = COMPONENT_CATEGORY_LABELS[component.category] || component.category;
  const usageText = formatUsageDuration(computed.daysInUse);
  const purchaseEvent = findPurchaseEvent(events);

  const lines: string[] = [];

  lines.push(`=== ${cleanName.toUpperCase()} ===`);
  lines.push(`Categoria: ${categoryLabel}`);
  if (options.askingPrice && options.askingPrice > 0) {
    lines.push(`Prezzo compralo subito: €${options.askingPrice.toFixed(2)}`);
  }
  lines.push('');

  lines.push('--- SPECIFICHE DELL\'OGGETTO & CONDIZIONI ---');
  lines.push(`• Marca: ${component.brand || 'N/D'}`);
  lines.push(`• Modello: ${component.model || component.name}`);
  lines.push(`• Condizione: ${LISTING_CONDITION_LABELS[options.condition]}`);
  lines.push(`• Tempo di utilizzo reale documentato: ${usageText}`);
  if (options.hasOriginalBox) {
    lines.push('• Confezione originale: Inclusa ed integra');
  } else {
    lines.push('• Confezione originale: Non inclusa (imballaggio antistatico protetto)');
  }
  if (options.hasAccessories) {
    lines.push('• Dotazione / Accessori: Completi');
  }
  if (component.serialNumber) {
    lines.push(`• S/N: ${component.serialNumber}`);
  }
  lines.push('');

  lines.push('--- DESCRIZIONE & STATO OPERATIVO ---');
  lines.push(`Vendo ${cleanName} in perfette condizioni operative.`);
  lines.push('Il componente è stato testato a fondo ed è al 100% funzionante.');
  if (options.smokeFreeNoMining) {
    lines.push('Utilizzato esclusivamente in ambiente domestico per non fumatori, senza carichi da mining o overclock estremi.');
  }
  lines.push('');

  lines.push('--- GARANZIA & DOCUMENTI ---');
  if (purchaseEvent?.store) {
    lines.push(`Acquistato originariamente presso: ${purchaseEvent.store}.`);
  }
  if (warranty?.isActive && warranty.expiryDate) {
    lines.push(`Garanzia ufficiale attiva fino al ${formatDate(warranty.expiryDate)} (${warranty.humanLabel.toLowerCase()}).`);
    if (receiptCount > 0) {
      lines.push('Ricevuta / fattura d\'acquisto inclusa per eventuale assistenza RMA.');
    }
  } else {
    lines.push('Garanzia commerciale scaduta. Oggetto garantito funzionante all\'arrivo.');
  }
  lines.push('');

  lines.push('--- SPEDIZIONE & IMBALLAGGIO ---');
  const citySuffix = options.handDeliveryCity?.trim() ? ` in zona ${options.handDeliveryCity.trim()}` : '';
  if (options.shippingOption === 'both') {
    lines.push(`Possibile ritiro a mano${citySuffix} oppure spedizione tracciata assicurata.`);
  } else if (options.shippingOption === 'hand_only') {
    lines.push(`Solo ritiro a mano${citySuffix}.`);
  } else {
    lines.push('Spedizione rapida con corriere espresso tracciabile.');
  }
  lines.push('Imballaggio professionale a più strati protettivi per evitare qualsiasi danno da trasporto.');
  lines.push('');

  lines.push('--- CLAUSOLA DI VENDITA ---');
  lines.push('Trattandosi di compravendita tra privati si applica la formula visto e piaciuto.');
  lines.push('Spedizione rapida entro 24-48 ore dalla ricezione del pagamento.');

  const description = lines.join('\n');
  return {
    title,
    description,
    platform: 'ebay',
    characterCount: description.length,
  };
}

/**
 * Genera l'annuncio per Vinted / Wallapop.
 * Stile: conciso, diretto, informale e con hashtag tematici in calce.
 */
export function generateVintedListing(
  component: Component,
  computed: ComponentComputedState,
  events: ComponentEvent[],
  warranty: WarrantyInfo | undefined,
  receiptCount: number,
  options: ListingOptions
): MarketplaceListingOutput {
  const title = generateListingTitle(component, options, 'vinted', warranty);
  const cleanName = buildComponentCleanName(component);
  const usageText = formatUsageDuration(computed.daysInUse);
  const purchaseEvent = findPurchaseEvent(events);

  const lines: string[] = [];

  lines.push(`✨ Vendo ${cleanName}`);
  lines.push('');
  lines.push('Dettagli principali:');
  lines.push(`🔹 Condizioni: ${LISTING_CONDITION_LABELS[options.condition]}`);
  lines.push(`🔹 Utilizzo effettivo: ${usageText}`);
  if (purchaseEvent?.store) {
    lines.push(`🔹 Acquistato su: ${purchaseEvent.store}`);
  }
  lines.push(options.hasOriginalBox ? '🔹 Scatola originale: Sì, inclusa e integra' : '🔹 Scatola: No (spedito in imballo ultra-sicuro)');
  lines.push(options.hasAccessories ? '🔹 Accessori inclusi: Sì' : '🔹 Accessori: Solo pezzo');

  if (warranty?.isActive && warranty.expiryDate) {
    lines.push(`🔹 Garanzia: Attiva fino a ${formatDate(warranty.expiryDate)} ${receiptCount > 0 ? '(con ricevuta)' : ''}`);
  } else {
    lines.push('🔹 Funzionamento: Testato al 100%, pronto all\'uso');
  }

  if (options.smokeFreeNoMining) {
    lines.push('🔹 Provenienza: Casa non fumatori, mai mining');
  }

  if (options.askingPrice && options.askingPrice > 0) {
    lines.push(`💶 Prezzo: €${options.askingPrice.toFixed(2)}`);
  }

  if (options.customNotes?.trim()) {
    lines.push('');
    lines.push(`Nota: ${options.customNotes.trim()}`);
  }

  lines.push('');
  lines.push('📦 Spedizione veloce e imballaggio molto curato!');

  // Hashtag pertinenti in calce
  const categoryTags = CATEGORY_HASHTAGS[component.category] || ['#hardware', '#pcgaming'];
  const brandTag = component.brand ? `#${component.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const allTags = [...categoryTags];
  if (brandTag && !allTags.includes(brandTag)) {
    allTags.unshift(brandTag);
  }

  lines.push('');
  lines.push(allTags.join(' '));

  const description = lines.join('\n');
  return {
    title,
    description,
    platform: 'vinted',
    characterCount: description.length,
  };
}

/**
 * Genera il Super-Prompt ottimizzato per modelli IA di frontiera (ChatGPT, Claude, Gemini).
 * Consente all'utente di ottenere con un clic il testo completo da incollare nell'IA preferita,
 * con tutti i dati tecnici, cronologici e le direttive di copywriting senza richiedere API esterne o VRAM.
 */
export function generateAIPrompt(
  component: Component,
  computed: ComponentComputedState,
  events: ComponentEvent[],
  warranty: WarrantyInfo | undefined,
  receiptCount: number,
  options: ListingOptions
): MarketplaceListingOutput {
  const cleanName = buildComponentCleanName(component);
  const categoryLabel = COMPONENT_CATEGORY_LABELS[component.category] || component.category;
  const usageText = formatUsageDuration(computed.daysInUse);
  const purchaseEvent = findPurchaseEvent(events);

  const lines: string[] = [];

  lines.push('Agisci come un esperto venditore ed appassionato di hardware PC, specializzato in compravendita di componenti usati su marketplace come Subito.it, eBay e Vinted.');
  lines.push('Scrivi un annuncio di vendita persuasivo, onesto, altamente professionale e rassicurante per il seguente pezzo:');
  lines.push('');
  lines.push('--- DATI CERTIFICATI DEL COMPONENTE ---');
  lines.push(`- Componente: ${cleanName}`);
  lines.push(`- Categoria: ${categoryLabel}`);
  lines.push(`- Produttore: ${component.brand || 'Non specificato'}`);
  lines.push(`- Modello: ${component.model || component.name}`);
  if (purchaseEvent?.store) {
    lines.push(`- Negozio d'acquisto originario: ${purchaseEvent.store}`);
  }
  if (component.serialNumber) {
    lines.push(`- Seriale S/N: ${component.serialNumber}`);
  }
  lines.push(`- Condizione estetica/funzionale: ${LISTING_CONDITION_LABELS[options.condition]}`);
  lines.push(`- Tempo di utilizzo effettivo verificato: ${usageText}`);
  lines.push(`- Scatola originale: ${options.hasOriginalBox ? 'Presente e integra' : 'Non presente (imballo antistatico alternativo)'}`);
  lines.push(`- Accessori inclusi: ${options.hasAccessories ? 'Completi' : 'Solo componente'}`);
  lines.push(`- Cura & Ambiente: ${options.smokeFreeNoMining ? 'Ambiente non fumatori, pulito, no mining, no overclock estremo' : 'Uso standard'}`);

  if (warranty?.isActive && warranty.expiryDate) {
    lines.push(`- Garanzia ufficiale: Attiva fino al ${formatDate(warranty.expiryDate)} (${warranty.humanLabel})`);
    lines.push(`- Ricevuta / Fattura originale: ${receiptCount > 0 ? 'Disponibile per l\'acquirente' : 'Non disponibile'}`);
  } else if (warranty?.isExpired) {
    lines.push('- Garanzia del produttore: Scaduta (componente testato e perfettamente funzionante)');
  } else {
    lines.push('- Garanzia: Non registrata / Vendita tra privati');
  }

  if (options.askingPrice && options.askingPrice > 0) {
    lines.push(`- Prezzo desiderato: €${options.askingPrice.toFixed(2)}`);
  }
  lines.push(`- Spedizione / Ritiro: ${SHIPPING_OPTION_LABELS[options.shippingOption]}${options.handDeliveryCity ? ` in zona ${options.handDeliveryCity}` : ''}`);

  if (options.customNotes?.trim()) {
    lines.push(`- Note particolari da evidenziare: ${options.customNotes.trim()}`);
  }

  lines.push('');
  lines.push('--- FORMATO RICHIESTO ---');
  lines.push('Genera:');
  lines.push('1. Un Titolo ottimizzato ad alto click-through rate (max 80 caratteri).');
  lines.push('2. La Descrizione completa per Subito.it con elenchi puntati ed emoji sobrie.');
  lines.push('3. Una variante sintetica per Vinted con hashtag.');
  lines.push('Mantieni un tono serio, trasparente e da appassionato di hardware, senza esagerazioni commerciali fasulle.');

  const description = lines.join('\n');
  return {
    title: `Prompt IA per ${cleanName}`,
    description,
    platform: 'ai_prompt',
    characterCount: description.length,
  };
}

/**
 * Funzione pura aggregata che genera simultaneamente tutte le varianti di annuncio.
 */
export function generateMarketplaceListings(
  component: Component,
  computed: ComponentComputedState,
  events: ComponentEvent[],
  warranty: WarrantyInfo | undefined,
  receiptCount: number,
  options: ListingOptions
): AllMarketplaceListings {
  return {
    subito: generateSubitoListing(component, computed, events, warranty, receiptCount, options),
    ebay: generateEbayListing(component, computed, events, warranty, receiptCount, options),
    vinted: generateVintedListing(component, computed, events, warranty, receiptCount, options),
    aiPrompt: generateAIPrompt(component, computed, events, warranty, receiptCount, options),
  };
}
