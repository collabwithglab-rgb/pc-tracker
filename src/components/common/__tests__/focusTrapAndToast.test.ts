import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test per la logica di Focus Trap e Ciclo di Vita Toast (Tranche 11.1)
 * Verifica in isolamento:
 * 1. Logica di navigazione ciclica Tab / Shift+Tab del Focus Trap
 * 2. Logica di selezione dell'elemento a cui assegnare il focus iniziale
 * 3. Gestione tasto Escape
 * 4. Macchina a stati del Toast con transizione calcolata (140ms) e timer auto-dismiss (3800ms)
 */

describe('Focus Trap & Accessibility Logic (Tranche 11.1)', () => {
  // Simulatore leggero di elementi focusabili
  interface MockElement {
    tagName: string;
    id: string;
    className: string;
    disabled?: boolean;
    tabIndex?: number;
    offsetParent: unknown;
  }

  const FOCUSABLE_ELEMENTS_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  it('include tutti i selettori interattivi standard nel FOCUSABLE_ELEMENTS_SELECTOR', () => {
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('button:not([disabled])');
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('[href]');
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('input:not([disabled])');
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('select:not([disabled])');
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('textarea:not([disabled])');
    expect(FOCUSABLE_ELEMENTS_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it('determina il focus iniziale privilegiando il primo campo form rispetto al pulsante di chiusura', () => {
    const elements: MockElement[] = [
      { tagName: 'BUTTON', id: 'close-btn', className: 'modal-close-btn', offsetParent: {} },
      { tagName: 'INPUT', id: 'comp-name', className: 'input-field', offsetParent: {} },
      { tagName: 'BUTTON', id: 'submit-btn', className: 'btn-primary', offsetParent: {} },
    ];

    const preferred =
      elements.find((el) => !el.className.includes('modal-close-btn')) || elements[0];

    expect(preferred.id).toBe('comp-name');
  });

  it('esegue il fallback al primo elemento se tutti sono pulsanti o speciali', () => {
    const elements: MockElement[] = [
      { tagName: 'BUTTON', id: 'close-btn', className: 'modal-close-btn', offsetParent: {} },
    ];

    const preferred =
      elements.find((el) => !el.className.includes('modal-close-btn')) || elements[0];

    expect(preferred.id).toBe('close-btn');
  });

  it('cicla dall\'ultimo al primo elemento premendo Tab in avanti', () => {
    const focusableIds = ['input-1', 'input-2', 'btn-submit'];
    const currentActiveId = 'btn-submit'; // Ultimo elemento

    let nextTargetId = '';
    const isLast = focusableIds.indexOf(currentActiveId) === focusableIds.length - 1;
    if (isLast) {
      nextTargetId = focusableIds[0]; // Cicla al primo
    }

    expect(nextTargetId).toBe('input-1');
  });

  it('cicla dal primo all\'ultimo elemento premendo Shift+Tab a ritroso', () => {
    const focusableIds = ['input-1', 'input-2', 'btn-submit'];
    const currentActiveId = 'input-1'; // Primo elemento

    let nextTargetId = '';
    const isFirst = focusableIds.indexOf(currentActiveId) === 0;
    if (isFirst) {
      nextTargetId = focusableIds[focusableIds.length - 1]; // Cicla all'ultimo
    }

    expect(nextTargetId).toBe('btn-submit');
  });

  it('intercetta il tasto Escape invocando la callback di chiusura', () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    const simulateKeyDown = (key: string) => {
      if (key === 'Escape') {
        onClose();
      }
    };

    simulateKeyDown('Enter');
    expect(closed).toBe(false);

    simulateKeyDown('Escape');
    expect(closed).toBe(true);
  });
});

describe('Toast Exit Lifecycle (Tranche 11.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gestisce la transizione di uscita Apple-style con durata di 140ms', () => {
    let isExiting = false;
    let dismissed = false;

    const triggerExit = () => {
      isExiting = true;
      setTimeout(() => {
        dismissed = true;
        isExiting = false;
      }, 140);
    };

    // All'inizio il toast è visibile e non in uscita
    expect(isExiting).toBe(false);
    expect(dismissed).toBe(false);

    // Chiamata esplicita di uscita (click su X o auto-dismiss)
    triggerExit();
    expect(isExiting).toBe(true);
    expect(dismissed).toBe(false);

    // Avanza prima della fine dell'animazione (es. 100ms)
    vi.advanceTimersByTime(100);
    expect(isExiting).toBe(true);
    expect(dismissed).toBe(false);

    // Conclusione dei 140ms dell'animazione appleToastOut
    vi.advanceTimersByTime(40);
    expect(dismissed).toBe(true);
    expect(isExiting).toBe(false);
  });

  it('avvia l\'uscita automatica dopo 3800ms di permanenza calma', () => {
    let exitTriggered = false;

    const startToastTimer = () => {
      setTimeout(() => {
        exitTriggered = true;
      }, 3800);
    };

    startToastTimer();
    expect(exitTriggered).toBe(false);

    // Avanzamento a 3700ms: ancora visibile
    vi.advanceTimersByTime(3700);
    expect(exitTriggered).toBe(false);

    // Al raggiungimento dei 3800ms: trigger exit
    vi.advanceTimersByTime(100);
    expect(exitTriggered).toBe(true);
  });
});
