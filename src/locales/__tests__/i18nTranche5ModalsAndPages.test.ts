import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import glossary from '../glossary.json';
import { interpolate } from '../i18nContext';

describe('i18n Tranche 5 — Pagine Stats, Marketplace, TimeTravel, Wiki, Maintenance e Modali', () => {
  it('1. assicura che tutte le chiavi di StatsPage siano presenti e valorizzate in entrambe le lingue', () => {
    const statsKeys = [
      'stats_title',
      'stats_subtitle',
      'stats_cat_component_multi',
      'stats_cat_empty',
      'stats_section_years_title',
      'stats_section_years_sub',
      'stats_peak_year_badge',
      'stats_trend_label',
      'stats_peak_badge',
      'stats_year_pct_of_total',
      'stats_years_empty',
      'stats_section_longevity_title',
      'stats_section_longevity_sub',
      'stats_spotlight_most_used',
      'stats_spotlight_days',
      'stats_spotlight_cat',
      'stats_spotlight_none_mounted',
      'stats_spotlight_best_amortization',
      'stats_cost_per_day',
      'stats_spotlight_amortization_sub',
      'stats_spotlight_none_amortized',
      'stats_th_component',
      'stats_th_category',
      'stats_th_status',
      'stats_th_days_in_use',
      'stats_th_cost_per_day',
      'stats_status_in_use',
      'stats_status_sold',
      'stats_status_storage',
      'stats_never_mounted',
      'stats_longevity_empty',
      'stats_section_top_title',
      'stats_section_top_sub',
      'stats_top_status_sold_title',
      'stats_top_status_active_title',
      'stats_top_net',
      'stats_top_empty',
      'stats_section_sales_title',
      'stats_section_sales_sub',
      'stats_sales_total_recovered',
      'stats_th_sales_component',
      'stats_th_sales_category',
      'stats_th_sales_spent',
      'stats_th_sales_revenue',
      'stats_th_sales_balance',
      'stats_th_sales_recovered_pct',
      'stats_sales_empty',
      'stats_section_upgrades_title',
      'stats_section_upgrades_sub',
      'stats_upgrades_most_updated_category',
      'stats_upgrades_card_count',
      'stats_upgrades_card_count_sub',
      'stats_upgrades_card_invested',
      'stats_upgrades_card_invested_sub',
      'stats_upgrades_card_recovered',
      'stats_upgrades_card_recovered_sub',
      'stats_upgrades_card_net',
      'stats_upgrades_card_net_sub',
      'stats_upgrades_empty',
    ];

    for (const key of statsKeys) {
      expect(key in itLocale, `Chiave StatsPage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave StatsPage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('2. assicura che tutte le chiavi di MarketplacePage siano presenti e valorizzate in entrambe le lingue', () => {
    const marketplaceKeys = [
      'marketplace_title',
      'marketplace_subtitle',
      'marketplace_wiki_tooltip',
      'marketplace_wiki_btn',
      'marketplace_register_sale_btn',
      'marketplace_kpi_storage_count',
      'marketplace_kpi_storage_sub',
      'marketplace_kpi_storage_value',
      'marketplace_kpi_storage_value_sub',
      'marketplace_kpi_recovered',
      'marketplace_kpi_recovered_sub',
      'marketplace_kpi_sold_count',
      'marketplace_kpi_sold_sub',
      'marketplace_tab_storage',
      'marketplace_tab_sold',
      'marketplace_storage_heading',
      'marketplace_storage_subheading',
      'marketplace_storage_empty_title',
      'marketplace_storage_empty_desc',
      'marketplace_storage_empty_sale_btn',
      'marketplace_warranty_active',
      'marketplace_warranty_expiring',
      'marketplace_warranty_expired',
      'marketplace_warranty_none',
      'marketplace_used_for',
      'marketplace_never_installed',
      'marketplace_purchase_cost',
      'marketplace_btn_generate_listing',
      'marketplace_btn_sell',
      'marketplace_sold_heading',
      'marketplace_sold_subheading',
      'marketplace_sold_empty_title',
      'marketplace_sold_empty_desc',
      'marketplace_sold_on',
      'marketplace_platform_label',
      'marketplace_buyer_label',
      'marketplace_net_revenue_label',
      'marketplace_gross_price',
      'marketplace_fees',
      'marketplace_shipping',
      'marketplace_recovery_label',
      'marketplace_btn_view_component',
    ];

    for (const key of marketplaceKeys) {
      expect(key in itLocale, `Chiave MarketplacePage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave MarketplacePage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('3. assicura che tutte le chiavi di TimeTravelPage siano presenti e valorizzate in entrambe le lingue', () => {
    const timeTravelKeys = [
      'timetravel_title',
      'timetravel_subtitle',
      'timetravel_wiki_tooltip',
      'timetravel_wiki_btn',
      'timetravel_btn_save_checkpoint',
      'timetravel_btn_checkpoint_list',
      'timetravel_date_label',
      'timetravel_first_date_tooltip',
      'timetravel_prev_date_tooltip',
      'timetravel_next_date_tooltip',
      'timetravel_last_date_tooltip',
      'timetravel_no_milestones',
      'timetravel_mode_label',
      'timetravel_boundary_eod',
      'timetravel_boundary_bod',
      'timetravel_active_checkpoint_banner',
      'timetravel_checkpoint_frozen_date',
      'timetravel_view_snapshot',
      'timetravel_view_reconstruction',
      'timetravel_discrepancy_title',
      'timetravel_discrepancy_desc',
      'timetravel_btn_exit_checkpoint',
      'timetravel_summary_mounted_count',
      'timetravel_summary_rig_value',
      'timetravel_summary_estimated_wattage',
      'timetravel_summary_day_events',
      'timetravel_day_events_title',
      'timetravel_no_day_events',
      'timetravel_rig_at_date_title',
      'timetravel_rig_empty',
      'timetravel_slot_label',
      'timetravel_cost_label',
      'timetravel_btn_compare',
      'timetravel_modal_checkpoints_title',
      'timetravel_modal_checkpoints_sub',
      'timetravel_btn_load_checkpoint',
      'timetravel_btn_edit_checkpoint',
      'timetravel_btn_delete_checkpoint',
      'timetravel_confirm_delete_checkpoint',
      'timetravel_empty_checkpoints',
      'timetravel_btn_before_this',
      'timetravel_btn_after_this',
      'timetravel_tooltip_before',
      'timetravel_tooltip_after',
      'timetravel_compare_with_current',
      'timetravel_config_heading',
      'timetravel_from_snapshot',
      'timetravel_from_reconstruction',
      'timetravel_mounted_in_pc',
    ];

    for (const key of timeTravelKeys) {
      expect(key in itLocale, `Chiave TimeTravelPage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave TimeTravelPage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('4. assicura che tutte le chiavi di WikiPage siano presenti e valorizzate in entrambe le lingue', () => {
    const wikiKeys = [
      'wiki_title',
      'wiki_subtitle',
      'wiki_back_to_referrer',
      'wiki_kpi_total_articles',
      'wiki_kpi_bookmarks',
      'wiki_kpi_categories',
      'wiki_search_placeholder',
      'wiki_clear_search',
      'wiki_category_all',
      'wiki_filter_bookmarks',
      'wiki_expand_all',
      'wiki_collapse_all',
      'wiki_bookmark_add',
      'wiki_bookmark_remove',
      'wiki_copy_link',
      'wiki_link_copied',
      'wiki_no_results_title',
      'wiki_no_results_desc',
      'wiki_reset_filters',
      'wiki_related_sections',
      'wiki_related_articles',
      'wiki_step_by_step',
      'wiki_pro_tip',
      'wiki_read_time',
      'wiki_offline_badge',
      'wiki_referrer_hint',
    ];

    for (const key of wikiKeys) {
      expect(key in itLocale, `Chiave WikiPage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave WikiPage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('5. assicura che tutte le chiavi di MaintenancePage siano presenti e valorizzate in entrambe le lingue', () => {
    const maintenanceKeys = [
      'maintenance_title',
      'maintenance_subtitle',
      'maintenance_wiki_btn',
      'maintenance_wiki_tooltip',
      'maintenance_btn_new_entry',
      'maintenance_btn_new_tuning',
      'maintenance_tab_overview',
      'maintenance_tab_live',
      'maintenance_tab_log',
      'maintenance_tab_tuning',
      'maintenance_tab_tools',
      'maintenance_tab_security',
      'maintenance_log_search_placeholder',
      'maintenance_filter_all_types',
      'maintenance_filter_all_components',
      'maintenance_log_empty_title',
      'maintenance_log_empty_desc',
      'maintenance_log_empty_btn',
      'maintenance_entry_comp_label',
      'maintenance_entry_cost_label',
      'maintenance_entry_product_label',
      'maintenance_entry_next_date',
      'maintenance_entry_overdue',
      'maintenance_entry_edit_tooltip',
      'maintenance_entry_delete_tooltip',
      'maintenance_entry_delete_confirm',
      'maintenance_tuning_search_placeholder',
      'maintenance_tuning_filter_all_comps',
      'maintenance_tuning_filter_all_stability',
      'maintenance_tuning_empty_title',
      'maintenance_tuning_empty_desc',
      'maintenance_tuning_empty_btn',
      'maintenance_tuning_export_bios',
      'maintenance_tools_storage_heading',
      'maintenance_tools_scan_volumes',
      'maintenance_tools_run_trim',
      'maintenance_tools_empty_recycle',
      'maintenance_tools_disk_cleanup',
      'maintenance_tools_diagnostics_heading',
      'maintenance_tools_sfc',
      'maintenance_tools_restore_point',
      'maintenance_tools_winget',
      'maintenance_tools_reboot_uefi',
    ];

    for (const key of maintenanceKeys) {
      expect(key in itLocale, `Chiave MaintenancePage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave MaintenancePage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('6. assicura che le chiavi dei modali (MovementSelector, UpgradeWizard, Install, Uninstall, Replace) siano presenti e consistenti', () => {
    const modalKeys = [
      'movement_selector_title',
      'movement_selector_subtitle',
      'movement_group_acquisition',
      'movement_opt_purchase_title',
      'movement_opt_purchase_desc',
      'movement_opt_upgrade_title',
      'movement_opt_upgrade_desc',
      'movement_group_management',
      'movement_opt_sale_title',
      'movement_opt_sale_desc',
      'movement_opt_expense_title',
      'movement_opt_expense_desc',
      'movement_opt_gift_title',
      'movement_opt_gift_desc',
      'movement_opt_disposal_title',
      'movement_opt_disposal_desc',
      'movement_footer_care_prompt',
      'movement_footer_care_btn',

      'upgrade_wizard_modal_title',
      'upgrade_step_1_title',
      'upgrade_step_2_title',
      'upgrade_step_3_title',
      'upgrade_step_4_title',
      'upgrade_step_1_select_label',
      'upgrade_step_1_empty',
      'upgrade_step_btn_next',
      'upgrade_step_btn_cancel',
      'upgrade_step_btn_back',
      'upgrade_step_2_mode_label',
      'upgrade_step_2_mode_new',
      'upgrade_step_2_mode_existing',
      'upgrade_field_name',
      'upgrade_field_brand',
      'upgrade_field_model',
      'upgrade_field_category',
      'upgrade_field_price',
      'upgrade_field_date',
      'upgrade_step_4_summary_title',
      'upgrade_step_4_desc',
      'upgrade_summary_old',
      'upgrade_summary_new',
      'upgrade_summary_date',
      'upgrade_summary_cost_new',
      'upgrade_summary_revenue_old',
      'upgrade_summary_net_cost',
      'upgrade_summary_recovery',
      'upgrade_summary_historical_cost',
      'upgrade_summary_dest_label',
      'upgrade_dest_sold',
      'upgrade_dest_storage',
      'upgrade_dest_installed',
      'upgrade_summary_replaced_with',
      'upgrade_summary_purchase_label',
      'upgrade_summary_operation_title',
      'upgrade_summary_date_label',
      'upgrade_summary_slot_label',
      'upgrade_summary_unspecified',
      'upgrade_summary_notes_label',
      'upgrade_summary_sale_title',
      'upgrade_summary_gross_label',
      'upgrade_summary_shipping_abbr',
      'upgrade_summary_fees_abbr',
      'upgrade_summary_net_recovery',
      'upgrade_summary_channel_label',
      'upgrade_summary_direct',
      'upgrade_summary_buyer_label',
      'upgrade_summary_net_formula',
      'upgrade_checkpoint_hint',
      'upgrade_btn_execute',
      'upgrade_btn_executing',

      'modal_install_title',
      'modal_install_sub',
      'modal_install_select_label',
      'modal_install_empty',
      'modal_install_date_label',
      'modal_install_slot_label',
      'modal_install_notes_label',
      'modal_install_notes_placeholder',
      'modal_install_btn_cancel',
      'modal_install_btn_submit',
      'modal_install_btn_submitting',
      'modal_install_error_no_comp',
      'modal_install_error_no_date',

      'modal_uninstall_title',
      'modal_uninstall_sub',
      'modal_uninstall_date_label',
      'modal_uninstall_reason_label',
      'modal_uninstall_notes_label',
      'modal_uninstall_notes_placeholder',
      'modal_uninstall_btn_cancel',
      'modal_uninstall_btn_submit',
      'modal_uninstall_btn_submitting',
      'modal_uninstall_error_no_date',

      'modal_replace_title',
      'modal_replace_sub',
      'modal_replace_current_label',
      'modal_replace_new_label',
      'modal_replace_empty',
      'modal_replace_date_label',
      'modal_replace_slot_label',
      'modal_replace_btn_cancel',
      'modal_replace_btn_submit',
      'modal_replace_btn_submitting',
      'modal_replace_error_no_comp',
      'modal_replace_error_no_date',
    ];

    for (const key of modalKeys) {
      expect(key in itLocale, `Chiave modale mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave modale mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('7. verifica che i parametri di interpolazione coincidano esattamente tra IT ed EN per le chiavi Tranche 5', () => {
    const keysWithParams = [
      'timetravel_active_checkpoint_banner',
      'timetravel_checkpoint_frozen_date',
      'timetravel_discrepancy_desc',
      'timetravel_day_events_title',
      'timetravel_rig_at_date_title',
      'timetravel_slot_label',
      'timetravel_cost_label',
      'timetravel_config_heading',
      'wiki_back_to_referrer',
      'upgrade_step_1_status',
      'upgrade_step_1_purchase_info',
      'upgrade_step_1_days_info',
      'upgrade_summary_net_formula',
      'modal_install_empty',
      'modal_replace_empty',
      'maintenance_entry_comp_label',
      'maintenance_entry_cost_label',
      'maintenance_entry_product_label',
      'maintenance_entry_next_date',
      'maintenance_entry_overdue',
      'maintenance_entry_delete_confirm',
    ];

    const paramRegex = /\{([a-zA-Z0-9_]+)\}/g;

    for (const key of keysWithParams) {
      const itVal = (itLocale as Record<string, string>)[key];
      const enVal = (enLocale as Record<string, string>)[key];

      expect(itVal, `Valore IT mancante per ${key}`).toBeDefined();
      expect(enVal, `Valore EN mancante per ${key}`).toBeDefined();

      const itMatches = Array.from(itVal.matchAll(paramRegex)).map((m) => m[1]).sort();
      const enMatches = Array.from(enVal.matchAll(paramRegex)).map((m) => m[1]).sort();

      expect(itMatches, `Discrepanza parametri IT vs EN per la chiave "${key}"`).toEqual(enMatches);
    }
  });

  it('8. verifica la corretta interpolazione a runtime delle chiavi con parametri Tranche 5', () => {
    const formattedFormula = interpolate((itLocale as Record<string, string>)['upgrade_summary_net_formula'], {
      newCost: '1899.00',
      oldRecovered: '750.00',
    });
    expect(formattedFormula).toBe('Costo nuovo (€ 1899.00) − Recupero vecchio (€ 750.00)');

    const formattedInstallEmpty = interpolate((itLocale as Record<string, string>)['modal_install_empty'], {
      category: 'Scheda Video (GPU)',
    });
    expect(formattedInstallEmpty).toContain('Scheda Video (GPU)');

    const formattedWikiReferrer = interpolate((itLocale as Record<string, string>)['wiki_back_to_referrer'], {
      section: 'Mio PC',
    });
    expect(formattedWikiReferrer).toBe('Torna a Mio PC');

    const enWikiReferrer = interpolate((enLocale as Record<string, string>)['wiki_back_to_referrer'], {
      section: 'Current Rig',
    });
    expect(enWikiReferrer).toBe('Back to Current Rig');

    const formattedDiscrepancy = interpolate((itLocale as Record<string, string>)['timetravel_discrepancy_desc'], {
      diffCount: 3,
    });
    expect(formattedDiscrepancy).toContain('3 discrepanze');
  });

  it('9. assicura che i termini tecnici hardware protetti da glossary.json rimangano inalterati', () => {
    const protectedTerms = ['CPU', 'GPU', 'RAM', 'SSD', 'NVMe', 'TRIM', 'PCIe', 'UEFI', 'BIOS'];

    for (const term of protectedTerms) {
      expect(glossary.protected_terms).toContain(term);
    }

    // Verifica che in IT ed EN termini come TRIM, UEFI e BIOS compaiano identici nei tool di manutenzione
    expect((itLocale as Record<string, string>)['maintenance_tools_run_trim']).toContain('TRIM SSD');
    expect((enLocale as Record<string, string>)['maintenance_tools_run_trim']).toContain('SSD TRIM');
    expect((itLocale as Record<string, string>)['maintenance_tools_reboot_uefi']).toContain('BIOS UEFI');
    expect((enLocale as Record<string, string>)['maintenance_tools_reboot_uefi']).toContain('UEFI BIOS');
  });
});
