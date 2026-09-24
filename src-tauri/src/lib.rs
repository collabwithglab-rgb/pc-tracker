pub mod hardware;
pub mod windows_tools;
pub mod monitoring;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      hardware::detect_hardware,
      windows_tools::check_system_elevation,
      windows_tools::scan_storage_volumes,
      windows_tools::query_trim_config,
      windows_tools::run_ssd_trim,
      windows_tools::query_recycle_bin,
      windows_tools::empty_recycle_bin,
      windows_tools::get_hibernate_status,
      windows_tools::set_hibernate_enabled,
      windows_tools::open_disk_cleanup,
      windows_tools::verify_system_files,
      windows_tools::check_disk_readonly,
      windows_tools::create_restore_point,
      windows_tools::query_security_audit,
      windows_tools::get_storage_smart_health,
      windows_tools::enable_ultimate_performance,
      windows_tools::clean_gpu_shader_cache,
      windows_tools::clean_component_store,
      windows_tools::reboot_to_uefi,
      windows_tools::check_winget_updates,
      monitoring::get_monitoring_snapshot,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
