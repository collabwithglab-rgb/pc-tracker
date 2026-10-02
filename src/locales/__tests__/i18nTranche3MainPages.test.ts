import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import glossary from '../glossary.json';
import { interpolate, formatCurrency } from '../i18nContext';

describe('i18n Tranche 3 — Schermate Principali (Dashboard & Current Rig) e Glossario Hardware', () => {
  it('1. assicura che tutte le chiavi KPI e Dashboard siano presenti e valorizzate in entrambe le lingue', () => {
    const dashboardKeys = [
      'kpi_total_purchased',
      'kpi_total_purchased_sub',
      'kpi_total_recovered',
      'kpi_total_recovered_sub',
      'kpi_historical_net_cost',
      'kpi_historical_net_cost_sub',
      'kpi_current_rig_cost',
      'kpi_current_rig_cost_sub',
      'kpi_economic_metrics_heading',
      'kpi_explain_metrics_btn',
      'kpi_explain_metrics_tooltip',
      'dashboard_empty_db_title',
      'dashboard_empty_db_desc',
      'dashboard_empty_db_add_btn',
      'dashboard_empty_db_guide_btn',
      'pulse_maintenance_overdue_title',
      'pulse_maintenance_overdue_sub',
      'pulse_maintenance_upcoming_title',
      'pulse_storage_singular',
      'pulse_storage_plural',
      'pulse_storage_sub',
      'pulse_storage_empty_title',
      'pulse_warranty_expiring_singular',
      'pulse_warranty_expiring_plural',
      'pulse_warranty_coverage_title',
      'pulse_lifecycle_snapshot_singular',
      'pulse_lifecycle_snapshot_plural',
      'dashboard_rig_title',
      'dashboard_rig_title_custom',
      'dashboard_rig_installed_count',
      'dashboard_rig_filter_all',
      'dashboard_rig_filter_internals',
      'dashboard_rig_filter_peripherals',
      'dashboard_rig_filter_accessories',
      'dashboard_rig_export_specs',
      'dashboard_rig_open_pc',
      'dashboard_rig_days_in_use',
      'dashboard_movements_title',
      'dashboard_movements_subtitle',
      'dashboard_movements_new_btn',
      'dashboard_movements_view_archive',
      'dashboard_movements_empty',
      'dashboard_movements_add_first',
      'dashboard_movements_most_recent',
      'dashboard_movements_detail_link',
      'dashboard_event_price',
      'dashboard_event_slot',
      'dashboard_event_reason',
      'dashboard_event_net_proceeds',
      'dashboard_event_extra_amount',
      'dashboard_loading_db',
    ];

    for (const key of dashboardKeys) {
      expect(key in itLocale, `Chiave Dashboard mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave Dashboard mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('2. assicura che tutte le chiavi di CurrentRigPage siano presenti e valorizzate in entrambe le lingue', () => {
    const currentRigKeys = [
      'current_rig_count_label',
      'current_rig_no_components',
      'current_rig_build_age_fresh',
      'current_rig_build_age_years',
      'current_rig_build_info_named',
      'current_rig_build_info_unnamed',
      'current_rig_assembled_named',
      'current_rig_assembled_unnamed',
      'current_rig_guide_btn',
      'current_rig_guide_tooltip',
      'current_rig_quick_setup_tooltip',
      'current_rig_save_checkpoint_btn',
      'current_rig_save_checkpoint_tooltip',
      'current_rig_compare_btn',
      'current_rig_compare_tooltip',
      'current_rig_export_btn',
      'current_rig_export_tooltip',
      'current_rig_install_btn',
      'current_rig_group_core_title',
      'current_rig_group_core_desc',
      'current_rig_group_storage_cooling_title',
      'current_rig_group_storage_cooling_desc',
      'current_rig_group_power_chassis_title',
      'current_rig_group_power_chassis_desc',
      'current_rig_group_peripherals_title',
      'current_rig_group_peripherals_desc',
      'current_rig_parts_count_singular',
      'current_rig_parts_count_plural',
      'current_rig_add_part_btn',
      'current_rig_add_part_tooltip',
      'current_rig_empty_group_notice',
      'current_rig_install_now_btn',
      'current_rig_slot_location',
      'current_rig_installed_date_days',
      'current_rig_action_replace',
      'current_rig_action_replace_tooltip',
      'current_rig_action_uninstall',
      'current_rig_action_uninstall_tooltip',
      'current_rig_slot_empty',
      'current_rig_slot_install',
      'current_rig_slot_install_tooltip',
      'current_rig_loading',
    ];

    for (const key of currentRigKeys) {
      expect(key in itLocale, `Chiave CurrentRig mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave CurrentRig mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('3. convalida la rigorosa corrispondenza dei token dinamici interpolati per le schermate Dashboard e CurrentRig', () => {
    const extractTokens = (str: string) => {
      const matches = str.match(/\{(\w+)\}/g) || [];
      return matches.map((m) => m.slice(1, -1)).sort();
    };

    const targetKeys = [
      'pulse_maintenance_overdue_sub',
      'pulse_storage_sub',
      'dashboard_rig_title_custom',
      'dashboard_rig_installed_count',
      'dashboard_rig_days_in_use',
      'dashboard_power_peak',
      'dashboard_event_price',
      'dashboard_event_slot',
      'dashboard_event_reason',
      'dashboard_event_net_proceeds',
      'current_rig_build_info_named',
      'current_rig_build_info_unnamed',
      'current_rig_assembled_named',
      'current_rig_parts_count_singular',
      'current_rig_parts_count_plural',
      'current_rig_add_part_tooltip',
      'current_rig_slot_location',
      'current_rig_installed_date_days',
      'current_rig_slot_install_tooltip',
    ];

    for (const key of targetKeys) {
      const itVal = (itLocale as Record<string, string>)[key];
      const enVal = (enLocale as Record<string, string>)[key];
      expect(extractTokens(enVal)).toEqual(extractTokens(itVal));
    }
  });

  it('4. interpola correttamente i parametri complessi di CurrentRig e Dashboard', () => {
    // Current Rig build info
    const itBuild = interpolate(itLocale.current_rig_build_info_named, {
      name: 'Workstation Pro',
      year: 2024,
      age: '2 anni',
    });
    expect(itBuild).toBe('Workstation Pro — Build originaria del 2024 (2 anni di vita)');

    const enBuild = interpolate(enLocale.current_rig_build_info_named, {
      name: 'Workstation Pro',
      year: 2024,
      age: '2 years',
    });
    expect(enBuild).toBe('Workstation Pro — Original build from 2024 (2 years of life)');

    // Pulse storage sub
    const itStorage = interpolate(itLocale.pulse_storage_sub, { amount: '450' });
    expect(itStorage).toBe('€450 capitale fermo • Vendi o riutilizza');

    const enStorage = interpolate(enLocale.pulse_storage_sub, { amount: '450' });
    expect(enStorage).toBe('€450 tied-up capital • Sell or reuse');
  });

  it('5. verifica la conformità del glossario hardware (glossary.json) con le specifiche blindate', () => {
    // Sigle hardware obbligatorie
    const mandatoryAcronyms = ['CPU', 'GPU', 'RAM', 'SSD', 'NVMe', 'PCIe', 'S.M.A.R.T.', 'TRIM', 'NVML', 'BIOS', 'UEFI', 'XMP', 'EXPO', 'TDP', 'TGP'];
    for (const acr of mandatoryAcronyms) {
      const entry = (glossary.hardware_acronyms as Record<string, { term: string; translatable: boolean }>)[acr];
      expect(entry, `Sigla ${acr} assente nel glossario`).toBeDefined();
      expect(entry.translatable).toBe(false);
      expect(entry.term).toBe(acr);
    }

    // Unità tecniche intoccabili
    const mandatoryUnits = ['W', 'GHz', 'MHz', 'MT/s', 'CL'];
    for (const unit of mandatoryUnits) {
      const entry = (glossary.technical_units as Record<string, { unit: string; translatable: boolean }>)[unit];
      expect(entry, `Unità ${unit} assente nel glossario`).toBeDefined();
      expect(entry.translatable).toBe(false);
    }

    // Termini Windows di sistema
    const mandatoryWinTerms = ['Thermal Throttling', 'Commit Charge', 'Pagefile', 'Idle', 'Working Set', 'Paging File'];
    for (const term of mandatoryWinTerms) {
      const entry = (glossary.windows_system_terms as Record<string, { term: string; translatable: boolean; canonical: string }>)[term];
      expect(entry, `Termine Windows ${term} assente nel glossario`).toBeDefined();
      expect(entry.translatable).toBe(false);
      expect(entry.canonical).toBeDefined();
    }
  });

  it('6. garantisce che la formattazione finanziaria rispetti le convenzioni locali IT ed EN', () => {
    const val = 12899.99;
    const itFormatted = formatCurrency(val, 'it');
    const enFormatted = formatCurrency(val, 'en');

    expect(itFormatted).toContain('12.899,99');
    expect(enFormatted).toContain('12,899.99');
  });

});
