import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  resolveComponentIcon,
  CATEGORY_THEMES,
  ComponentIcon,
  HardwareIconBadge,
} from '../ComponentIcon';
import {
  Cpu,
  Gpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Zap,
  Fan,
  Snowflake,
  Box,
  Monitor,
  Mouse,
  Keyboard,
  Headphones,
  Webcam,
  Gamepad2,
  AudioLines,
  Cable,
  Usb,
  Sliders,
  Tv,
} from 'lucide-react';
import { ComponentCategory } from '../../../types';

describe('ComponentIcon & Smart Icon Resolution', () => {
  it('risolve le icone per i componenti hardware primari', () => {
    expect(resolveComponentIcon('cpu', 'Intel Core i5-14500')).toBe(Cpu);
    expect(resolveComponentIcon('gpu', 'MSI GeForce RTX 4070')).toBe(Gpu);
    expect(resolveComponentIcon('motherboard', 'MSI PRO Z790-S WIFI')).toBe(CircuitBoard);
    expect(resolveComponentIcon('ram', 'Corsair Vengeance RGB DDR5')).toBe(MemoryStick);
    expect(resolveComponentIcon('storage', 'Crucial P3 Plus 1TB NVMe')).toBe(HardDrive);
    expect(resolveComponentIcon('psu', 'NZXT C750 Gold Core')).toBe(Zap);
    expect(resolveComponentIcon('case', 'NZXT H5 Flow Black')).toBe(Box);
    expect(resolveComponentIcon('monitor', 'LG UltraGear 27GR75Q')).toBe(Monitor);
  });

  it('risolve intelligentemente ventole attive vs dissipatori passivi/pad termici per il raffreddamento', () => {
    expect(resolveComponentIcon('cooling', 'Thermalright Peerless Assassin 120 SE')).toBe(Fan);
    expect(resolveComponentIcon('cooling', 'ARCTIC M2 Pro Nero Heatsink')).toBe(Snowflake);
    expect(resolveComponentIcon('cooling', 'Dissipatore M.2 in alluminio')).toBe(Snowflake);
  });

  it('risolve con precisione le periferiche in base al tipo reale', () => {
    expect(resolveComponentIcon('peripherals', 'AJAZZ AJ179 APEX White')).toBe(Mouse);
    expect(resolveComponentIcon('peripherals', 'beyerdynamic DT 270 PRO')).toBe(Headphones);
    expect(resolveComponentIcon('peripherals', 'EPOMAKER x AULA F75 Mechanical Keyboard')).toBe(Keyboard);
    expect(resolveComponentIcon('peripherals', 'Sony DualShock 4 V2')).toBe(Gamepad2);
    expect(resolveComponentIcon('peripherals', 'EMEET C960 HD Webcam')).toBe(Webcam);
    expect(resolveComponentIcon('peripherals', 'Steinberg UR12 Audio Interface')).toBe(AudioLines);
  });

  it('risolve con precisione cavi, adattatori e accessori', () => {
    expect(resolveComponentIcon('accessories', 'CERRXIAN 5V 3-pin SATA cable')).toBe(Cable);
    expect(resolveComponentIcon('accessories', 'Adattatore 90° USB 3.0 19-pin')).toBe(Usb);
    expect(resolveComponentIcon('accessories', 'NZXT RGB & Fan Controller')).toBe(Sliders);
    expect(resolveComponentIcon('accessories', 'Grifema GB2003-1 Supporto Monitor')).toBe(Tv);
  });

  it('contiene temi e token cromatici validi per tutte le 12 categorie', () => {
    const categories: ComponentCategory[] = [
      'cpu',
      'gpu',
      'motherboard',
      'ram',
      'storage',
      'psu',
      'case',
      'cooling',
      'monitor',
      'peripherals',
      'accessories',
      'other',
    ];

    categories.forEach((cat) => {
      const theme = CATEGORY_THEMES[cat];
      expect(theme).toBeDefined();
      expect(theme.colorVar).toContain(`--cat-${cat}`);
      expect(theme.rgbVar).toContain(`--cat-${cat}-rgb`);
      expect(theme.accentHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('genera elementi React validi per ComponentIcon e HardwareIconBadge', () => {
    const iconElement = ComponentIcon({ category: 'gpu', name: 'RTX 4070', size: 20 });
    expect(React.isValidElement(iconElement)).toBe(true);

    const badgeElement = HardwareIconBadge({ category: 'ram', name: 'Corsair Vengeance', size: 18, boxSize: 36 });
    expect(React.isValidElement(badgeElement)).toBe(true);
    if (React.isValidElement(badgeElement)) {
      expect((badgeElement.props as Record<string, unknown>)['data-category']).toBe('ram');
    }
  });
});
