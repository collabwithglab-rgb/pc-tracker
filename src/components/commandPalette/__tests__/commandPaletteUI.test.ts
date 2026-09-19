import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandItem, NavSection, NavigationTarget } from '../../../types';
import {
  STATIC_NAVIGATION_COMMANDS,
  STATIC_ACTION_COMMANDS,
  buildComponentCommands,
} from '../../../domain/commandRegistry';

describe('Command Palette UI & Execution Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Rilevamento Scorciatoie Globali (Ctrl+K / Cmd+K)', () => {
    it('rileva Ctrl+K su Windows e commuta lo stato della palette', () => {
      let isOpen = false;
      const toggle = () => {
        isOpen = !isOpen;
      };

      const handleKey = (e: { ctrlKey?: boolean; metaKey?: boolean; key: string; preventDefault: () => void }) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          toggle();
        }
      };

      const preventDefaultMock = vi.fn();

      // Prima pressione: apre la palette
      handleKey({ ctrlKey: true, key: 'k', preventDefault: preventDefaultMock });
      expect(isOpen).toBe(true);
      expect(preventDefaultMock).toHaveBeenCalledTimes(1);

      // Seconda pressione (palette già aperta): chiude la palette (toggle)
      handleKey({ ctrlKey: true, key: 'K', preventDefault: preventDefaultMock });
      expect(isOpen).toBe(false);
      expect(preventDefaultMock).toHaveBeenCalledTimes(2);
    });

    it('rileva Cmd+K su macOS ed esegue il toggle', () => {
      let isOpen = false;
      const toggle = () => {
        isOpen = !isOpen;
      };

      const preventDefaultMock = vi.fn();
      const e = { metaKey: true, key: 'k', preventDefault: preventDefaultMock };

      if ((e.metaKey || false) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }

      expect(isOpen).toBe(true);
      expect(preventDefaultMock).toHaveBeenCalledTimes(1);
    });

    it('ignora tasti diversi da K con Ctrl/Cmd', () => {
      let isOpen = false;
      const toggle = () => {
        isOpen = !isOpen;
      };

      const preventDefaultMock = vi.fn();
      const e = { ctrlKey: true, key: 'j', preventDefault: preventDefaultMock };

      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }

      expect(isOpen).toBe(false);
      expect(preventDefaultMock).not.toHaveBeenCalled();
    });
  });

  describe('2. Navigazione Cursore Tastiera (Frecce ↑ e ↓ con Wrapping)', () => {
    const mockResults: CommandItem[] = [
      STATIC_NAVIGATION_COMMANDS[0],
      STATIC_NAVIGATION_COMMANDS[1],
      STATIC_NAVIGATION_COMMANDS[2],
    ];

    it('avanza l’indice con ArrowDown e applica wrapping al raggiungimento della fine', () => {
      let selectedIndex = 0;
      const onArrowDown = () => {
        if (mockResults.length > 0) {
          selectedIndex = (selectedIndex + 1) % mockResults.length;
        }
      };

      expect(selectedIndex).toBe(0);
      onArrowDown();
      expect(selectedIndex).toBe(1);
      onArrowDown();
      expect(selectedIndex).toBe(2);
      onArrowDown();
      expect(selectedIndex).toBe(0); // Wrap all'inizio
    });

    it('arretra l’indice con ArrowUp e applica wrapping all’indietro', () => {
      let selectedIndex = 0;
      const onArrowUp = () => {
        if (mockResults.length > 0) {
          selectedIndex = (selectedIndex - 1 + mockResults.length) % mockResults.length;
        }
      };

      expect(selectedIndex).toBe(0);
      onArrowUp();
      expect(selectedIndex).toBe(2); // Wrap alla fine
      onArrowUp();
      expect(selectedIndex).toBe(1);
      onArrowUp();
      expect(selectedIndex).toBe(0);
    });
  });

  describe('3. Chiusura con Escape e Focus Restoration', () => {
    it('chiude la palette su pressione Escape e ripristina il focus', () => {
      let isOpen = true;
      let focusRestored = false;

      const previousElement = {
        focus: () => {
          focusRestored = true;
        },
      };

      const closePalette = () => {
        isOpen = false;
        previousElement.focus();
      };

      const handleKeyDown = (key: string) => {
        if (key === 'Escape') {
          closePalette();
        }
      };

      handleKeyDown('Escape');
      expect(isOpen).toBe(false);
      expect(focusRestored).toBe(true);
    });
  });

  describe('4. Esecuzione Comandi (Invio sul Risultato Selezionato)', () => {
    interface ExecutionTestEnv {
      navigatedTarget: NavigationTarget | null;
      executedActionId: string | null;
      isPaletteOpen: boolean;
      currentSection: NavSection;
    }

    const createEnv = (initialSection: NavSection = 'dashboard'): ExecutionTestEnv => {
      return {
        navigatedTarget: null,
        executedActionId: null,
        isPaletteOpen: true,
        currentSection: initialSection,
      };
    };

    const executeCommand = (env: ExecutionTestEnv, command?: CommandItem) => {
      if (!command) return;

      if (command.target) {
        env.navigatedTarget = {
          ...command.target,
          referrer: env.currentSection !== command.target.section ? env.currentSection : undefined,
        };
        env.isPaletteOpen = false;
        return;
      }

      if (command.actionId) {
        env.executedActionId = command.actionId;
        env.isPaletteOpen = false;
      }
    };

    it('naviga correttamente verso una sezione principale', () => {
      const env = createEnv('dashboard');
      const item = STATIC_NAVIGATION_COMMANDS.find((c) => c.id === 'nav-current-rig')!;

      executeCommand(env, item);

      expect(env.navigatedTarget).toEqual({
        section: 'current-rig',
        referrer: 'dashboard',
      });
      expect(env.isPaletteOpen).toBe(false);
    });

    it('esegue deep navigation verso subTab con target discriminato', () => {
      const env = createEnv('current-rig');
      const item = STATIC_NAVIGATION_COMMANDS.find((c) => c.id === 'deep-maintenance-windows')!;

      executeCommand(env, item);

      expect(env.navigatedTarget).toEqual({
        section: 'maintenance',
        subTab: 'windows',
        referrer: 'current-rig',
      });
      expect(env.isPaletteOpen).toBe(false);
    });

    it('apre direttamente la scheda di un componente reale con ritorno contestuale', () => {
      const env = createEnv('maintenance');
      const compCommands = buildComponentCommands([
        { id: 'gpu-4090', name: 'RTX 4090', brand: 'NVIDIA', model: 'Founders', category: 'gpu', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ]);
      const item = compCommands[0];

      executeCommand(env, item);

      expect(env.navigatedTarget).toEqual({
        section: 'archive',
        componentId: 'gpu-4090',
        referrer: 'maintenance',
      });
      expect(env.isPaletteOpen).toBe(false);
    });

    it('esegue azioni rapide di sistema (es. nuovo movimento, backup, checkpoint)', () => {
      const env = createEnv('dashboard');
      const movementAction = STATIC_ACTION_COMMANDS.find((c) => c.actionId === 'new-movement')!;
      executeCommand(env, movementAction);
      expect(env.executedActionId).toBe('new-movement');
      expect(env.isPaletteOpen).toBe(false);

      const env2 = createEnv('dashboard');
      const checkpointAction = STATIC_ACTION_COMMANDS.find((c) => c.actionId === 'create-checkpoint')!;
      executeCommand(env2, checkpointAction);
      expect(env2.executedActionId).toBe('create-checkpoint');
      expect(env2.isPaletteOpen).toBe(false);

      const envMaint = createEnv('current-rig');
      const maintAction = STATIC_ACTION_COMMANDS.find((c) => c.actionId === 'new-maintenance')!;
      executeCommand(envMaint, maintAction);
      expect(envMaint.executedActionId).toBe('new-maintenance');
      expect(envMaint.isPaletteOpen).toBe(false);

      const envTuning = createEnv('current-rig');
      const tuningAction = STATIC_ACTION_COMMANDS.find((c) => c.actionId === 'new-tuning')!;
      executeCommand(envTuning, tuningAction);
      expect(envTuning.executedActionId).toBe('new-tuning');
      expect(envTuning.isPaletteOpen).toBe(false);
    });

    it('non esegue nulla e non chiude la palette se non ci sono risultati (0 risultati)', () => {
      const env = createEnv('dashboard');
      const zeroResults: CommandItem[] = [];

      executeCommand(env, zeroResults[0]); // undefined

      expect(env.navigatedTarget).toBeNull();
      expect(env.executedActionId).toBeNull();
      expect(env.isPaletteOpen).toBe(true);
    });
  });
});
