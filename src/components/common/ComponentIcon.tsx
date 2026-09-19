import React from 'react';
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
  Mic,
  Speaker,
  Cable,
  Usb,
  Sliders,
  Tv,
  Package,
  LucideIcon,
} from 'lucide-react';
import { ComponentCategory } from '../../types';

export interface CategoryTheme {
  colorVar: string;
  rgbVar: string;
  accentHex: string;
}

export const CATEGORY_THEMES: Record<ComponentCategory, CategoryTheme> = {
  cpu: {
    colorVar: 'var(--cat-cpu)',
    rgbVar: 'var(--cat-cpu-rgb)',
    accentHex: '#38bdf8',
  },
  gpu: {
    colorVar: 'var(--cat-gpu)',
    rgbVar: 'var(--cat-gpu-rgb)',
    accentHex: '#10b981',
  },
  motherboard: {
    colorVar: 'var(--cat-motherboard)',
    rgbVar: 'var(--cat-motherboard-rgb)',
    accentHex: '#818cf8',
  },
  ram: {
    colorVar: 'var(--cat-ram)',
    rgbVar: 'var(--cat-ram-rgb)',
    accentHex: '#c084fc',
  },
  storage: {
    colorVar: 'var(--cat-storage)',
    rgbVar: 'var(--cat-storage-rgb)',
    accentHex: '#06b6d4',
  },
  psu: {
    colorVar: 'var(--cat-psu)',
    rgbVar: 'var(--cat-psu-rgb)',
    accentHex: '#f59e0b',
  },
  cooling: {
    colorVar: 'var(--cat-cooling)',
    rgbVar: 'var(--cat-cooling-rgb)',
    accentHex: '#22d3ee',
  },
  case: {
    colorVar: 'var(--cat-case)',
    rgbVar: 'var(--cat-case-rgb)',
    accentHex: '#94a3b8',
  },
  monitor: {
    colorVar: 'var(--cat-monitor)',
    rgbVar: 'var(--cat-monitor-rgb)',
    accentHex: '#60a5fa',
  },
  peripherals: {
    colorVar: 'var(--cat-peripherals)',
    rgbVar: 'var(--cat-peripherals-rgb)',
    accentHex: '#fb7185',
  },
  accessories: {
    colorVar: 'var(--cat-accessories)',
    rgbVar: 'var(--cat-accessories-rgb)',
    accentHex: '#fb923c',
  },
  other: {
    colorVar: 'var(--cat-other)',
    rgbVar: 'var(--cat-other-rgb)',
    accentHex: '#94a3b8',
  },
};

/**
 * Risolve dinamicamente l'icona Lucide più specifica in base alla categoria
 * e, se fornito, al nome/modello del componente.
 */
export function resolveComponentIcon(category: ComponentCategory, name?: string): LucideIcon {
  const normName = (name || '').toLowerCase();

  switch (category) {
    case 'cpu':
      return Cpu;

    case 'gpu':
      return Gpu;

    case 'motherboard':
      return CircuitBoard;

    case 'ram':
      return MemoryStick;

    case 'storage':
      return HardDrive;

    case 'psu':
      return Zap;

    case 'cooling': {
      // Dissipatori passivi, M.2 shield o pad termici usano Snowflake
      if (
        normName.includes('m2 pro') ||
        normName.includes('heatsink') ||
        normName.includes('dissipatore m.2') ||
        normName.includes('pad') ||
        normName.includes('thermal pad') ||
        normName.includes('passive')
      ) {
        return Snowflake;
      }
      return Fan;
    }

    case 'case':
      return Box;

    case 'monitor':
      return Monitor;

    case 'peripherals': {
      // Mouse
      if (
        normName.includes('mouse') ||
        normName.includes('aj179') ||
        normName.includes('apex') ||
        normName.includes('deathadder') ||
        normName.includes('viper') ||
        normName.includes('g pro') ||
        normName.includes('g502') ||
        normName.includes('trackball')
      ) {
        return Mouse;
      }
      // Cuffie / Headset
      if (
        normName.includes('dt 270') ||
        normName.includes('dt 770') ||
        normName.includes('dt 990') ||
        normName.includes('cuffi') ||
        normName.includes('headphone') ||
        normName.includes('headset') ||
        normName.includes('beyerdynamic') ||
        normName.includes('sennheiser') ||
        normName.includes('airpods') ||
        normName.includes('arctis') ||
        normName.includes('cloud')
      ) {
        return Headphones;
      }
      // Webcam / Cam
      if (
        normName.includes('webcam') ||
        normName.includes('camera') ||
        normName.includes('c960') ||
        normName.includes('c920') ||
        normName.includes('c922') ||
        normName.includes('brio') ||
        normName.includes('emeet') ||
        normName.includes('elgato facecam')
      ) {
        return Webcam;
      }
      // Tastiere
      if (
        normName.includes('keyboard') ||
        normName.includes('tastiera') ||
        normName.includes('epomaker') ||
        normName.includes('aula') ||
        normName.includes('f75') ||
        normName.includes('keychron') ||
        normName.includes('ducky') ||
        normName.includes('wooting') ||
        normName.includes('blackwidow')
      ) {
        return Keyboard;
      }
      // Gamepad / Controller
      if (
        normName.includes('dualshock') ||
        normName.includes('dualsense') ||
        normName.includes('controller') ||
        normName.includes('gamepad') ||
        normName.includes('joystick') ||
        normName.includes('xbox') ||
        normName.includes('8bitdo')
      ) {
        return Gamepad2;
      }
      // Interfacce Audio / DAC / Microfoni / Casse
      if (
        normName.includes('steinberg') ||
        normName.includes('ur12') ||
        normName.includes('ur22') ||
        normName.includes('scarlett') ||
        normName.includes('focusrite') ||
        normName.includes('audio interface') ||
        normName.includes('scheda audio') ||
        normName.includes('dac')
      ) {
        return AudioLines;
      }
      if (
        normName.includes('mic') ||
        normName.includes('microfono') ||
        normName.includes('shure') ||
        normName.includes('rode') ||
        normName.includes('yeti') ||
        normName.includes('quadcast')
      ) {
        return Mic;
      }
      if (
        normName.includes('speaker') ||
        normName.includes('cassa') ||
        normName.includes('casse') ||
        normName.includes('soundbar') ||
        normName.includes('edifier')
      ) {
        return Speaker;
      }
      return Keyboard;
    }

    case 'accessories': {
      // Fan controller o RGB hub
      if (
        normName.includes('rgb') ||
        normName.includes('controller') ||
        normName.includes('commander') ||
        normName.includes('hub')
      ) {
        return Sliders;
      }
      // Adattatori / USB / Connettori
      if (
        normName.includes('adattatore') ||
        normName.includes('adapter') ||
        normName.includes('usb') ||
        normName.includes('90°') ||
        normName.includes('type-c') ||
        normName.includes('dongle')
      ) {
        return Usb;
      }
      // Cavi / Prolunghe / SATA
      if (
        normName.includes('sata') ||
        normName.includes('cavo') ||
        normName.includes('cable') ||
        normName.includes('cerrxian') ||
        normName.includes('sleeved') ||
        normName.includes('prolunga') ||
        normName.includes('wire') ||
        normName.includes('3-pin') ||
        normName.includes('4-pin')
      ) {
        return Cable;
      }
      // Bracci per monitor / Supporti
      if (
        normName.includes('braccio') ||
        normName.includes('supporto') ||
        normName.includes('stand') ||
        normName.includes('mount') ||
        normName.includes('arm') ||
        normName.includes('grifema')
      ) {
        return Tv;
      }
      return Cable;
    }

    case 'other':
    default:
      return Package;
  }
}

export interface ComponentIconProps {
  category: ComponentCategory;
  name?: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renderizza l'icona hardware pura per il componente/categoria specificato.
 */
export const ComponentIcon: React.FC<ComponentIconProps> = ({
  category,
  name,
  size = 16,
  color,
  className = '',
  style,
}) => {
  const IconComponent = resolveComponentIcon(category, name);
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.other;
  const iconColor = color || theme.colorVar;

  return (
    <IconComponent
      size={size}
      color={iconColor}
      className={`component-icon component-icon-${category} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export interface HardwareIconBadgeProps {
  category: ComponentCategory;
  name?: string;
  size?: number;
  boxSize?: number | string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
}

/**
 * Renderizza il badge icona hardware rifinito con gradiente, bordo sagomato,
 * bagliore diffuso ed elevata identità visiva di categoria.
 */
export const HardwareIconBadge: React.FC<HardwareIconBadgeProps> = ({
  category,
  name,
  size = 17,
  boxSize,
  className = '',
  style,
}) => {
  const IconComponent = resolveComponentIcon(category, name);
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.other;

  const boxStyle: React.CSSProperties = {
    ...(boxSize ? { width: boxSize, height: boxSize } : {}),
    ...style,
  };

  return (
    <div
      className={`hardware-icon-box ${className}`}
      data-category={category}
      style={boxStyle}
    >
      <IconComponent size={size} color={theme.colorVar} aria-hidden="true" />
    </div>
  );
};
