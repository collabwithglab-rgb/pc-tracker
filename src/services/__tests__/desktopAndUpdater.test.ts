import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDesktopApp,
  saveBackupFileWithDialog,
  pickAndReadBackupFileWithDialog,
  checkForAppUpdates,
  downloadAndInstallUpdate,
  APP_VERSION,
} from '../index';

describe('Desktop & Updater Services in Non-Tauri (Web/Node) Environment', () => {
  const targetScope = (typeof window !== 'undefined' ? window : globalThis) as Record<string, unknown>;
  const originalTauriInternals = targetScope.__TAURI_INTERNALS__;
  const originalTauri = targetScope.__TAURI__;

  beforeEach(() => {
    delete targetScope.__TAURI_INTERNALS__;
    delete targetScope.__TAURI__;
  });

  afterEach(() => {
    if (originalTauriInternals !== undefined) {
      targetScope.__TAURI_INTERNALS__ = originalTauriInternals;
    } else {
      delete targetScope.__TAURI_INTERNALS__;
    }
    if (originalTauri !== undefined) {
      targetScope.__TAURI__ = originalTauri;
    } else {
      delete targetScope.__TAURI__;
    }
  });

  it('correctly detects non-desktop environment', () => {
    expect(isDesktopApp()).toBe(false);
  });

  it('correctly detects desktop environment when __TAURI_INTERNALS__ is present', () => {
    targetScope.__TAURI_INTERNALS__ = {};
    if (typeof window === 'undefined') {
      (globalThis as unknown as { window: unknown }).window = globalThis;
    }
    expect(isDesktopApp()).toBe(true);
  });

  it('saveBackupFileWithDialog falls back gracefully in web environment', async () => {
    // Mock URL and document if needed
    if (typeof document === 'undefined') {
      (globalThis as unknown as { document: unknown }).document = {
        createElement: () => ({ href: '', download: '', click: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} },
      };
    }
    if (typeof URL === 'undefined' || !URL.createObjectURL) {
      (globalThis as unknown as { URL: unknown }).URL = {
        createObjectURL: () => 'blob:mock',
        revokeObjectURL: () => {},
      };
    }

    const result = await saveBackupFileWithDialog('backup-test.json', '{"test":true}');
    expect(result.success).toBe(true);
  });

  it('pickAndReadBackupFileWithDialog returns canceled:false in web to allow file input fallback', async () => {
    const result = await pickAndReadBackupFileWithDialog();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(false);
  });

  it('checkForAppUpdates returns available:false in web environment', async () => {
    const info = await checkForAppUpdates();
    expect(info.available).toBe(false);
    expect(info.currentVersion).toBe(APP_VERSION);
  });

  it('downloadAndInstallUpdate returns error if no update is available', async () => {
    const result = await downloadAndInstallUpdate();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
