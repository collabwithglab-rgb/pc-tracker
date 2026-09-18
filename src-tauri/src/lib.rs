pub mod hardware;
pub mod windows_tools;

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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
