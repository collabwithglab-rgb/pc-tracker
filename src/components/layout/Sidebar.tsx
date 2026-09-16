import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Archive,
  ArrowUpRight,
  BarChart3,
  Settings,
  Terminal,
  ExternalLink,
  LucideIcon,
  History,
} from 'lucide-react';
import { usePCStore } from '../../store';

export type NavSection =
  | 'dashboard'
  | 'current-rig'
  | 'time-travel'
  | 'archive'
  | 'upgrades'
  | 'stats'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

interface NavItemDef {
  id: NavSection;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItemDef[] = [
  { id: 'dashboard', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'current-rig', label: 'Il Mio PC', icon: Cpu },
  { id: 'time-travel', label: 'Time Travel', icon: History },
  { id: 'archive', label: 'Archivio Pezzi', icon: Archive },
  { id: 'upgrades', label: 'Storico Upgrade', icon: ArrowUpRight },
  { id: 'stats', label: 'Statistiche', icon: BarChart3 },
];

const SECONDARY_NAV: NavItemDef[] = [
  { id: 'settings', label: 'Impostazioni', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSelectSection }) => {
  const { settings } = usePCStore();

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.brandIconWrapper}>
          <Terminal size={18} color="var(--accent-primary)" />
        </div>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            style={styles.brandTitle}
            title={settings.rigName || 'PC TRACKER'}
          >
            {settings.rigName ? settings.rigName.toUpperCase() : 'PC TRACKER'}
          </div>
          <div
            style={styles.brandSubtitle}
            title={settings.rigDescription || (settings.rigName ? 'Setup Personale' : 'Hardware Lifecycle')}
          >
            {settings.rigDescription || (settings.rigName ? 'Setup Personale' : 'Hardware Lifecycle')}
          </div>
        </div>
      </div>

      {/* Navigazione */}
      <nav style={styles.nav}>
        <div style={styles.navSectionLabel}>Principale</div>
        <div style={styles.navGroup}>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={17} style={isActive ? styles.iconActive : styles.iconInactive} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.divider} />

        <div style={styles.navSectionLabel}>Sistema</div>
        <div style={styles.navGroup}>
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={17} style={isActive ? styles.iconActive : styles.iconInactive} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer & Firma Personale Minima */}
      <div style={styles.footer}>
        <div style={styles.dbStatus}>
          <span style={styles.statusDot} />
          <span>IndexedDB Locale</span>
        </div>

        <div style={styles.signature}>
          <span style={styles.signatureLabel}>Made by Peppe</span>
          <a
            href="https://www.instagram.com/peppesthoughtss/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.signatureLink}
            title="Apri profilo Instagram @peppesthoughtss"
          >
            <span>@peppesthoughtss</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '250px',
    backgroundColor: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100vh',
    position: 'sticky',
    top: 0,
    userSelect: 'none',
  },
  brand: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  brandIconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    letterSpacing: '0.04em',
    lineHeight: 1.2,
  },
  brandSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  },
  nav: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
  },
  navSectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    padding: '6px 10px',
    marginBottom: '2px',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-subtle)',
    margin: '14px 10px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13.5px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  navItemActive: {
    backgroundColor: 'var(--bg-surface-elevated)',
    color: 'var(--accent-primary)',
    fontWeight: 600,
  },
  iconActive: {
    color: 'var(--accent-primary)',
    flexShrink: 0,
  },
  iconInactive: {
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  footer: {
    padding: '14px 16px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  dbStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-emerald)',
  },
  signature: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
    fontSize: '11.5px',
  },
  signatureLabel: {
    color: 'var(--text-muted)',
  },
  signatureLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
};
