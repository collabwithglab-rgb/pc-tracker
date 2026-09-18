use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WindowsToolResult<T> {
    pub status: String, // "success" | "warning" | "failed" | "cancelled" | "not_supported" | "requires_elevation"
    pub message: String,
    pub details: Option<String>,
    pub data: Option<T>,
    pub duration_ms: u64,
    pub requires_elevation: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VolumeDriveInfo {
    pub drive_letter: String,
    pub label: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub is_ssd: bool,
    pub media_type: String,
    pub bus_type: Option<String>,
    pub friendly_name: Option<String>,
    pub health_status: Option<String>,
    pub operational_status: Option<String>,
    pub trim_supported: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBinInfo {
    pub item_count: u64,
    pub total_size_bytes: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HibernateStatus {
    pub enabled: bool,
    pub file_size_gb: Option<f64>,
    pub can_toggle: bool,
    pub details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrimConfigStatus {
    pub enabled: bool,
    pub details: String,
}

#[cfg(target_os = "windows")]
mod windows_native {
    use super::*;
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    use winreg::enums::*;
    use winreg::RegKey;

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    extern "system" {
        fn OpenProcessToken(
            process_handle: *mut std::ffi::c_void,
            desired_access: u32,
            token_handle: *mut *mut std::ffi::c_void,
        ) -> i32;
        fn GetCurrentProcess() -> *mut std::ffi::c_void;
        fn GetTokenInformation(
            token_handle: *mut std::ffi::c_void,
            token_information_class: u32,
            token_information: *mut std::ffi::c_void,
            token_information_length: u32,
            return_length: *mut u32,
        ) -> i32;
        fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
    }

    /// Verifica nativamente se il processo corrente possiede il token di elevazione Amministratore (UAC)
    pub fn is_current_process_elevated() -> bool {
        unsafe {
            let mut token: *mut std::ffi::c_void = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), 0x0008, &mut token) != 0 {
                let mut elevation: u32 = 0;
                let mut size: u32 = 0;
                let success = GetTokenInformation(
                    token,
                    20, // TokenElevation class
                    &mut elevation as *mut u32 as *mut std::ffi::c_void,
                    std::mem::size_of::<u32>() as u32,
                    &mut size,
                );
                CloseHandle(token);
                if success != 0 && elevation != 0 {
                    return true;
                }
            }
        }
        false
    }

    /// Esegue un comando PowerShell standard con output nascosto
    pub fn run_powershell_hidden(command_str: &str) -> std::io::Result<std::process::Output> {
        Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command_str])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
    }

    /// Esegue un'operazione con richiesta esplicita di elevazione UAC Windows tramite PowerShell Start-Process -Verb RunAs
    pub fn run_powershell_elevated_uac(command_str: &str) -> (String, String, String, i32) {
        let temp_dir = std::env::temp_dir();
        let out_file = temp_dir.join(format!("pctracker_uac_out_{}.txt", std::process::id()));
        let out_path_str = out_file.to_string_lossy().replace('\\', "/");

        // Crea script che scrive l'output nel file temporaneo
        let escaped_cmd = command_str.replace('"', "\"\"");
        let uac_script = format!(
            "$res = try {{ & {{ {} }} *>&1 }} catch {{ $_.Exception.Message }}; Set-Content -Path '{}' -Value $res -Encoding UTF8",
            escaped_cmd,
            out_path_str
        );

        let uac_cmd = format!(
            "try {{ $p = Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',\"{}\" -PassThru -Wait; exit $p.ExitCode }} catch [System.ComponentModel.Win32Exception] {{ exit 1223 }} catch {{ exit 1 }}",
            uac_script.replace('"', "\"\"")
        );

        let res = Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &uac_cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let exit_code = match &res {
            Ok(out) => out.status.code().unwrap_or(1),
            Err(_) => 1,
        };

        if exit_code == 1223 {
            // Error 1223 = ERROR_CANCELLED (l'utente ha cliccato 'No' o ha chiuso il prompt UAC)
            let _ = std::fs::remove_file(&out_file);
            return (
                "cancelled".to_string(),
                "Richiesta di elevazione UAC annullata dall'utente.".to_string(),
                "L'operazione richiedeva privilegi amministrativi ma l'autorizzazione non è stata concessa.".to_string(),
                1223,
            );
        }

        let output_content = if out_file.exists() {
            let content = std::fs::read_to_string(&out_file).unwrap_or_default();
            let _ = std::fs::remove_file(&out_file);
            content.trim().to_string()
        } else {
            String::new()
        };

        if exit_code == 0 {
            (
                "success".to_string(),
                "Comando eseguito con privilegi elevati.".to_string(),
                output_content,
                0,
            )
        } else {
            (
                "failed".to_string(),
                format!("Esecuzione con privilegi elevati non riuscita (codice uscita: {}).", exit_code),
                output_content,
                exit_code,
            )
        }
    }

    /// Query non-distruttiva di volumi e dischi fisici
    pub fn scan_storage_volumes_native() -> WindowsToolResult<Vec<VolumeDriveInfo>> {
        let start = Instant::now();

        // 1. Get-Volume query
        let ps_cmd = "Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining, HealthStatus, OperationalStatus | ConvertTo-Json -Compress";
        let out = match run_powershell_hidden(ps_cmd) {
            Ok(o) => o,
            Err(e) => {
                return WindowsToolResult {
                    status: "failed".to_string(),
                    message: format!("Impossibile interrogare i volumi Windows: {}", e),
                    details: None,
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                };
            }
        };

        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if stdout.is_empty() {
            return WindowsToolResult {
                status: "warning".to_string(),
                message: "Nessun volume con lettera di unità rilevato.".to_string(),
                details: None,
                data: Some(vec![]),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            };
        }

        #[derive(Deserialize)]
        struct RawVolume {
            #[serde(rename = "DriveLetter")]
            drive_letter: Option<String>,
            #[serde(rename = "FileSystemLabel")]
            file_system_label: Option<String>,
            #[serde(rename = "FileSystem")]
            file_system: Option<String>,
            #[serde(rename = "Size")]
            size: Option<u64>,
            #[serde(rename = "SizeRemaining")]
            size_remaining: Option<u64>,
            #[serde(rename = "HealthStatus")]
            health_status: Option<String>,
            #[serde(rename = "OperationalStatus")]
            operational_status: Option<String>,
        }

        let raw_volumes: Vec<RawVolume> = if stdout.starts_with('[') {
            serde_json::from_str(&stdout).unwrap_or_default()
        } else if stdout.starts_with('{') {
            serde_json::from_str::<RawVolume>(&stdout).map(|v| vec![v]).unwrap_or_default()
        } else {
            vec![]
        };

        // 2. Query dischi fisici per MediaType e BusType (SSD vs HDD)
        let disk_cmd = "Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, BusType | ConvertTo-Json -Compress";
        let disk_out = run_powershell_hidden(disk_cmd).ok();
        let disk_stdout = disk_out.map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or_default();

        #[derive(Deserialize)]
        struct RawDisk {
            #[serde(rename = "FriendlyName")]
            friendly_name: Option<String>,
            #[serde(rename = "MediaType")]
            media_type: Option<String>,
            #[serde(rename = "BusType")]
            bus_type: Option<String>,
        }

        let raw_disks: Vec<RawDisk> = if disk_stdout.starts_with('[') {
            serde_json::from_str(&disk_stdout).unwrap_or_default()
        } else if disk_stdout.starts_with('{') {
            serde_json::from_str::<RawDisk>(&disk_stdout).map(|d| vec![d]).unwrap_or_default()
        } else {
            vec![]
        };

        let mut drives = Vec::new();
        for v in raw_volumes {
            if let Some(dl) = v.drive_letter {
                let letter = dl.trim().to_uppercase();
                if letter.is_empty() {
                    continue;
                }

                // Cerca corrispondenza su dischi fisici
                let matched_disk = raw_disks.iter().find(|d| {
                    let mt = d.media_type.as_deref().unwrap_or_default().to_uppercase();
                    let bt = d.bus_type.as_deref().unwrap_or_default().to_uppercase();
                    mt.contains("SSD") || bt.contains("NVME")
                });

                let is_ssd = matched_disk.is_some() || letter == "C";
                let media_type = if is_ssd { "SSD".to_string() } else { "HDD".to_string() };
                let friendly_name = matched_disk.and_then(|d| d.friendly_name.clone());
                let bus_type = matched_disk.and_then(|d| d.bus_type.clone());

                drives.push(VolumeDriveInfo {
                    drive_letter: format!("{}:", letter),
                    label: v.file_system_label.unwrap_or_default(),
                    file_system: v.file_system.unwrap_or_else(|| "NTFS".to_string()),
                    total_bytes: v.size.unwrap_or(0),
                    free_bytes: v.size_remaining.unwrap_or(0),
                    is_ssd,
                    media_type,
                    bus_type,
                    friendly_name,
                    health_status: v.health_status,
                    operational_status: v.operational_status,
                    trim_supported: is_ssd,
                });
            }
        }

        WindowsToolResult {
            status: "success".to_string(),
            message: format!("Rilevati {} volumi di archiviazione.", drives.len()),
            details: None,
            data: Some(drives),
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: false,
        }
    }

    /// Query non-distruttiva dello stato globale TRIM di Windows
    pub fn query_trim_config_native() -> WindowsToolResult<TrimConfigStatus> {
        let start = Instant::now();
        let cmd = Command::new("fsutil.exe")
            .args(["behavior", "query", "DisableDeleteNotify"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match cmd {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let enabled = stdout.contains("= 0") && !stdout.contains("DisableDeleteNotify = 1");
                WindowsToolResult {
                    status: "success".to_string(),
                    message: if enabled {
                        "TRIM Windows è abilitato a livello di sistema operativo.".to_string()
                    } else {
                        "TRIM Windows risulta disabilitato.".to_string()
                    },
                    details: Some(stdout.trim().to_string()),
                    data: Some(TrimConfigStatus {
                        enabled,
                        details: stdout.trim().to_string(),
                    }),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile verificare lo stato TRIM: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Esegue TRIM mirato sull'SSD specificato (Optimize-Volume -ReTrim)
    pub fn run_ssd_trim_native(drive_letter: &str) -> WindowsToolResult<String> {
        let start = Instant::now();
        let clean_letter = drive_letter.replace(':', "").trim().to_uppercase();
        if clean_letter.len() != 1 || !clean_letter.chars().next().unwrap().is_ascii_alphabetic() {
            return WindowsToolResult {
                status: "failed".to_string(),
                message: "Lettera di unità non valida.".to_string(),
                details: Some("La lettera di unità deve essere un singolo carattere da A a Z.".to_string()),
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            };
        }

        let is_admin = is_current_process_elevated();
        let command_str = format!("Optimize-Volume -DriveLetter {} -ReTrim -Verbose", clean_letter);

        if is_admin {
            let output = match run_powershell_hidden(&command_str) {
                Ok(o) => o,
                Err(e) => {
                    return WindowsToolResult {
                        status: "failed".to_string(),
                        message: format!("Errore durante l'avvio del comando TRIM: {}", e),
                        details: None,
                        data: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: true,
                    };
                }
            };

            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

            if output.status.success() {
                WindowsToolResult {
                    status: "success".to_string(),
                    message: format!("Ottimizzazione TRIM completata con successo sull'unità {}:", clean_letter),
                    details: if !stdout.is_empty() { Some(stdout) } else { Some(format!("Volume {}: ottimizzato.", clean_letter)) },
                    data: Some(format!("TRIM {}: completato", clean_letter)),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                }
            } else {
                WindowsToolResult {
                    status: "failed".to_string(),
                    message: format!("Comando TRIM non riuscito sull'unità {}:", clean_letter),
                    details: Some(if !stderr.is_empty() { stderr } else { stdout }),
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                }
            }
        } else {
            // Esegui tramite percorso UAC elevato
            let (status, msg, details, _exit_code) = run_powershell_elevated_uac(&command_str);
            WindowsToolResult {
                status,
                message: if msg.contains("annullata") {
                    "Operazione TRIM annullata: richiesta UAC rifiutata.".to_string()
                } else {
                    format!("Ottimizzazione TRIM unità {}: {}", clean_letter, msg)
                },
                details: Some(details),
                data: Some(format!("TRIM {}: eseguito", clean_letter)),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        }
    }

    /// Query non-distruttiva della dimensione e numero file del Cestino
    pub fn query_recycle_bin_native() -> WindowsToolResult<RecycleBinInfo> {
        let start = Instant::now();
        let cmd_str = "(New-Object -ComObject Shell.Application).Namespace(0xa).Items() | Measure-Object -Property Size -Sum | Select-Object Count, Sum | ConvertTo-Json -Compress";

        match run_powershell_hidden(cmd_str) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                #[derive(Deserialize)]
                struct RawBin {
                    #[serde(rename = "Count")]
                    count: Option<u64>,
                    #[serde(rename = "Sum")]
                    sum: Option<u64>,
                }

                let parsed: RawBin = serde_json::from_str(&stdout).unwrap_or(RawBin { count: Some(0), sum: Some(0) });
                let count = parsed.count.unwrap_or(0);
                let sum = parsed.sum.unwrap_or(0);

                WindowsToolResult {
                    status: "success".to_string(),
                    message: format!("Il Cestino contiene {} elementi ({} byte).", count, sum),
                    details: None,
                    data: Some(RecycleBinInfo {
                        item_count: count,
                        total_size_bytes: sum,
                    }),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile interrogare il Cestino: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Svuota il cestino dell'utente corrente (conferma già gestita da UI prima della chiamata)
    pub fn empty_recycle_bin_native(drive_letter: Option<String>) -> WindowsToolResult<String> {
        let start = Instant::now();
        let cmd_str = if let Some(dl) = drive_letter {
            let clean = dl.replace(':', "").trim().to_uppercase();
            if clean.len() != 1 || !clean.chars().next().unwrap().is_ascii_alphabetic() {
                return WindowsToolResult {
                    status: "failed".to_string(),
                    message: "Lettera di unità non valida.".to_string(),
                    details: Some("La lettera di unità deve essere un singolo carattere da A a Z.".to_string()),
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                };
            }
            format!("Clear-RecycleBin -DriveLetter {} -Force -ErrorAction Stop", clean)
        } else {
            "Clear-RecycleBin -Force -ErrorAction Stop".to_string()
        };

        match run_powershell_hidden(&cmd_str) {
            Ok(output) => {
                if output.status.success() {
                    WindowsToolResult {
                        status: "success".to_string(),
                        message: "Cestino di Windows svuotato con successo.".to_string(),
                        details: Some("Tutti gli elementi rimossi sono stati eliminati definitivamente.".to_string()),
                        data: Some("Cestino svuotato".to_string()),
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: false,
                    }
                } else {
                    let err = String::from_utf8_lossy(&output.stderr).to_string();
                    WindowsToolResult {
                        status: "failed".to_string(),
                        message: "Impossibile svuotare il Cestino.".to_string(),
                        details: Some(err),
                        data: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: false,
                    }
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Errore durante lo svuotamento del Cestino: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Query non-distruttiva dello stato dell'ibernazione Windows
    pub fn get_hibernate_status_native() -> WindowsToolResult<HibernateStatus> {
        let start = Instant::now();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut enabled = false;

        if let Ok(power_key) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Control\\Power") {
            if let Ok(val) = power_key.get_value::<u32, _>("HibernateEnabled") {
                enabled = val != 0;
            }
        }

        // Verifica dimensione effettiva di C:\hiberfil.sys se esistente
        let hiber_path = std::path::Path::new("C:\\hiberfil.sys");
        let file_size_gb = if hiber_path.exists() {
            if let Ok(meta) = std::fs::metadata(hiber_path) {
                Some(meta.len() as f64 / (1024.0 * 1024.0 * 1024.0))
            } else {
                None
            }
        } else {
            None
        };

        WindowsToolResult {
            status: "success".to_string(),
            message: if enabled {
                "L'ibernazione di Windows è attualmente attiva.".to_string()
            } else {
                "L'ibernazione di Windows è disattivata.".to_string()
            },
            details: Some(if enabled {
                format!(
                    "Il file hiberfil.sys occupa spazio su disco{} per consentire l'ibernazione e l'avvio rapido.",
                    file_size_gb.map(|gb| format!(" (circa {:.1} GB)", gb)).unwrap_or_default()
                )
            } else {
                "Lo spazio su disco dedicato a hiberfil.sys è stato liberato.".to_string()
            }),
            data: Some(HibernateStatus {
                enabled,
                file_size_gb,
                can_toggle: true,
                details: None,
            }),
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: false,
        }
    }

    /// Abilita o disabilita l'ibernazione di Windows (powercfg /hibernate on|off) con UAC
    pub fn set_hibernate_enabled_native(enable: bool) -> WindowsToolResult<String> {
        let start = Instant::now();
        let cmd_str = if enable { "powercfg.exe /hibernate on" } else { "powercfg.exe /hibernate off" };
        let is_admin = is_current_process_elevated();

        if is_admin {
            let output = match Command::new("powercfg.exe")
                .arg("/hibernate")
                .arg(if enable { "on" } else { "off" })
                .creation_flags(CREATE_NO_WINDOW)
                .output()
            {
                Ok(o) => o,
                Err(e) => {
                    return WindowsToolResult {
                        status: "failed".to_string(),
                        message: format!("Impossibile eseguire powercfg: {}", e),
                        details: None,
                        data: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: true,
                    };
                }
            };

            if output.status.success() {
                WindowsToolResult {
                    status: "success".to_string(),
                    message: if enable {
                        "Ibernazione di Windows abilitata con successo.".to_string()
                    } else {
                        "Ibernazione di Windows disabilitata (file hiberfil.sys rimosso).".to_string()
                    },
                    details: None,
                    data: Some(if enable { "hibernate on".to_string() } else { "hibernate off".to_string() }),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                }
            } else {
                let err = String::from_utf8_lossy(&output.stderr).to_string();
                WindowsToolResult {
                    status: "failed".to_string(),
                    message: "Modifica stato ibernazione non riuscita.".to_string(),
                    details: Some(err),
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                }
            }
        } else {
            let (status, msg, details, _code) = run_powershell_elevated_uac(cmd_str);
            WindowsToolResult {
                status,
                message: msg,
                details: Some(details),
                data: Some(if enable { "hibernate on".to_string() } else { "hibernate off".to_string() }),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        }
    }

    /// Avvia lo strumento nativo di sistema Pulizia Disco di Windows (cleanmgr.exe)
    pub fn open_cleanmgr_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        match Command::new("cleanmgr.exe").spawn() {
            Ok(_) => WindowsToolResult {
                status: "success".to_string(),
                message: "Strumento Pulizia disco di Windows avviato con successo.".to_string(),
                details: Some("Utilizza l'interfaccia di Windows visualizzata per selezionare i file temporanei e procedere alla rimozione.".to_string()),
                data: Some("cleanmgr launched".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile avviare cleanmgr.exe: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Verifica non distruttiva dell'integrità dei file di sistema Windows (sfc /verifyonly)
    pub fn verify_system_files_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let is_admin = is_current_process_elevated();

        if is_admin {
            let output = match Command::new("sfc.exe")
                .arg("/verifyonly")
                .creation_flags(CREATE_NO_WINDOW)
                .output()
            {
                Ok(o) => o,
                Err(e) => {
                    return WindowsToolResult {
                        status: "failed".to_string(),
                        message: format!("Impossibile avviare sfc.exe: {}", e),
                        details: None,
                        data: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: true,
                    };
                }
            };

            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let is_clean = stdout.contains("did not find any integrity violations")
                || stdout.contains("nessuna violazione di integrità");

            WindowsToolResult {
                status: if is_clean { "success".to_string() } else { "warning".to_string() },
                message: if is_clean {
                    "Nessuna violazione di integrità rilevata nei file di sistema Windows.".to_string()
                } else {
                    "Rilevate possibili anomalie nei file di sistema Windows.".to_string()
                },
                details: Some(stdout),
                data: Some("sfc verify completed".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        } else {
            let (status, msg, details, _code) = run_powershell_elevated_uac("sfc.exe /verifyonly");
            WindowsToolResult {
                status,
                message: msg,
                details: Some(details),
                data: Some("sfc verify executed".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        }
    }

    /// Scansione non distruttiva online del volume NTFS (chkdsk <Drive>: /scan)
    pub fn check_disk_readonly_native(drive_letter: &str) -> WindowsToolResult<String> {
        let start = Instant::now();
        let clean_letter = drive_letter.replace(':', "").trim().to_uppercase();
        if clean_letter.len() != 1 || !clean_letter.chars().next().unwrap().is_ascii_alphabetic() {
            return WindowsToolResult {
                status: "failed".to_string(),
                message: "Lettera di unità non valida.".to_string(),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            };
        }

        let is_admin = is_current_process_elevated();
        let cmd_str = format!("chkdsk.exe {}: /scan", clean_letter);

        if is_admin {
            let output = match Command::new("chkdsk.exe")
                .args([&format!("{}:", clean_letter), "/scan"])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
            {
                Ok(o) => o,
                Err(e) => {
                    return WindowsToolResult {
                        status: "failed".to_string(),
                        message: format!("Impossibile avviare chkdsk: {}", e),
                        details: None,
                        data: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                        requires_elevation: true,
                    };
                }
            };

            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let has_problems = stdout.contains("Windows found problems") || stdout.contains("rilevato problemi");

            WindowsToolResult {
                status: if has_problems { "warning".to_string() } else { "success".to_string() },
                message: if has_problems {
                    format!("Rilevate anomalie nel file system del volume {}:.", clean_letter)
                } else {
                    format!("File system del volume {}: integro, nessuna anomalia rilevata.", clean_letter)
                },
                details: Some(stdout),
                data: Some(format!("chkdsk {}: completed", clean_letter)),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        } else {
            let (status, msg, details, _code) = run_powershell_elevated_uac(&cmd_str);
            WindowsToolResult {
                status,
                message: msg,
                details: Some(details),
                data: Some(format!("chkdsk {}: executed", clean_letter)),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: true,
            }
        }
    }
}

// --- COMANDI TAURI ESPOSTI AL FRONTEND ---

#[tauri::command]
pub async fn check_system_elevation() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::is_current_process_elevated())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub async fn scan_storage_volumes() -> Result<WindowsToolResult<Vec<VolumeDriveInfo>>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::scan_storage_volumes_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile esclusivamente su Windows 10/11.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn query_trim_config() -> Result<WindowsToolResult<TrimConfigStatus>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_trim_config_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn run_ssd_trim(drive_letter: String) -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::run_ssd_trim_native(&drive_letter))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: true,
        })
    }
}

#[tauri::command]
pub async fn query_recycle_bin() -> Result<WindowsToolResult<RecycleBinInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_recycle_bin_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn empty_recycle_bin(drive_letter: Option<String>) -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::empty_recycle_bin_native(drive_letter))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn get_hibernate_status() -> Result<WindowsToolResult<HibernateStatus>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::get_hibernate_status_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn set_hibernate_enabled(enabled: bool) -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::set_hibernate_enabled_native(enabled))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: true,
        })
    }
}

#[tauri::command]
pub async fn open_disk_cleanup() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::open_cleanmgr_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: false,
        })
    }
}

#[tauri::command]
pub async fn verify_system_files() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::verify_system_files_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: true,
        })
    }
}

#[tauri::command]
pub async fn check_disk_readonly(drive_letter: String) -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::check_disk_readonly_native(&drive_letter))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(WindowsToolResult {
            status: "not_supported".to_string(),
            message: "Disponibile solo su Windows.".to_string(),
            details: None,
            data: None,
            duration_ms: 0,
            requires_elevation: true,
        })
    }
}
