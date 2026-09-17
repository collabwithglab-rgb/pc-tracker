import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Component,
  ComponentComputedState,
  ComponentEvent,
  COMPONENT_CATEGORY_LABELS,
  WarrantyInfo,
  ListingOptions,
  MarketplacePlatform,
  ListingCondition,
  ShippingOption,
  LISTING_CONDITION_LABELS,
  SHIPPING_OPTION_LABELS,
} from '../../types';
import { generateMarketplaceListings } from '../../domain';
import {
  Copy,
  Check,
  Sparkles,
  Tag,
  Store,
  Bot,
  RotateCcw,
  Sliders,
} from 'lucide-react';

export interface ListingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: Component;
  computed: ComponentComputedState;
  events: ComponentEvent[];
  warranty?: WarrantyInfo;
  receiptCount?: number;
}

export const ListingGeneratorModal: React.FC<ListingGeneratorModalProps> = ({
  isOpen,
  onClose,
  component,
  computed,
  events,
  warranty,
  receiptCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<MarketplacePlatform>('subito');

  // Opzioni configurabili dell'annuncio
  const [condition, setCondition] = useState<ListingCondition>('like_new');
  const [hasOriginalBox, setHasOriginalBox] = useState<boolean>(true);
  const [hasAccessories, setHasAccessories] = useState<boolean>(true);
  const [smokeFreeNoMining, setSmokeFreeNoMining] = useState<boolean>(true);
  const [shippingOption, setShippingOption] = useState<ShippingOption>('both');
  const [handDeliveryCity, setHandDeliveryCity] = useState<string>('');
  const [askingPrice, setAskingPrice] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Modifiche manuali dell'utente per singola piattaforma
  const [editedDescriptions, setEditedDescriptions] = useState<Partial<Record<MarketplacePlatform, string>>>({});
  const [copiedFeedback, setCopiedFeedback] = useState<'title' | 'description' | 'all' | null>(null);

  // Reset delle modifiche personalizzate alla chiusura o cambio pezzo
  useEffect(() => {
    if (!isOpen) {
      setEditedDescriptions({});
      setCopiedFeedback(null);
    }
  }, [isOpen, component.id]);

  const numAskingPrice = parseFloat(askingPrice);
  const validAskingPrice = !isNaN(numAskingPrice) && numAskingPrice > 0 ? numAskingPrice : undefined;

  const currentOptions: ListingOptions = useMemo(
    () => ({
      condition,
      hasOriginalBox,
      hasAccessories,
      smokeFreeNoMining,
      shippingOption,
      handDeliveryCity: handDeliveryCity.trim() || undefined,
      askingPrice: validAskingPrice,
      customNotes: customNotes.trim() || undefined,
    }),
    [
      condition,
      hasOriginalBox,
      hasAccessories,
      smokeFreeNoMining,
      shippingOption,
      handDeliveryCity,
      validAskingPrice,
      customNotes,
    ]
  );

  // Generazione reattiva e memoizzata (0ms latency, zero memory leak)
  const allListings = useMemo(() => {
    return generateMarketplaceListings(
      component,
      computed,
      events,
      warranty,
      receiptCount,
      currentOptions
    );
  }, [component, computed, events, warranty, receiptCount, currentOptions]);

  const activeListing = useMemo(() => {
    switch (activeTab) {
      case 'subito':
        return allListings.subito;
      case 'ebay':
        return allListings.ebay;
      case 'vinted':
        return allListings.vinted;
      case 'ai_prompt':
        return allListings.aiPrompt;
      default:
        return allListings.subito;
    }
  }, [allListings, activeTab]);

  // Se l'utente ha modificato a mano il testo per la piattaforma corrente, mostriamo la sua modifica
  const displayedDescription =
    editedDescriptions[activeTab] !== undefined
      ? (editedDescriptions[activeTab] as string)
      : activeListing.description;

  const isCurrentDescriptionEdited =
    editedDescriptions[activeTab] !== undefined &&
    editedDescriptions[activeTab] !== activeListing.description;

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDescriptions((prev) => ({
      ...prev,
      [activeTab]: e.target.value,
    }));
  };

  const handleResetToGenerated = () => {
    setEditedDescriptions((prev) => {
      const copy = { ...prev };
      delete copy[activeTab];
      return copy;
    });
  };

  const copyToClipboard = async (text: string, type: 'title' | 'description' | 'all') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedFeedback(type);
      setTimeout(() => {
        setCopiedFeedback(null);
      }, 2500);
    } catch (err) {
      console.error('Errore durante la copia negli appunti:', err);
    }
  };

  const handleCopyAll = () => {
    const combined = `${activeListing.title}\n\n${displayedDescription}`;
    copyToClipboard(combined, 'all');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏷️ Generatore Annuncio di Vendita"
      subtitle={`${component.name} • ${COMPONENT_CATEGORY_LABELS[component.category]}`}
      maxWidth="900px"
    >
      <div className="listing-modal-container">
        {/* COLONNA SINISTRA: OPZIONI CONFIGURABILI */}
        <div className="listing-options-panel">
          <div className="listing-options-title">
            <Sliders size={14} color="var(--accent-primary)" />
            <span>Parametri Annuncio</span>
          </div>

          {/* Condizione Oggetto */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>
              Condizione Estetica / Funzionale
            </label>
            <select
              className="form-select"
              style={{ fontSize: '12.5px', padding: '6px 10px' }}
              value={condition}
              onChange={(e) => setCondition(e.target.value as ListingCondition)}
            >
              {(Object.keys(LISTING_CONDITION_LABELS) as ListingCondition[]).map((k) => (
                <option key={k} value={k}>
                  {LISTING_CONDITION_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox Opzioni Dotazione e Cura */}
          <div className="listing-checkbox-group">
            <label className="listing-checkbox-label">
              <input
                type="checkbox"
                checked={hasOriginalBox}
                onChange={(e) => setHasOriginalBox(e.target.checked)}
              />
              <span>📦 Scatola originale inclusa</span>
            </label>

            <label className="listing-checkbox-label">
              <input
                type="checkbox"
                checked={hasAccessories}
                onChange={(e) => setHasAccessories(e.target.checked)}
              />
              <span>🔌 Accessori e cavi completi</span>
            </label>

            <label className="listing-checkbox-label">
              <input
                type="checkbox"
                checked={smokeFreeNoMining}
                onChange={(e) => setSmokeFreeNoMining(e.target.checked)}
              />
              <span>🚭 Non fumatori, no mining</span>
            </label>
          </div>

          {/* Modalità Consegna / Spedizione */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>
              Modalità di Consegna
            </label>
            <select
              className="form-select"
              style={{ fontSize: '12.5px', padding: '6px 10px' }}
              value={shippingOption}
              onChange={(e) => setShippingOption(e.target.value as ShippingOption)}
            >
              {(Object.keys(SHIPPING_OPTION_LABELS) as ShippingOption[]).map((k) => (
                <option key={k} value={k}>
                  {SHIPPING_OPTION_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Città Ritiro a Mano (opzionale) */}
          {(shippingOption === 'both' || shippingOption === 'hand_only') && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>
                Città / Zona per Ritiro a Mano
              </label>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '12.5px', padding: '6px 10px' }}
                placeholder="Es. Roma Centro, Milano, Bologna..."
                value={handDeliveryCity}
                onChange={(e) => setHandDeliveryCity(e.target.value)}
              />
            </div>
          )}

          {/* Prezzo Richiesto (opzionale) */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>
              Prezzo Richiesto (€, opzionale)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="form-input font-mono"
              style={{ fontSize: '12.5px', padding: '6px 10px' }}
              placeholder="Es. 450"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
            />
          </div>

          {/* Note Personali Aggiuntive */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>
              Note Aggiuntive Personali
            </label>
            <textarea
              className="form-textarea"
              style={{ fontSize: '12px', padding: '6px 10px', minHeight: '60px' }}
              placeholder="Note extra, motivo vendita o dettagli aggiuntivi..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </div>
        </div>

        {/* COLONNA DESTRA: TABS & ANTEPRIMA TESTO MARKETPLACE */}
        <div className="listing-preview-panel">
          {/* Barra Tab */}
          <div className="listing-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'subito'}
              className={`listing-tab-btn ${activeTab === 'subito' ? 'active' : ''}`}
              onClick={() => setActiveTab('subito')}
            >
              <Tag size={14} />
              <span>Subito.it</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ebay'}
              className={`listing-tab-btn ${activeTab === 'ebay' ? 'active' : ''}`}
              onClick={() => setActiveTab('ebay')}
            >
              <Store size={14} />
              <span>eBay</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vinted'}
              className={`listing-tab-btn ${activeTab === 'vinted' ? 'active' : ''}`}
              onClick={() => setActiveTab('vinted')}
            >
              <Sparkles size={14} />
              <span>Vinted</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ai_prompt'}
              className={`listing-tab-btn ${activeTab === 'ai_prompt' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai_prompt')}
              title="Super-Prompt pronto per ChatGPT, Claude o Gemini"
            >
              <Bot size={14} />
              <span>Prompt IA</span>
            </button>
          </div>

          {/* Box Titolo Annuncio */}
          <div className="listing-title-box">
            <div className="listing-title-header">
              <span style={{ fontWeight: 600 }}>
                {activeTab === 'ai_prompt' ? 'Oggetto / Scopo Prompt' : 'Titolo Ottimizzato Annuncio'}
              </span>
              <span className="listing-char-badge">
                {activeListing.title.length} {activeTab === 'ebay' ? '/ 80' : '/ 100'} char
              </span>
            </div>

            <div className="listing-title-input-row">
              <input
                type="text"
                readOnly
                className="form-input"
                style={{ fontSize: '13px', fontWeight: 600, padding: '7px 10px' }}
                value={activeListing.title}
              />
              <button
                type="button"
                className={`btn btn-secondary micro-press ${copiedFeedback === 'title' ? 'listing-copy-btn-success' : ''}`}
                style={{ fontSize: '12px', padding: '7px 12px', flexShrink: 0 }}
                onClick={() => copyToClipboard(activeListing.title, 'title')}
                title="Copia solo il titolo"
              >
                {copiedFeedback === 'title' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedFeedback === 'title' ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>
          </div>

          {/* Box Descrizione Corpo Annuncio */}
          <div className="listing-textarea-box">
            <div className="listing-title-header">
              <span style={{ fontWeight: 600 }}>
                {activeTab === 'ai_prompt'
                  ? 'Testo Prompt Completo (da incollare in ChatGPT/Claude/Gemini)'
                  : 'Testo Completo Annuncio'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCurrentDescriptionEdited && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '2px 6px', height: '22px', color: 'var(--accent-amber)' }}
                    onClick={handleResetToGenerated}
                    title="Annulla le modifiche manuali e ripristina il testo generato automaticamente"
                  >
                    <RotateCcw size={11} />
                    <span>Ripristina</span>
                  </button>
                )}
                <span className="listing-char-badge">
                  {displayedDescription.length} caratteri
                </span>
              </div>
            </div>

            <textarea
              className="listing-textarea"
              value={displayedDescription}
              onChange={handleDescriptionChange}
              placeholder="Testo generato..."
            />
          </div>

          {/* Barra Pulsanti di Azione Copia */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              paddingTop: '6px',
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12.5px', padding: '6px 12px' }}
              onClick={onClose}
            >
              Chiudi
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-secondary micro-press ${copiedFeedback === 'description' ? 'listing-copy-btn-success' : ''}`}
                style={{ fontSize: '12.5px', padding: '6px 14px' }}
                onClick={() => copyToClipboard(displayedDescription, 'description')}
              >
                {copiedFeedback === 'description' ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {copiedFeedback === 'description'
                    ? 'Descrizione Copiata!'
                    : activeTab === 'ai_prompt'
                    ? 'Copia Prompt'
                    : 'Copia Descrizione'}
                </span>
              </button>

              {activeTab !== 'ai_prompt' && (
                <button
                  type="button"
                  className={`btn btn-primary micro-press ${copiedFeedback === 'all' ? 'listing-copy-btn-success' : ''}`}
                  style={{ fontSize: '12.5px', padding: '6px 16px' }}
                  onClick={handleCopyAll}
                >
                  {copiedFeedback === 'all' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedFeedback === 'all' ? 'Copiato negli appunti!' : 'Copia Titolo + Testo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
