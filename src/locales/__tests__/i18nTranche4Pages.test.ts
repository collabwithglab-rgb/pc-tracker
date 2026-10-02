import { describe, it, expect } from 'vitest';
import itLocale from '../it.json';
import enLocale from '../en.json';
import glossary from '../glossary.json';
import { interpolate, formatCurrency } from '../i18nContext';

describe('i18n Tranche 4 — Pagine ArchivePage, UpgradesPage e ComponentDetailPage', () => {
  it('1. assicura che tutte le chiavi di ArchivePage siano presenti e valorizzate in entrambe le lingue', () => {
    const archiveKeys = [
      'archive_loading',
      'archive_empty_db_title',
      'archive_empty_db_desc',
      'archive_empty_db_add_btn',
      'archive_empty_db_guide_btn',
      'archive_search_placeholder',
      'archive_search_aria_label',
      'archive_search_clear_tooltip',
      'archive_view_mode_aria',
      'archive_view_cards_tooltip',
      'archive_view_table_tooltip',
      'archive_new_component_btn',
      'archive_new_component_tooltip',
      'archive_filter_status_aria',
      'archive_status_filter_all',
      'archive_status_filter_in_use',
      'archive_status_filter_in_storage',
      'archive_status_filter_sold',
      'archive_status_filter_gifted',
      'archive_status_filter_disposed',
      'archive_filter_category_aria',
      'archive_category_filter_all',
      'archive_filter_warranty_aria',
      'archive_warranty_filter_all',
      'archive_warranty_filter_active',
      'archive_warranty_filter_expiring',
      'archive_warranty_filter_expired',
      'archive_sort_aria',
      'archive_sort_purchase_date_desc',
      'archive_sort_name_asc',
      'archive_sort_cost_desc',
      'archive_reset_filters_btn',
      'archive_reset_filters_tooltip',
      'archive_pill_in_use',
      'archive_pill_in_storage',
      'archive_pill_dismissed',
      'archive_pill_count_ratio',
      'archive_guide_states_btn',
      'archive_guide_states_tooltip',
      'archive_search_empty_title',
      'archive_search_empty_desc',
      'archive_search_clear_btn',
      'archive_filter_empty_title',
      'archive_filter_empty_desc',
      'archive_filter_reset_btn',
      'archive_th_status',
      'archive_th_component',
      'archive_th_category',
      'archive_th_purchase_date',
      'archive_th_historical_cost',
      'archive_th_usage_notes',
      'archive_th_actions',
      'archive_row_view_tooltip',
      'archive_row_aria_label',
      'archive_badge_warranty_active',
      'archive_badge_warranty_expiring',
      'archive_badge_warranty_expired',
      'archive_badge_days_in_use',
      'archive_action_install',
      'archive_action_install_tooltip',
      'archive_action_edit_tooltip',
      'archive_action_edit_aria',
      'archive_action_delete_tooltip',
      'archive_action_delete_aria',
      'archive_card_aria_label',
      'archive_card_no_purchase',
      'archive_card_days_badge',
      'archive_card_install_btn',
      'archive_card_edit_btn',
    ];

    for (const key of archiveKeys) {
      expect(key in itLocale, `Chiave ArchivePage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave ArchivePage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('2. assicura che tutte le chiavi di UpgradesPage siano presenti e valorizzate in entrambe le lingue', () => {
    const upgradeKeys = [
      'upgrades_kpi_generations',
      'upgrades_kpi_generations_sub',
      'upgrades_kpi_spending_new',
      'upgrades_kpi_spending_new_sub',
      'upgrades_kpi_recovered_old',
      'upgrades_kpi_recovered_old_sub',
      'upgrades_kpi_net_cost',
      'upgrades_kpi_net_cost_sub',
      'upgrades_search_placeholder',
      'upgrades_category_filter_all',
      'upgrades_guide_btn',
      'upgrades_guide_tooltip',
      'upgrades_new_btn',
      'upgrades_new_btn_tooltip',
      'upgrades_empty_title',
      'upgrades_empty_filter_desc',
      'upgrades_empty_zero_desc',
      'upgrades_empty_first_btn',
      'upgrades_empty_how_btn',
      'upgrades_card_date',
      'upgrades_card_checkpoint_tooltip',
      'upgrades_card_checkpoint_label',
      'upgrades_card_prev_label',
      'upgrades_card_prev_empty',
      'upgrades_card_prev_new_entry',
      'upgrades_card_prev_recovered',
      'upgrades_card_prev_historical',
      'upgrades_card_prev_click_tooltip',
      'upgrades_card_replaced_with',
      'upgrades_card_next_label',
      'upgrades_card_next_purchase',
      'upgrades_card_next_click_tooltip',
      'upgrades_strip_cost_new',
      'upgrades_strip_recovered_old',
      'upgrades_strip_net_cost',
    ];

    for (const key of upgradeKeys) {
      expect(key in itLocale, `Chiave UpgradesPage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave UpgradesPage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('3. assicura che tutte le chiavi di ComponentDetailPage siano presenti e valorizzate in entrambe le lingue', () => {
    const detailKeys = [
      'detail_back_dashboard',
      'detail_back_current_rig',
      'detail_back_upgrades',
      'detail_back_marketplace',
      'detail_back_stats',
      'detail_back_archive',
      'detail_not_found',
      'detail_action_upgrade',
      'detail_action_upgrade_tooltip',
      'detail_action_install',
      'detail_action_replace',
      'detail_action_uninstall',
      'detail_action_sale',
      'detail_action_sale_tooltip',
      'detail_action_extra_expense',
      'detail_action_extra_expense_tooltip',
      'detail_action_generate_listing',
      'detail_action_generate_listing_tooltip',
      'detail_action_gift',
      'detail_action_gift_tooltip',
      'detail_action_disposal',
      'detail_action_disposal_tooltip',
      'detail_action_care',
      'detail_action_care_tooltip',
      'detail_action_tuning',
      'detail_action_tuning_tooltip',
      'detail_action_edit',
      'detail_action_delete',
      'detail_metric_total_purchase',
      'detail_metric_total_purchase_sub',
      'detail_metric_total_revenue',
      'detail_metric_total_revenue_sub',
      'detail_metric_net_cost',
      'detail_metric_net_cost_sub',
      'detail_metric_days_in_use',
      'detail_metric_days_in_use_sub',
      'detail_metric_days_count',
      'detail_metric_cost_per_day',
      'detail_metric_cost_per_day_sub',
      'detail_metric_cost_per_day_val',
      'detail_specs_heading',
      'detail_spec_category',
      'detail_spec_brand',
      'detail_spec_model',
      'detail_spec_serial',
      'detail_spec_registered_at',
      'detail_spec_personal_notes',
      'detail_timeline_heading',
      'detail_timeline_empty',
      'detail_event_title_purchase',
      'detail_event_title_install',
      'detail_event_title_uninstall',
      'detail_event_title_sale',
      'detail_event_title_extra_expense',
      'detail_event_title_gift',
      'detail_event_title_disposal',
      'detail_event_edit_tooltip',
      'detail_event_delete_tooltip',
      'detail_event_desc_purchase_price',
      'detail_event_desc_store',
      'detail_event_desc_condition_new',
      'detail_event_desc_condition_used',
      'detail_event_desc_install_slot',
      'detail_event_desc_install_pc',
      'detail_event_desc_notes',
      'detail_event_desc_uninstall_reason',
      'detail_event_desc_extra_amount',
      'detail_event_desc_sale_revenue',
      'detail_event_desc_platform',
      'detail_event_desc_gift_recipient',
      'detail_event_desc_disposal_method',
      'detail_event_delete_confirm',
      'detail_event_delete_error',
      'detail_warranty_heading',
      'detail_warranty_unspecified',
      'detail_warranty_status_label',
      'detail_warranty_expiry_label',
      'detail_warranty_unregistered',
      'detail_warranty_purchase_date_label',
      'detail_warranty_store_label',
      'detail_warranty_order_label',
      'detail_warranty_serial_label',
      'detail_warranty_edit_btn',
      'detail_warranty_set_btn',
      'detail_warranty_edit_tooltip',
      'detail_receipts_heading',
      'detail_receipts_local_badge',
      'detail_receipts_upload_prompt',
      'detail_receipts_uploading',
      'detail_receipts_dropzone_hint',
      'detail_receipts_loading',
      'detail_receipts_empty',
      'detail_receipts_open_btn',
      'detail_receipts_open_tooltip',
      'detail_receipts_download_tooltip',
      'detail_receipts_delete_tooltip',
      'detail_receipts_delete_confirm',
      'detail_receipts_error_mime',
      'detail_receipts_error_size',
      'detail_receipts_error_read',
      'detail_receipts_error_save',
      'detail_maintenance_heading',
      'detail_maintenance_record_btn',
      'detail_maintenance_paste_title',
      'detail_maintenance_paste_fresh',
      'detail_maintenance_paste_good',
      'detail_maintenance_paste_monitor',
      'detail_maintenance_empty_desc',
      'detail_maintenance_empty_btn',
      'detail_maintenance_edit_tooltip',
      'detail_maintenance_delete_tooltip',
      'detail_maintenance_delete_confirm',
      'detail_maintenance_product_label',
      'detail_tuning_heading',
      'detail_tuning_add_btn',
      'detail_tuning_empty_desc',
      'detail_tuning_empty_btn',
      'detail_tuning_export_bios_tooltip',
      'detail_tuning_edit_tooltip',
      'detail_tuning_delete_tooltip',
      'detail_tuning_delete_confirm',
      'detail_tuning_more_params',
      'detail_tuning_idle',
      'detail_tuning_load',
      'detail_tuning_power',
      'detail_maintenance_initial_title',
    ];

    for (const key of detailKeys) {
      expect(key in itLocale, `Chiave ComponentDetailPage mancante in it.json: ${key}`).toBe(true);
      expect(key in enLocale, `Chiave ComponentDetailPage mancante in en.json: ${key}`).toBe(true);
      expect((itLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
      expect((enLocale as Record<string, string>)[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('4. convalida la rigorosa corrispondenza dei token dinamici interpolati per le schermate di Tranche 4', () => {
    const extractTokens = (str: string) => {
      const matches = str.match(/\{(\w+)\}/g) || [];
      return matches.map((m) => m.slice(1, -1)).sort();
    };

    const targetKeys = [
      'archive_pill_in_use',
      'archive_pill_in_storage',
      'archive_pill_dismissed',
      'archive_pill_count_ratio',
      'archive_search_empty_title',
      'archive_row_view_tooltip',
      'archive_row_aria_label',
      'archive_badge_days_in_use',
      'archive_action_edit_aria',
      'archive_action_delete_aria',
      'archive_card_aria_label',
      'archive_card_days_badge',
      'upgrades_category_filter_all',
      'upgrades_card_date',
      'upgrades_card_checkpoint_tooltip',
      'upgrades_card_checkpoint_label',
      'upgrades_card_prev_recovered',
      'upgrades_card_prev_historical',
      'upgrades_card_prev_click_tooltip',
      'upgrades_card_next_purchase',
      'upgrades_card_next_click_tooltip',
      'detail_metric_days_count',
      'detail_metric_cost_per_day_val',
      'detail_timeline_heading',
      'detail_event_desc_purchase_price',
      'detail_event_desc_store',
      'detail_event_desc_install_slot',
      'detail_event_desc_notes',
      'detail_event_desc_uninstall_reason',
      'detail_event_desc_extra_amount',
      'detail_event_desc_sale_revenue',
      'detail_event_desc_platform',
      'detail_event_desc_gift_recipient',
      'detail_event_desc_disposal_method',
      'detail_event_delete_confirm',
      'detail_receipts_heading',
      'detail_receipts_delete_confirm',
      'detail_receipts_error_size',
      'detail_maintenance_heading',
      'detail_maintenance_paste_fresh',
      'detail_maintenance_paste_good',
      'detail_maintenance_paste_monitor',
      'detail_maintenance_delete_confirm',
      'detail_maintenance_product_label',
      'detail_tuning_heading',
      'detail_tuning_delete_confirm',
      'detail_tuning_more_params',
      'detail_tuning_idle',
      'detail_tuning_load',
      'detail_tuning_power',
      'detail_maintenance_initial_title',
    ];

    for (const key of targetKeys) {
      const itVal = (itLocale as Record<string, string>)[key];
      const enVal = (enLocale as Record<string, string>)[key];
      expect(extractTokens(enVal), `Mancata corrispondenza token su chiave ${key}`).toEqual(extractTokens(itVal));
    }
  });

  it('5. interpola correttamente i parametri complessi di Tranche 4', () => {
    // Test Archive ratio
    const itRatio = interpolate(itLocale.archive_pill_count_ratio, { filtered: 12, total: 29 });
    expect(itRatio).toBe('(12 di 29)');
    const enRatio = interpolate(enLocale.archive_pill_count_ratio, { filtered: 12, total: 29 });
    expect(enRatio).toBe('(12 of 29)');

    // Test Upgrade card date
    const itUpgradeDate = interpolate(itLocale.upgrades_card_date, { date: '15/06/2024' });
    expect(itUpgradeDate).toBe('Data: 15/06/2024');
    const enUpgradeDate = interpolate(enLocale.upgrades_card_date, { date: '06/15/2024' });
    expect(enUpgradeDate).toBe('Date: 06/15/2024');

    // Test Detail Event Confirm
    const itConfirm = interpolate(itLocale.detail_event_delete_confirm, {
      type: 'Acquisto Iniziale',
      date: '10/01/2023',
    });
    expect(itConfirm).toBe(
      'Sei sicuro di voler eliminare l\'evento "Acquisto Iniziale" del 10/01/2023? Lo stato e i costi del componente verranno ricalcolati automaticamente.'
    );

    const enConfirm = interpolate(enLocale.detail_event_delete_confirm, {
      type: 'Initial Purchase',
      date: '01/10/2023',
    });
    expect(enConfirm).toBe(
      'Are you sure you want to delete the "Initial Purchase" event of 01/10/2023? The component status and costs will be recalculated automatically.'
    );
  });

  it('6. verifica che i termini hardware protetti non vengano arbitrariamente alterati o tradotti impropriamente', () => {
    // Sigle hardware protette dal glossario
    expect(glossary.hardware_acronyms.BIOS.term).toBe('BIOS');
    expect(glossary.hardware_acronyms.RAM.term).toBe('RAM');

    // Termini dal glossario presenti in Tranche 4 (es. BIOS, Idle, W, °C, IndexedDB)
    expect(itLocale.detail_tuning_export_bios_tooltip).toContain('BIOS');
    expect(enLocale.detail_tuning_export_bios_tooltip).toContain('BIOS');

    expect(itLocale.detail_tuning_idle).toContain('Idle');
    expect(enLocale.detail_tuning_idle).toContain('Idle');

    expect(itLocale.detail_receipts_local_badge).toContain('IndexedDB');
    expect(enLocale.detail_receipts_local_badge).toContain('IndexedDB');
  });

  it('7. garantisce formattazione difensiva delle valute e interpolazione sicura con fallback', () => {
    // Valuta formattata
    expect(formatCurrency(450.5, 'it')).toContain('450,50');
    expect(formatCurrency(450.5, 'en')).toContain('450.50');

    // Interpolazione sicura con undefined
    const interpolated = interpolate(itLocale.detail_event_desc_install_slot, { slot: '' });
    expect(interpolated).toBe('Alloggiamento: ');
  });
});
