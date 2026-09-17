import { ComponentCategory } from '../types';
import { isDesktopApp } from './desktopService';

export interface DetectedComponent {
  category: ComponentCategory;
  manufacturer: string;
  model: string;
  capacity?: string;
  serialNumber?: string;
  source: string;
  confidence: 'HIGH' | 'MEDIUM';
  detectedAt: string;
  extraDetails?: Record<string, string>;
}

export const MOCK_DETECTED_HARDWARE: DetectedComponent[] = [
  {
    category: 'cpu',
    manufacturer: 'AMD',
    model: 'AMD Ryzen 7 7800X3D',
    source: 'Emulated Hardware Detection',
    confidence: 'HIGH',
    detectedAt: new Date().toISOString(),
  },
  {
    category: 'motherboard',
    manufacturer: 'ASUS',
    model: 'ROG STRIX B650E-F GAMING WIFI',
    source: 'Emulated Hardware Detection',
    confidence: 'HIGH',
    detectedAt: new Date().toISOString(),
  },
  {
    category: 'gpu',
    manufacturer: 'NVIDIA',
    model: 'NVIDIA GeForce RTX 4070',
    source: 'Emulated Hardware Detection',
    confidence: 'HIGH',
    detectedAt: new Date().toISOString(),
  },
  {
    category: 'ram',
    manufacturer: 'Corsair',
    model: '32 GB DDR5 RAM',
    capacity: '32 GB',
    source: 'Emulated Hardware Detection',
    confidence: 'HIGH',
    detectedAt: new Date().toISOString(),
  },
  {
    category: 'storage',
    manufacturer: 'Samsung',
    model: 'Samsung SSD 990 PRO 2TB',
    capacity: '2 TB',
    source: 'Emulated Hardware Detection',
    confidence: 'HIGH',
    detectedAt: new Date().toISOString(),
  },
];

/**
 * Normalizza le categorie provenienti dall'hardware detector nel tipo standard ComponentCategory.
 */
export function normalizeDetectedCategory(cat: string): ComponentCategory {
  const c = cat.toLowerCase().trim();
  switch (c) {
    case 'cpu':
      return 'cpu';
    case 'gpu':
      return 'gpu';
    case 'ram':
    case 'memory':
      return 'ram';
    case 'storage':
    case 'disk':
    case 'ssd':
    case 'hdd':
      return 'storage';
    case 'motherboard':
    case 'mainboard':
    case 'baseboard':
      return 'motherboard';
    case 'psu':
    case 'power':
      return 'psu';
    case 'case':
      return 'case';
    case 'cooling':
    case 'cooler':
      return 'cooling';
    case 'monitor':
      return 'monitor';
    case 'peripherals':
      return 'peripherals';
    case 'accessories':
      return 'accessories';
    default:
      return 'other';
  }
}

/**
 * Rileva l'hardware del sistema locale:
 * - Se in ambiente Desktop Tauri Windows: invoca la funzione nativa Rust `detect_hardware`.
 * - Se in ambiente Web o Test: restituisce un set realistico simulato per validazione e sviluppo.
 */
export async function detectHardware(): Promise<DetectedComponent[]> {
  if (isDesktopApp()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const rawDetected = await invoke<Array<{
        category: string;
        manufacturer: string;
        model: string;
        capacity?: string;
        serialNumber?: string;
        source: string;
        confidence: 'HIGH' | 'MEDIUM';
        detectedAt: string;
        extraDetails?: Record<string, string>;
      }>>('detect_hardware');

      if (Array.isArray(rawDetected) && rawDetected.length > 0) {
        return rawDetected.map((item) => ({
          ...item,
          category: normalizeDetectedCategory(item.category),
        }));
      }
    } catch (err) {
      console.warn('Errore durante l\'invocazione del rilevamento hardware nativo:', err);
    }
  }

  // Fallback ambiente Web o Dev
  return MOCK_DETECTED_HARDWARE;
}
