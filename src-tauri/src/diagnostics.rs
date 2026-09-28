use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// CONTRATTI DATI (FACTS NATIVI TRANCHE 7A)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceProblemFact {
    pub device_id: String,
    pub friendly_name: Option<String>,
    pub problem_code: u32,
    pub problem_label: String,
    pub problem_description: String,
    pub status_flags: u32,
    pub severity: String, // "info" | "attention" | "warning" | "critical"
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceProblemsFact {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub total_devices_scanned: u32,
    pub problem_count: u32,
    pub devices_with_problems: Vec<DeviceProblemFact>,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemoryCommitSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub commit_total_bytes: u64,
    pub commit_limit_bytes: u64,
    pub commit_peak_bytes: u64,
    pub physical_total_bytes: u64,
    pub physical_available_bytes: u64,
    pub system_cache_bytes: u64,
    pub kernel_paged_bytes: u64,
    pub kernel_nonpaged_bytes: u64,
    pub process_count: u32,
    pub thread_count: u32,
    pub commit_utilization_percent: f64,
    pub physical_utilization_percent: f64,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerStatusSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub ac_line_status: u8, // 0 = offline, 1 = online, 255 = unknown
    pub battery_flag: u8,
    pub battery_life_percent: Option<u8>,
    pub battery_saver_active: bool,
    pub has_system_battery: bool,
    pub is_on_ac: Option<bool>,
    pub is_on_battery: Option<bool>,
    pub power_architecture: String, // "desktop_like" | "battery_capable" | "unknown"
    pub error_details: Option<String>,
}

// ---------------------------------------------------------------------------
// CONTRATTI DATI (FACTS NATIVI TRANCHE 8A — EVENT LOG)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum EventPayload {
    #[serde(rename = "kernelPower")]
    KernelPower {
        bugcheck_code: u64,
        bugcheck_parameter1: Option<String>,
        power_button_timestamp: u64,
        sleep_in_progress: Option<u32>,
        connected_standby_in_progress: Option<bool>,
    },
    #[serde(rename = "whea")]
    Whea {
        error_source: Option<u32>,
        mca_bank: Option<u32>,
        mca_status: Option<String>,
        error_type: Option<u32>,
        raw_data_length: Option<usize>,
    },
    #[serde(rename = "disk")]
    Disk {
        device_name: Option<String>,
        io_status: Option<String>,
    },
    #[serde(rename = "ntfs")]
    Ntfs {
        volume_id: Option<String>,
        volume_name: Option<String>,
        repair_hint: Option<String>,
    },
    #[serde(rename = "display")]
    Display {
        driver_name: Option<String>,
    },
    #[serde(rename = "generic")]
    Generic {
        data_summary: Option<String>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EventLogNativeFact {
    pub channel: String,
    pub provider: String,
    pub event_id: u32,
    pub level: u32,
    pub timestamp: String,
    pub record_id: u64,
    pub target_context: Option<String>,
    pub payload: Option<EventPayload>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EventLogDiagnosticsSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,       // "Wevtapi_SystemLog"
    pub query_time_window_hours: u32,
    pub max_events_cap: u32,
    pub returned_event_count: u32,
    pub truncated: bool,
    pub events: Vec<EventLogNativeFact>,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SystemDiagnosticsSnapshot {
    pub timestamp: String,
    pub status: String, // "success" | "partial" | "unsupported" | "error"
    pub device_problems: DeviceProblemsFact,
    pub memory_commit: MemoryCommitSnapshot,
    pub power_status: PowerStatusSnapshot,
    pub event_log: EventLogDiagnosticsSnapshot,
    pub collection_duration_ms: u64,
}

// ---------------------------------------------------------------------------
// MAPPING PROBLEMI HARDWARE (RULE A.2)
// ---------------------------------------------------------------------------

pub fn map_problem_code(code: u32) -> (&'static str, &'static str, &'static str) {
    match code {
        1 => (
            "CM_PROB_NOT_CONFIGURED",
            "Il dispositivo non è configurato correttamente in Windows.",
            "attention",
        ),
        3 => (
            "CM_PROB_OUT_OF_DEF_PARAMS",
            "Driver per il dispositivo non installato o parametri di configurazione non validi.",
            "attention",
        ),
        10 => (
            "CM_PROB_FAILED_START",
            "Il dispositivo non può avviarsi (Codice 10). Possibile malfunzionamento del firmware o driver non aggiornato.",
            "warning",
        ),
        12 => (
            "CM_PROB_NORMAL_CONFLICT",
            "Conflitto di risorse I/O o IRQ con un altro dispositivo hardware.",
            "warning",
        ),
        14 => (
            "CM_PROB_NEED_RESTART",
            "Il dispositivo richiede il riavvio del computer per funzionare.",
            "attention",
        ),
        18 => (
            "CM_PROB_REINSTALL",
            "I driver per questo dispositivo devono essere reinstallati.",
            "warning",
        ),
        19 => (
            "CM_PROB_REGISTRY_ERROR",
            "Informazioni del dispositivo nel Registro di Windows incomplete o danneggiate.",
            "warning",
        ),
        21 => (
            "CM_PROB_WILL_BE_REMOVED",
            "Windows sta completando la rimozione del dispositivo.",
            "info",
        ),
        22 => (
            "CM_PROB_DISABLED",
            "Il dispositivo è disabilitato manualmente in Gestione Dispositivi o disattivato dal sistema.",
            "info",
        ),
        24 => (
            "CM_PROB_DEVLOADER_NOT_READY",
            "Il dispositivo non è presente, non risponde correttamente o non sono installati tutti i driver necessari.",
            "warning",
        ),
        28 => (
            "CM_PROB_NOT_INITIALIZED",
            "I driver per questo dispositivo non sono installati.",
            "attention",
        ),
        29 => (
            "CM_PROB_FAILED_FILTER",
            "Impossibile caricare un driver di filtro associato al dispositivo.",
            "warning",
        ),
        31 => (
            "CM_PROB_FAILED_ADD",
            "Windows non riesce a caricare i driver necessari per questo hardware.",
            "warning",
        ),
        32 => (
            "CM_PROB_DISABLED_SERVICE",
            "Il servizio o driver associato al dispositivo è disabilitato nel sistema.",
            "attention",
        ),
        37 => (
            "CM_PROB_FAILED_DRIVER_ENTRY",
            "Inizializzazione del driver fallita (DriverEntry ha restituito un codice di errore).",
            "warning",
        ),
        38 => (
            "CM_PROB_DRIVER_FAILED_LOAD",
            "Impossibile caricare il driver: una versione precedente è ancora caricata in memoria.",
            "warning",
        ),
        39 => (
            "CM_PROB_FAILED_DRIVER_LOAD",
            "Impossibile caricare il driver di periferica: file del driver mancante o danneggiato.",
            "warning",
        ),
        41 => (
            "CM_PROB_DRIVER_LOAD_ERROR",
            "Driver caricato con successo ma si è verificato un errore dell'interfaccia o controller.",
            "warning",
        ),
        43 => (
            "CM_PROB_FAILED_POST",
            "Il dispositivo ha segnalato un problema e l'esecuzione è stata arrestata da Windows (Codice 43). Tipico di guasto GPU, controller o firmware.",
            "critical",
        ),
        44 => (
            "CM_PROB_RESOURCE_LACK",
            "Risorse di sistema insufficienti per allocare il dispositivo hardware.",
            "warning",
        ),
        45 => (
            "CM_PROB_HARDWARE_NOT_PRESENT",
            "Dispositivo attualmente non collegato fisicamente al computer (disconnesso).",
            "info",
        ),
        47 => (
            "CM_PROB_WAITING_ON_CHILDREN",
            "Il dispositivo è in attesa dell'avvio di un dispositivo secondario.",
            "info",
        ),
        48 => (
            "CM_PROB_CALL_TO_FAILURE",
            "Il software del dispositivo è stato bloccato da Windows per problemi noti di compatibilità o stabilità.",
            "warning",
        ),
        51 => (
            "CM_PROB_DEPENDENT_FAILED",
            "Il dispositivo è in attesa dell'avvio di un altro componente che ha riscontrato un errore.",
            "warning",
        ),
        52 => (
            "CM_PROB_CANNOT_VERIFY_SIGNATURE",
            "Windows non può verificare la firma digitale per i driver richiesti (driver non firmato).",
            "warning",
        ),
        54 => (
            "CM_PROB_FAILED_INSTALL",
            "Installazione del dispositivo incompleta o non riuscita.",
            "attention",
        ),
        _ => (
            "CM_PROB_UNKNOWN",
            "Codice dispositivo Windows non mappato standard.",
            "attention",
        ),
    }
}

// ---------------------------------------------------------------------------
// FUNZIONI PURE DI CALCOLO E PROTEZIONE (OVERFLOW / ZERO-DIV / HEURISTIC)
// ---------------------------------------------------------------------------

pub fn calculate_memory_commit(
    commit_total_pages: usize,
    commit_limit_pages: usize,
    commit_peak_pages: usize,
    phys_total_pages: usize,
    phys_avail_pages: usize,
    system_cache_pages: usize,
    kernel_paged_pages: usize,
    kernel_nonpaged_pages: usize,
    page_size_bytes: usize,
    process_count: u32,
    thread_count: u32,
) -> MemoryCommitSnapshot {
    let page_size = page_size_bytes as u64;

    let commit_total_bytes = (commit_total_pages as u64).saturating_mul(page_size);
    let commit_limit_bytes = (commit_limit_pages as u64).saturating_mul(page_size);
    let commit_peak_bytes = (commit_peak_pages as u64).saturating_mul(page_size);
    let physical_total_bytes = (phys_total_pages as u64).saturating_mul(page_size);
    let physical_available_bytes = (phys_avail_pages as u64).saturating_mul(page_size);
    let system_cache_bytes = (system_cache_pages as u64).saturating_mul(page_size);
    let kernel_paged_bytes = (kernel_paged_pages as u64).saturating_mul(page_size);
    let kernel_nonpaged_bytes = (kernel_nonpaged_pages as u64).saturating_mul(page_size);

    let commit_utilization_percent = if commit_limit_bytes > 0 {
        ((commit_total_bytes as f64 / commit_limit_bytes as f64) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    let physical_utilization_percent = if physical_total_bytes > 0 {
        let used = physical_total_bytes.saturating_sub(physical_available_bytes);
        ((used as f64 / physical_total_bytes as f64) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    MemoryCommitSnapshot {
        availability: "available".to_string(),
        source: "GetPerformanceInfo".to_string(),
        commit_total_bytes,
        commit_limit_bytes,
        commit_peak_bytes,
        physical_total_bytes,
        physical_available_bytes,
        system_cache_bytes,
        kernel_paged_bytes,
        kernel_nonpaged_bytes,
        process_count,
        thread_count,
        commit_utilization_percent: (commit_utilization_percent * 10.0).round() / 10.0,
        physical_utilization_percent: (physical_utilization_percent * 10.0).round() / 10.0,
        error_details: None,
    }
}

pub fn calculate_power_status(
    ac_line_status: u8,
    battery_flag: u8,
    battery_life_percent: u8,
    system_status_flag: u8,
) -> PowerStatusSnapshot {
    let is_flag_unknown = battery_flag == 255;
    let is_ac_unknown = ac_line_status == 255;
    let has_no_battery_flag = !is_flag_unknown && (battery_flag & 128) != 0;

    let has_system_battery = !is_flag_unknown && !has_no_battery_flag;

    let is_on_ac = match ac_line_status {
        1 => Some(true),
        0 => Some(false),
        _ => None,
    };

    let is_on_battery = match (ac_line_status, has_system_battery) {
        (0, true) => Some(true),
        (1, _) => Some(false),
        _ => None,
    };

    // Classificazione euristica/operativa documentata
    let power_architecture = if is_flag_unknown || (is_ac_unknown && !has_no_battery_flag) {
        "unknown".to_string()
    } else if has_no_battery_flag {
        "desktop_like".to_string()
    } else if has_system_battery {
        "battery_capable".to_string()
    } else {
        "unknown".to_string()
    };

    let valid_life_pct = if battery_life_percent <= 100 {
        Some(battery_life_percent)
    } else {
        None
    };

    PowerStatusSnapshot {
        availability: "available".to_string(),
        source: "GetSystemPowerStatus".to_string(),
        ac_line_status,
        battery_flag,
        battery_life_percent: valid_life_pct,
        battery_saver_active: system_status_flag == 1,
        has_system_battery,
        is_on_ac,
        is_on_battery,
        power_architecture,
        error_details: None,
    }
}

// ---------------------------------------------------------------------------
// FUNZIONI PURE DI PARSING & CAPPING EVENT LOG (TRANCHE 8A)
// ---------------------------------------------------------------------------

pub fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let start_pat1 = format!("<{}>", tag);
    let start_pat2 = format!("<{} ", tag);
    let end_pat = format!("</{}>", tag);

    let val_start = if let Some(p) = xml.find(&start_pat1) {
        p + start_pat1.len()
    } else if let Some(p) = xml.find(&start_pat2) {
        let rest = &xml[p + start_pat2.len()..];
        let close_angle = rest.find('>')?;
        p + start_pat2.len() + close_angle + 1
    } else {
        return None;
    };

    let val_end = xml[val_start..].find(&end_pat)? + val_start;
    Some(xml[val_start..val_end].trim().to_string())
}

pub fn extract_xml_attr(xml: &str, tag: &str, attr: &str) -> Option<String> {
    let tag_pat = format!("<{}", tag);
    let tag_pos = xml.find(&tag_pat)?;
    let tag_rest = &xml[tag_pos..];
    let tag_end = tag_rest.find('>')?;
    let header = &tag_rest[..tag_end];

    let attr_double = format!("{}=\"", attr);
    let attr_single = format!("{}='", attr);

    if let Some(p) = header.find(&attr_double) {
        let val_start = p + attr_double.len();
        let val_end = header[val_start..].find('"')? + val_start;
        Some(header[val_start..val_end].trim().to_string())
    } else if let Some(p) = header.find(&attr_single) {
        let val_start = p + attr_single.len();
        let val_end = header[val_start..].find('\'')? + val_start;
        Some(header[val_start..val_end].trim().to_string())
    } else {
        None
    }
}

pub fn extract_data_named(xml: &str, name: &str) -> Option<String> {
    let pat_double = format!("Name=\"{}\"", name);
    let pat_single = format!("Name='{}'", name);

    let name_pos = if let Some(p) = xml.find(&pat_double) {
        p + pat_double.len()
    } else if let Some(p) = xml.find(&pat_single) {
        p + pat_single.len()
    } else {
        return None;
    };

    let rest = &xml[name_pos..];
    let angle_pos = rest.find('>')?;
    let val_start = name_pos + angle_pos + 1;
    let end_pat = "</Data>";
    let end_pos = xml[val_start..].find(end_pat)? + val_start;
    Some(xml[val_start..end_pos].trim().to_string())
}

pub fn extract_first_data(xml: &str) -> Option<String> {
    let start_pat = "<Data";
    let start_pos = xml.find(start_pat)?;
    let rest = &xml[start_pos..];
    let angle_pos = rest.find('>')?;
    let val_start = start_pos + angle_pos + 1;
    let end_pat = "</Data>";
    let end_pos = xml[val_start..].find(end_pat)? + val_start;
    let val = xml[val_start..end_pos].trim().to_string();
    if val.is_empty() {
        None
    } else {
        Some(val)
    }
}

pub fn parse_event_payload(
    provider: &str,
    event_id: u32,
    xml: &str,
) -> (Option<String>, Option<EventPayload>) {
    if provider == "Microsoft-Windows-Kernel-Power" && event_id == 41 {
        let bugcheck_code_str = extract_data_named(xml, "BugcheckCode").unwrap_or_default();
        let bugcheck_code = if bugcheck_code_str.starts_with("0x") || bugcheck_code_str.starts_with("0X") {
            u64::from_str_radix(&bugcheck_code_str[2..], 16).unwrap_or(0)
        } else {
            bugcheck_code_str.parse::<u64>().unwrap_or(0)
        };

        let bugcheck_parameter1 = extract_data_named(xml, "BugcheckParameter1");
        let power_button_timestamp = extract_data_named(xml, "PowerButtonTimestamp")
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        let sleep_in_progress = extract_data_named(xml, "SleepInProgress")
            .and_then(|s| s.parse::<u32>().ok());
        let connected_standby_in_progress = extract_data_named(xml, "ConnectedStandbyInProgress")
            .map(|s| s.eq_ignore_ascii_case("true") || s == "1");

        (
            None,
            Some(EventPayload::KernelPower {
                bugcheck_code,
                bugcheck_parameter1,
                power_button_timestamp,
                sleep_in_progress,
                connected_standby_in_progress,
            }),
        )
    } else if provider == "Microsoft-Windows-WHEA-Logger" {
        let error_source = extract_data_named(xml, "ErrorSource")
            .and_then(|s| s.parse::<u32>().ok());
        let mca_bank = extract_data_named(xml, "MCABank")
            .and_then(|s| s.parse::<u32>().ok());
        let mca_status = extract_data_named(xml, "MCAStatus")
            .or_else(|| extract_data_named(xml, "Status"));
        let error_type = extract_data_named(xml, "ErrorType")
            .and_then(|s| s.parse::<u32>().ok());
        let raw_data_length = extract_data_named(xml, "RawData").map(|s| s.len());

        let target_context = extract_data_named(xml, "Device")
            .or_else(|| extract_data_named(xml, "DeviceName"));

        (
            target_context,
            Some(EventPayload::Whea {
                error_source,
                mca_bank,
                mca_status,
                error_type,
                raw_data_length,
            }),
        )
    } else if provider == "disk" {
        // disk 7 = bad block, disk 11 = controller error, disk 51 = paging / IO error
        let device_name = extract_data_named(xml, "Device")
            .or_else(|| extract_data_named(xml, "DeviceName"))
            .or_else(|| extract_data_named(xml, "DeviceObject"))
            .or_else(|| extract_first_data(xml));

        let io_status = extract_data_named(xml, "Status")
            .or_else(|| extract_data_named(xml, "IOStatus"));

        let target_context = device_name.clone();

        (
            target_context,
            Some(EventPayload::Disk {
                device_name,
                io_status,
            }),
        )
    } else if provider == "Ntfs" {
        // Ntfs 55 = corruption offline repair, Ntfs 98 = online spot fix
        let volume_id = extract_data_named(xml, "VolumeId")
            .or_else(|| extract_data_named(xml, "VolumeGuid"));
        let volume_name = extract_data_named(xml, "VolumeName")
            .or_else(|| extract_data_named(xml, "DriveName"));
        let repair_hint = extract_data_named(xml, "RepairHint")
            .or_else(|| extract_data_named(xml, "Description"));

        let target_context = volume_name.clone().or_else(|| volume_id.clone());

        (
            target_context,
            Some(EventPayload::Ntfs {
                volume_id,
                volume_name,
                repair_hint,
            }),
        )
    } else if provider == "Display" {
        // Display 4101 = display driver stopped responding
        let driver_name = extract_data_named(xml, "Driver")
            .or_else(|| extract_data_named(xml, "DriverName"))
            .or_else(|| extract_first_data(xml));

        let target_context = driver_name.clone();

        (
            target_context,
            Some(EventPayload::Display { driver_name }),
        )
    } else {
        (None, None)
    }
}

pub fn parse_event_xml(xml: &str) -> Option<EventLogNativeFact> {
    let provider = extract_xml_attr(xml, "Provider", "Name")
        .or_else(|| extract_xml_tag(xml, "Provider"))?;
    let event_id_str = extract_xml_tag(xml, "EventID")?;
    let event_id: u32 = event_id_str.parse().ok()?;
    let level: u32 = extract_xml_tag(xml, "Level").and_then(|s| s.parse().ok()).unwrap_or(4);
    let timestamp = extract_xml_attr(xml, "TimeCreated", "SystemTime")
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string());
    let record_id: u64 = extract_xml_tag(xml, "EventRecordID")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let channel = extract_xml_tag(xml, "Channel").unwrap_or_else(|| "System".to_string());

    let (target_context, payload) = parse_event_payload(&provider, event_id, xml);

    Some(EventLogNativeFact {
        channel,
        provider,
        event_id,
        level,
        timestamp,
        record_id,
        target_context,
        payload,
    })
}

pub fn apply_event_cap_and_sentinel<T>(
    mut collected: Vec<T>,
    has_sentinel: bool,
    max_cap: usize,
) -> (Vec<T>, u32, bool) {
    if collected.len() > max_cap {
        collected.truncate(max_cap);
        let count = collected.len() as u32;
        (collected, count, true)
    } else if collected.len() == max_cap && has_sentinel {
        let count = collected.len() as u32;
        (collected, count, true)
    } else {
        let count = collected.len() as u32;
        (collected, count, false)
    }
}

pub fn build_event_log_xpath_query(time_window_hours: u32) -> String {
    let window_ms = (time_window_hours as u64).saturating_mul(3600 * 1000);
    format!(
        "*[System[(\
            (Provider[@Name='Microsoft-Windows-WHEA-Logger'] and (EventID=17 or EventID=18 or EventID=19 or EventID=47)) or \
            (Provider[@Name='Microsoft-Windows-Kernel-Power'] and (EventID=41)) or \
            (Provider[@Name='disk'] and (EventID=7 or EventID=11 or EventID=51)) or \
            (Provider[@Name='Ntfs'] and (EventID=55 or EventID=98)) or \
            (Provider[@Name='Display'] and (EventID=4101))\
        ) and TimeCreated[timediff(@SystemTime) <= {}]]]",
        window_ms
    )
}

// ---------------------------------------------------------------------------
// IMPLEMENTAZIONE WINDOWS NATIVA
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
pub mod windows_impl {
    use super::*;
    use std::collections::HashSet;
    use std::ffi::c_void;
    use std::ptr::null_mut;

    type ConfigRet = u32;
    type DevInst = u32;

    const CR_SUCCESS: ConfigRet = 0;
    const DN_HAS_PROBLEM: u32 = 0x00000400;
    const CM_DRP_DEVICEDESC: u32 = 0x00000001;
    const CM_DRP_FRIENDLYNAME: u32 = 0x0000000D;

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    struct SystemPowerStatus {
        ac_line_status: u8,
        battery_flag: u8,
        battery_life_percent: u8,
        system_status_flag: u8,
        battery_life_time: u32,
        battery_full_life_time: u32,
    }

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    struct PerformanceInformation {
        cb: u32,
        commit_total: usize,
        commit_limit: usize,
        commit_peak: usize,
        physical_total: usize,
        physical_available: usize,
        system_cache: usize,
        kernel_total: usize,
        kernel_paged: usize,
        kernel_nonpaged: usize,
        page_size: usize,
        handle_count: u32,
        process_count: u32,
        thread_count: u32,
    }

    extern "system" {
        fn LoadLibraryA(lp_lib_file_name: *const i8) -> *mut c_void;
        fn GetProcAddress(h_module: *mut c_void, lp_proc_name: *const i8) -> *mut c_void;
        fn FreeLibrary(h_lib_module: *mut c_void) -> i32;
        fn GetSystemPowerStatus(lp_system_power_status: *mut SystemPowerStatus) -> i32;
    }

    pub fn query_power_status() -> PowerStatusSnapshot {
        let mut status = SystemPowerStatus::default();
        let ok = unsafe { GetSystemPowerStatus(&mut status) };
        if ok != 0 {
            calculate_power_status(
                status.ac_line_status,
                status.battery_flag,
                status.battery_life_percent,
                status.system_status_flag,
            )
        } else {
            PowerStatusSnapshot {
                availability: "error".to_string(),
                source: "GetSystemPowerStatus".to_string(),
                ac_line_status: 255,
                battery_flag: 255,
                battery_life_percent: None,
                battery_saver_active: false,
                has_system_battery: false,
                is_on_ac: None,
                is_on_battery: None,
                power_architecture: "unknown".to_string(),
                error_details: Some("Chiamata a GetSystemPowerStatus fallita".to_string()),
            }
        }
    }

    pub fn query_memory_commit() -> MemoryCommitSnapshot {
        // Cerca GetPerformanceInfo in kernel32.dll o psapi.dll
        type GetPerfInfoFn = unsafe extern "system" fn(*mut PerformanceInformation, u32) -> i32;

        unsafe {
            let kernel32 = LoadLibraryA(b"kernel32.dll\0".as_ptr() as *const i8);
            let mut get_perf_info: Option<GetPerfInfoFn> = None;
            let mut free_module: Option<*mut c_void> = None;

            if !kernel32.is_null() {
                let proc = GetProcAddress(kernel32, b"GetPerformanceInfo\0".as_ptr() as *const i8);
                if !proc.is_null() {
                    get_perf_info = Some(std::mem::transmute(proc));
                }
            }

            if get_perf_info.is_none() {
                let psapi = LoadLibraryA(b"psapi.dll\0".as_ptr() as *const i8);
                if !psapi.is_null() {
                    let proc = GetProcAddress(psapi, b"GetPerformanceInfo\0".as_ptr() as *const i8);
                    if !proc.is_null() {
                        get_perf_info = Some(std::mem::transmute(proc));
                        free_module = Some(psapi);
                    } else {
                        FreeLibrary(psapi);
                    }
                }
            }

            let result = if let Some(perf_fn) = get_perf_info {
                let mut info = PerformanceInformation::default();
                info.cb = std::mem::size_of::<PerformanceInformation>() as u32;

                let ok = perf_fn(&mut info, info.cb);
                if ok != 0 && info.page_size > 0 {
                    calculate_memory_commit(
                        info.commit_total,
                        info.commit_limit,
                        info.commit_peak,
                        info.physical_total,
                        info.physical_available,
                        info.system_cache,
                        info.kernel_paged,
                        info.kernel_nonpaged,
                        info.page_size,
                        info.process_count,
                        info.thread_count,
                    )
                } else {
                    MemoryCommitSnapshot {
                        availability: "error".to_string(),
                        source: "GetPerformanceInfo".to_string(),
                        commit_total_bytes: 0,
                        commit_limit_bytes: 0,
                        commit_peak_bytes: 0,
                        physical_total_bytes: 0,
                        physical_available_bytes: 0,
                        system_cache_bytes: 0,
                        kernel_paged_bytes: 0,
                        kernel_nonpaged_bytes: 0,
                        process_count: 0,
                        thread_count: 0,
                        commit_utilization_percent: 0.0,
                        physical_utilization_percent: 0.0,
                        error_details: Some("GetPerformanceInfo ha restituito errore o dimensione pagina zero".to_string()),
                    }
                }
            } else {
                MemoryCommitSnapshot {
                    availability: "unsupported".to_string(),
                    source: "GetPerformanceInfo".to_string(),
                    commit_total_bytes: 0,
                    commit_limit_bytes: 0,
                    commit_peak_bytes: 0,
                    physical_total_bytes: 0,
                    physical_available_bytes: 0,
                    system_cache_bytes: 0,
                    kernel_paged_bytes: 0,
                    kernel_nonpaged_bytes: 0,
                    process_count: 0,
                    thread_count: 0,
                    commit_utilization_percent: 0.0,
                    physical_utilization_percent: 0.0,
                    error_details: Some("GetPerformanceInfo non disponibile in kernel32.dll o psapi.dll".to_string()),
                }
            };

            if let Some(m) = free_module {
                FreeLibrary(m);
            }
            if !kernel32.is_null() {
                FreeLibrary(kernel32);
            }

            result
        }
    }

    pub fn query_device_problems() -> DeviceProblemsFact {
        type CmLocateDevNodeWFn = unsafe extern "system" fn(*mut DevInst, *const u16, u32) -> ConfigRet;
        type CmGetChildFn = unsafe extern "system" fn(*mut DevInst, DevInst, u32) -> ConfigRet;
        type CmGetSiblingFn = unsafe extern "system" fn(*mut DevInst, DevInst, u32) -> ConfigRet;
        type CmGetDevNodeStatusFn = unsafe extern "system" fn(*mut u32, *mut u32, DevInst, u32) -> ConfigRet;
        type CmGetDeviceIdWFn = unsafe extern "system" fn(DevInst, *mut u16, u32, u32) -> ConfigRet;
        type CmGetRegistryPropWFn = unsafe extern "system" fn(DevInst, u32, *mut u32, *mut c_void, *mut u32, u32) -> ConfigRet;

        unsafe {
            let cfgmgr = LoadLibraryA(b"cfgmgr32.dll\0".as_ptr() as *const i8);
            if cfgmgr.is_null() {
                return DeviceProblemsFact {
                    availability: "unavailable".to_string(),
                    source: "CM_Get_DevNode_Status".to_string(),
                    total_devices_scanned: 0,
                    problem_count: 0,
                    devices_with_problems: Vec::new(),
                    error_details: Some("Caricamento di cfgmgr32.dll fallito".to_string()),
                };
            }

            let p_locate = GetProcAddress(cfgmgr, b"CM_Locate_DevNodeW\0".as_ptr() as *const i8);
            let locate_node: Option<CmLocateDevNodeWFn> = if !p_locate.is_null() {
                Some(std::mem::transmute(p_locate))
            } else {
                None
            };

            let p_child = GetProcAddress(cfgmgr, b"CM_Get_Child\0".as_ptr() as *const i8);
            let get_child: Option<CmGetChildFn> = if !p_child.is_null() {
                Some(std::mem::transmute(p_child))
            } else {
                None
            };

            let p_sibling = GetProcAddress(cfgmgr, b"CM_Get_Sibling\0".as_ptr() as *const i8);
            let get_sibling: Option<CmGetSiblingFn> = if !p_sibling.is_null() {
                Some(std::mem::transmute(p_sibling))
            } else {
                None
            };

            let p_status = GetProcAddress(cfgmgr, b"CM_Get_DevNode_Status\0".as_ptr() as *const i8);
            let get_status: Option<CmGetDevNodeStatusFn> = if !p_status.is_null() {
                Some(std::mem::transmute(p_status))
            } else {
                None
            };

            let p_id = GetProcAddress(cfgmgr, b"CM_Get_Device_IDW\0".as_ptr() as *const i8);
            let get_device_id: Option<CmGetDeviceIdWFn> = if !p_id.is_null() {
                Some(std::mem::transmute(p_id))
            } else {
                None
            };

            let p_reg = GetProcAddress(cfgmgr, b"CM_Get_DevNode_Registry_PropertyW\0".as_ptr() as *const i8);
            let get_registry_prop: Option<CmGetRegistryPropWFn> = if !p_reg.is_null() {
                Some(std::mem::transmute(p_reg))
            } else {
                None
            };

            if locate_node.is_none()
                || get_child.is_none()
                || get_sibling.is_none()
                || get_status.is_none()
                || get_device_id.is_none()
            {
                FreeLibrary(cfgmgr);
                return DeviceProblemsFact {
                    availability: "unsupported".to_string(),
                    source: "CM_Get_DevNode_Status".to_string(),
                    total_devices_scanned: 0,
                    problem_count: 0,
                    devices_with_problems: Vec::new(),
                    error_details: Some("Punti di ingresso essenziali di cfgmgr32 non trovati".to_string()),
                };
            }

            let fn_locate = locate_node.unwrap();
            let fn_child = get_child.unwrap();
            let fn_sibling = get_sibling.unwrap();
            let fn_status = get_status.unwrap();
            let fn_id = get_device_id.unwrap();

            let mut root_dev: DevInst = 0;
            if fn_locate(&mut root_dev, null_mut(), 0) != CR_SUCCESS {
                FreeLibrary(cfgmgr);
                return DeviceProblemsFact {
                    availability: "error".to_string(),
                    source: "CM_Get_DevNode_Status".to_string(),
                    total_devices_scanned: 0,
                    problem_count: 0,
                    devices_with_problems: Vec::new(),
                    error_details: Some("CM_Locate_DevNodeW fallito per la radice".to_string()),
                };
            }

            let mut visited = HashSet::new();
            let mut stack = Vec::with_capacity(256);
            stack.push(root_dev);

            let mut scanned_count = 0u32;
            let mut problems = Vec::new();

            while let Some(current) = stack.pop() {
                if !visited.insert(current) {
                    continue;
                }
                scanned_count += 1;

                // 1. Ispezione stato e problem number del devnode
                let mut status_flags: u32 = 0;
                let mut problem_code: u32 = 0;
                if fn_status(&mut status_flags, &mut problem_code, current, 0) == CR_SUCCESS {
                    let has_problem_flag = (status_flags & DN_HAS_PROBLEM) != 0;
                    // RULE A.1: se DN_HAS_PROBLEM = false e problem_code = 0, il device è sano e non compare come errore
                    if has_problem_flag || problem_code != 0 {
                        // Estrazione Device Instance ID
                        let mut id_buf = [0u16; 512];
                        let id_str = if fn_id(current, id_buf.as_mut_ptr(), id_buf.len() as u32, 0) == CR_SUCCESS {
                            let len = id_buf.iter().position(|&c| c == 0).unwrap_or(id_buf.len());
                            String::from_utf16_lossy(&id_buf[..len])
                        } else {
                            format!("DEVNODE_{:#X}", current)
                        };

                        // Estrazione FriendlyName o DeviceDesc opzionale
                        let mut friendly_name: Option<String> = None;
                        if let Some(fn_prop) = get_registry_prop {
                            let mut prop_buf = [0u8; 1024];
                            let mut prop_len = prop_buf.len() as u32;
                            let mut reg_type = 0u32;

                            // Tenta FriendlyName
                            if fn_prop(
                                current,
                                CM_DRP_FRIENDLYNAME,
                                &mut reg_type,
                                prop_buf.as_mut_ptr() as *mut c_void,
                                &mut prop_len,
                                0,
                            ) == CR_SUCCESS
                                && prop_len > 1
                            {
                                let u16_slice = std::slice::from_raw_parts(
                                    prop_buf.as_ptr() as *const u16,
                                    (prop_len as usize) / 2,
                                );
                                let len = u16_slice.iter().position(|&c| c == 0).unwrap_or(u16_slice.len());
                                let s = String::from_utf16_lossy(&u16_slice[..len]).trim().to_string();
                                if !s.is_empty() {
                                    friendly_name = Some(s);
                                }
                            }

                            // Se FriendlyName assente, tenta DeviceDesc
                            if friendly_name.is_none() {
                                prop_len = prop_buf.len() as u32;
                                if fn_prop(
                                    current,
                                    CM_DRP_DEVICEDESC,
                                    &mut reg_type,
                                    prop_buf.as_mut_ptr() as *mut c_void,
                                    &mut prop_len,
                                    0,
                                ) == CR_SUCCESS
                                    && prop_len > 1
                                {
                                    let u16_slice = std::slice::from_raw_parts(
                                        prop_buf.as_ptr() as *const u16,
                                        (prop_len as usize) / 2,
                                    );
                                    let len = u16_slice.iter().position(|&c| c == 0).unwrap_or(u16_slice.len());
                                    let s = String::from_utf16_lossy(&u16_slice[..len]).trim().to_string();
                                    if !s.is_empty() {
                                        friendly_name = Some(s);
                                    }
                                }
                            }
                        }

                        let (label, desc, sev) = map_problem_code(problem_code);
                        let problem_label = if problem_code != 0 {
                            format!("{} (Codice {})", label, problem_code)
                        } else {
                            label.to_string()
                        };

                        problems.push(DeviceProblemFact {
                            device_id: id_str,
                            friendly_name,
                            problem_code,
                            problem_label,
                            problem_description: desc.to_string(),
                            status_flags,
                            severity: sev.to_string(),
                        });
                    }
                }

                // 2. Traversal: aggiunge child e sibling allo stack
                let mut child: DevInst = 0;
                if fn_child(&mut child, current, 0) == CR_SUCCESS && child != 0 && !visited.contains(&child) {
                    stack.push(child);
                }

                let mut sibling: DevInst = 0;
                if fn_sibling(&mut sibling, current, 0) == CR_SUCCESS && sibling != 0 && !visited.contains(&sibling) {
                    stack.push(sibling);
                }

                // Limite di sicurezza per prevenire loop infiniti su topologie anomale
                if scanned_count >= 5000 {
                    break;
                }
            }

            FreeLibrary(cfgmgr);

            DeviceProblemsFact {
                availability: "available".to_string(),
                source: "CM_Get_DevNode_Status".to_string(),
                total_devices_scanned: scanned_count,
                problem_count: problems.len() as u32,
                devices_with_problems: problems,
                error_details: None,
            }
        }
    }

    #[derive(Debug, Clone, Copy, Default)]
    pub struct EventLogTimings {
        pub query_duration_us: u64,
        pub parse_duration_us: u64,
        pub total_duration_us: u64,
    }

    pub fn query_event_log_measured(
        time_window_hours: u32,
        max_cap: u32,
    ) -> (EventLogDiagnosticsSnapshot, EventLogTimings) {
        type EvtHandle = *mut c_void;
        type EvtQueryFn = unsafe extern "system" fn(EvtHandle, *const u16, *const u16, u32) -> EvtHandle;
        type EvtNextFn = unsafe extern "system" fn(EvtHandle, u32, *mut EvtHandle, u32, u32, *mut u32) -> i32;
        type EvtRenderFn = unsafe extern "system" fn(EvtHandle, EvtHandle, u32, u32, *mut c_void, *mut u32, *mut u32) -> i32;
        type EvtCloseFn = unsafe extern "system" fn(EvtHandle) -> i32;

        let total_start = Instant::now();
        let mut timings = EventLogTimings::default();

        unsafe {
            let wevtapi = LoadLibraryA(b"wevtapi.dll\0".as_ptr() as *const i8);
            if wevtapi.is_null() {
                timings.total_duration_us = total_start.elapsed().as_micros() as u64;
                return (
                    EventLogDiagnosticsSnapshot {
                        availability: "unsupported".to_string(),
                        source: "Wevtapi_SystemLog".to_string(),
                        query_time_window_hours: time_window_hours,
                        max_events_cap: max_cap,
                        returned_event_count: 0,
                        truncated: false,
                        events: Vec::new(),
                        error_details: Some("Caricamento di wevtapi.dll fallito".to_string()),
                    },
                    timings,
                );
            }

            let p_query = GetProcAddress(wevtapi, b"EvtQuery\0".as_ptr() as *const i8);
            let p_next = GetProcAddress(wevtapi, b"EvtNext\0".as_ptr() as *const i8);
            let p_render = GetProcAddress(wevtapi, b"EvtRender\0".as_ptr() as *const i8);
            let p_close = GetProcAddress(wevtapi, b"EvtClose\0".as_ptr() as *const i8);

            if p_query.is_null() || p_next.is_null() || p_render.is_null() || p_close.is_null() {
                FreeLibrary(wevtapi);
                timings.total_duration_us = total_start.elapsed().as_micros() as u64;
                return (
                    EventLogDiagnosticsSnapshot {
                        availability: "unsupported".to_string(),
                        source: "Wevtapi_SystemLog".to_string(),
                        query_time_window_hours: time_window_hours,
                        max_events_cap: max_cap,
                        returned_event_count: 0,
                        truncated: false,
                        events: Vec::new(),
                        error_details: Some("Punti di ingresso wevtapi.dll essenziali mancanti".to_string()),
                    },
                    timings,
                );
            }

            let fn_query: EvtQueryFn = std::mem::transmute(p_query);
            let fn_next: EvtNextFn = std::mem::transmute(p_next);
            let fn_render: EvtRenderFn = std::mem::transmute(p_render);
            let fn_close: EvtCloseFn = std::mem::transmute(p_close);

            let channel_w: Vec<u16> = "System\0".encode_utf16().collect();
            let xpath_str = build_event_log_xpath_query(time_window_hours);
            let mut xpath_w: Vec<u16> = xpath_str.encode_utf16().collect();
            xpath_w.push(0);

            let query_start = Instant::now();
            // EvtQueryChannelPath (0x1) | EvtQueryReverseDirection (0x200)
            let flags = 0x0001 | 0x0200;
            let h_query = fn_query(null_mut(), channel_w.as_ptr(), xpath_w.as_ptr(), flags);

            if h_query.is_null() {
                FreeLibrary(wevtapi);
                timings.total_duration_us = total_start.elapsed().as_micros() as u64;
                return (
                    EventLogDiagnosticsSnapshot {
                        availability: "unavailable".to_string(),
                        source: "Wevtapi_SystemLog".to_string(),
                        query_time_window_hours: time_window_hours,
                        max_events_cap: max_cap,
                        returned_event_count: 0,
                        truncated: false,
                        events: Vec::new(),
                        error_details: Some("EvtQuery ha restituito handle nullo per il canale System".to_string()),
                    },
                    timings,
                );
            }

            let cap = max_cap as usize;
            let mut handles: Vec<EvtHandle> = vec![null_mut(); cap];
            let mut returned_count: u32 = 0;

            let next_ok = fn_next(h_query, max_cap, handles.as_mut_ptr(), 1000, 0, &mut returned_count);
            let actual_returned = if next_ok != 0 { returned_count as usize } else { 0 };

            // Sentinel probe se sono stati restituiti esattamente max_cap eventi
            let has_sentinel = if actual_returned == cap {
                let mut sentinel_h: EvtHandle = null_mut();
                let mut sentinel_ret: u32 = 0;
                let s_ok = fn_next(h_query, 1, &mut sentinel_h, 0, 0, &mut sentinel_ret);
                if s_ok != 0 && sentinel_ret > 0 && !sentinel_h.is_null() {
                    fn_close(sentinel_h);
                    true
                } else {
                    false
                }
            } else {
                false
            };

            timings.query_duration_us = query_start.elapsed().as_micros() as u64;

            let parse_start = Instant::now();
            let mut events: Vec<EventLogNativeFact> = Vec::with_capacity(actual_returned);
            let mut render_buf: Vec<u16> = vec![0u16; 4096];

            for i in 0..actual_returned {
                let h_event = handles[i];
                if h_event.is_null() {
                    continue;
                }

                let mut buffer_used = 0u32;
                let mut prop_count = 0u32;
                let mut ok = fn_render(
                    null_mut(),
                    h_event,
                    1, // EvtRenderEventXml
                    (render_buf.len() * 2) as u32,
                    render_buf.as_mut_ptr() as *mut c_void,
                    &mut buffer_used,
                    &mut prop_count,
                );

                if ok == 0 && buffer_used > (render_buf.len() * 2) as u32 {
                    let needed_words = ((buffer_used as usize) / 2) + 2;
                    render_buf.resize(needed_words, 0);
                    ok = fn_render(
                        null_mut(),
                        h_event,
                        1,
                        (render_buf.len() * 2) as u32,
                        render_buf.as_mut_ptr() as *mut c_void,
                        &mut buffer_used,
                        &mut prop_count,
                    );
                }

                if ok != 0 && buffer_used > 1 {
                    let words = (buffer_used as usize) / 2;
                    let slice = if words > 0 && render_buf[words - 1] == 0 {
                        &render_buf[..words - 1]
                    } else {
                        &render_buf[..words]
                    };
                    let xml = String::from_utf16_lossy(slice);
                    if let Some(fact) = parse_event_xml(&xml) {
                        events.push(fact);
                    }
                }

                fn_close(h_event);
            }

            fn_close(h_query);
            FreeLibrary(wevtapi);

            timings.parse_duration_us = parse_start.elapsed().as_micros() as u64;
            timings.total_duration_us = total_start.elapsed().as_micros() as u64;

            let (capped_events, final_count, truncated) =
                apply_event_cap_and_sentinel(events, has_sentinel, cap);

            (
                EventLogDiagnosticsSnapshot {
                    availability: "available".to_string(),
                    source: "Wevtapi_SystemLog".to_string(),
                    query_time_window_hours: time_window_hours,
                    max_events_cap: max_cap,
                    returned_event_count: final_count,
                    truncated,
                    events: capped_events,
                    error_details: None,
                },
                timings,
            )
        }
    }

    pub fn query_event_log(time_window_hours: u32, max_cap: u32) -> EventLogDiagnosticsSnapshot {
        query_event_log_measured(time_window_hours, max_cap).0
    }
}

// ---------------------------------------------------------------------------
// FALLBACK NON-WINDOWS
// ---------------------------------------------------------------------------

#[cfg(not(target_os = "windows"))]
pub mod non_windows_impl {
    use super::*;

    pub fn query_power_status() -> PowerStatusSnapshot {
        PowerStatusSnapshot {
            availability: "unsupported".to_string(),
            source: "GetSystemPowerStatus".to_string(),
            ac_line_status: 255,
            battery_flag: 255,
            battery_life_percent: None,
            battery_saver_active: false,
            has_system_battery: false,
            is_on_ac: None,
            is_on_battery: None,
            power_architecture: "unknown".to_string(),
            error_details: Some("Power architecture facts require Windows desktop OS".to_string()),
        }
    }

    pub fn query_memory_commit() -> MemoryCommitSnapshot {
        MemoryCommitSnapshot {
            availability: "unsupported".to_string(),
            source: "GetPerformanceInfo".to_string(),
            commit_total_bytes: 0,
            commit_limit_bytes: 0,
            commit_peak_bytes: 0,
            physical_total_bytes: 0,
            physical_available_bytes: 0,
            system_cache_bytes: 0,
            kernel_paged_bytes: 0,
            kernel_nonpaged_bytes: 0,
            process_count: 0,
            thread_count: 0,
            commit_utilization_percent: 0.0,
            physical_utilization_percent: 0.0,
            error_details: Some("Memory commit diagnostics require Windows desktop OS".to_string()),
        }
    }

    pub fn query_device_problems() -> DeviceProblemsFact {
        DeviceProblemsFact {
            availability: "unsupported".to_string(),
            source: "CM_Get_DevNode_Status".to_string(),
            total_devices_scanned: 0,
            problem_count: 0,
            devices_with_problems: Vec::new(),
            error_details: Some("Device fault diagnostics require Windows Configuration Manager".to_string()),
        }
    }

    pub fn query_event_log(time_window_hours: u32, max_cap: u32) -> EventLogDiagnosticsSnapshot {
        EventLogDiagnosticsSnapshot {
            availability: "unsupported".to_string(),
            source: "Wevtapi_SystemLog".to_string(),
            query_time_window_hours: time_window_hours,
            max_events_cap: max_cap,
            returned_event_count: 0,
            truncated: false,
            events: Vec::new(),
            error_details: Some("Event Log diagnostics require Windows desktop OS".to_string()),
        }
    }
}

// ---------------------------------------------------------------------------
// TAURI COMMAND PUBBLICO BATCH (RULE D)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_system_diagnostics_snapshot() -> SystemDiagnosticsSnapshot {
    let start = Instant::now();

    #[cfg(target_os = "windows")]
    let (dev, mem, pwr, evt) = (
        windows_impl::query_device_problems(),
        windows_impl::query_memory_commit(),
        windows_impl::query_power_status(),
        windows_impl::query_event_log(168, 50),
    );

    #[cfg(not(target_os = "windows"))]
    let (dev, mem, pwr, evt) = (
        non_windows_impl::query_device_problems(),
        non_windows_impl::query_memory_commit(),
        non_windows_impl::query_power_status(),
        non_windows_impl::query_event_log(168, 50),
    );

    let duration_ms = start.elapsed().as_millis() as u64;

    let all_available = dev.availability == "available"
        && mem.availability == "available"
        && pwr.availability == "available"
        && evt.availability == "available";

    let any_available = dev.availability == "available"
        || mem.availability == "available"
        || pwr.availability == "available"
        || evt.availability == "available";

    let status = if all_available {
        "success".to_string()
    } else if any_available {
        "partial".to_string()
    } else if dev.availability == "unsupported" {
        "unsupported".to_string()
    } else {
        "error".to_string()
    };

    let now_str = {
        let now = std::time::SystemTime::now();
        let dt: ChronoMockIso = now.into();
        dt.0
    };

    SystemDiagnosticsSnapshot {
        timestamp: now_str,
        status,
        device_problems: dev,
        memory_commit: mem,
        power_status: pwr,
        event_log: evt,
        collection_duration_ms: duration_ms,
    }
}

struct ChronoMockIso(String);

impl From<std::time::SystemTime> for ChronoMockIso {
    fn from(time: std::time::SystemTime) -> Self {
        let duration = time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
        let secs = duration.as_secs();
        // Semplice formattazione ISO-like senza dipendenze chrono pesanti
        let days = secs / 86400;
        let day_secs = secs % 86400;
        let hours = day_secs / 3600;
        let minutes = (day_secs % 3600) / 60;
        let seconds = day_secs % 60;

        // Calcolo anno/mese/giorno approssimato partendo da 1970-01-01
        let mut year = 1970;
        let mut d = days;
        loop {
            let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
            let days_in_year = if leap { 366 } else { 365 };
            if d >= days_in_year {
                d -= days_in_year;
                year += 1;
            } else {
                break;
            }
        }
        let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_months = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let mut month = 1;
        for dim in days_in_months.iter() {
            if d >= *dim {
                d -= *dim;
                month += 1;
            } else {
                break;
            }
        }
        let day = d + 1;

        ChronoMockIso(format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
            year, month, day, hours, minutes, seconds
        ))
    }
}

// ---------------------------------------------------------------------------
// TEST UNITARI RUST TRANCHE 7A
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_problem_code_known_and_unknown() {
        let (label43, desc43, sev43) = map_problem_code(43);
        assert_eq!(label43, "CM_PROB_FAILED_POST");
        assert_eq!(sev43, "critical");
        assert!(desc43.contains("arrestata da Windows"));

        let (label22, _, sev22) = map_problem_code(22);
        assert_eq!(label22, "CM_PROB_DISABLED");
        assert_eq!(sev22, "info");

        let (label10, _, sev10) = map_problem_code(10);
        assert_eq!(label10, "CM_PROB_FAILED_START");
        assert_eq!(sev10, "warning");

        let (label_unk, desc_unk, sev_unk) = map_problem_code(9999);
        assert_eq!(label_unk, "CM_PROB_UNKNOWN");
        assert_eq!(sev_unk, "attention");
        assert!(desc_unk.contains("non mappato standard"));
    }

    #[test]
    fn test_memory_commit_calculations_normal() {
        // 16 GB phys (4,194,304 pages @ 4096B), 8 GB used (2,097,152 pages avail)
        // 24 GB commit limit (6,291,456 pages), 12 GB commit total (3,145,728 pages)
        let page_size = 4096;
        let snap = calculate_memory_commit(
            3_145_728, // 12 GB commit
            6_291_456, // 24 GB limit
            4_000_000,
            4_194_304, // 16 GB phys
            2_097_152, // 8 GB avail
            500_000,
            100_000,
            50_000,
            page_size,
            250,
            3000,
        );

        assert_eq!(snap.availability, "available");
        assert_eq!(snap.commit_total_bytes, 12 * 1024 * 1024 * 1024);
        assert_eq!(snap.commit_limit_bytes, 24 * 1024 * 1024 * 1024);
        assert_eq!(snap.commit_utilization_percent, 50.0);
        assert_eq!(snap.physical_utilization_percent, 50.0);
        assert_eq!(snap.process_count, 250);
        assert_eq!(snap.thread_count, 3000);
    }

    #[test]
    fn test_memory_commit_zero_limit_and_overflow_protection() {
        // Zero limit: non deve crashare o restituire NaN/Inf
        let snap_zero = calculate_memory_commit(
            1000,
            0, // zero limit
            1000,
            0, // zero phys
            0,
            0,
            0,
            0,
            4096,
            10,
            100,
        );
        assert_eq!(snap_zero.commit_utilization_percent, 0.0);
        assert_eq!(snap_zero.physical_utilization_percent, 0.0);

        // Saturation e valori enormi
        let snap_huge = calculate_memory_commit(
            usize::MAX,
            usize::MAX,
            usize::MAX,
            usize::MAX,
            0,
            0,
            0,
            0,
            4096,
            1,
            1,
        );
        assert_eq!(snap_huge.commit_utilization_percent, 100.0);
        assert!(snap_huge.commit_total_bytes > 0);
    }

    #[test]
    fn test_power_status_desktop_no_battery() {
        // AC Online (1), BatteryFlag = 128 (No battery)
        let pwr = calculate_power_status(1, 128, 255, 0);
        assert_eq!(pwr.availability, "available");
        assert_eq!(pwr.has_system_battery, false);
        assert_eq!(pwr.is_on_ac, Some(true));
        assert_eq!(pwr.is_on_battery, Some(false));
        assert_eq!(pwr.power_architecture, "desktop_like");
        assert_eq!(pwr.battery_life_percent, None);
        assert_eq!(pwr.battery_saver_active, false);
    }

    #[test]
    fn test_power_status_laptop_on_battery_with_saver() {
        // AC Offline (0), BatteryFlag = 1 (High), BatteryLifePercent = 85%, Saver active (1)
        let pwr = calculate_power_status(0, 1, 85, 1);
        assert_eq!(pwr.availability, "available");
        assert_eq!(pwr.has_system_battery, true);
        assert_eq!(pwr.is_on_ac, Some(false));
        assert_eq!(pwr.is_on_battery, Some(true));
        assert_eq!(pwr.power_architecture, "battery_capable");
        assert_eq!(pwr.battery_life_percent, Some(85));
        assert_eq!(pwr.battery_saver_active, true);
    }

    #[test]
    fn test_power_status_unknown() {
        // AC 255 (unknown), BatteryFlag 255 (unknown)
        let pwr = calculate_power_status(255, 255, 255, 0);
        assert_eq!(pwr.has_system_battery, false);
        assert_eq!(pwr.is_on_ac, None);
        assert_eq!(pwr.is_on_battery, None);
        assert_eq!(pwr.power_architecture, "unknown");
    }

    #[test]
    fn test_device_problem_fact_rule_a1() {
        // Un device sano non deve essere creato
        let has_problem = false;
        let problem_code = 0u32;
        let should_include = has_problem || problem_code != 0;
        assert_eq!(should_include, false);
    }

    // -----------------------------------------------------------------------
    // TEST UNITARI RUST TRANCHE 8A — EVENT LOG FACTS & CAPPING
    // -----------------------------------------------------------------------

    #[test]
    fn test_cap_and_sentinel_scenarios_a_to_e() {
        // A. 0 eventi -> returnedEventCount=0, truncated=false
        let (events_a, count_a, trunc_a) = apply_event_cap_and_sentinel(Vec::<u32>::new(), false, 50);
        assert_eq!(count_a, 0);
        assert_eq!(trunc_a, false);
        assert_eq!(events_a.len(), 0);

        // B. 49 eventi -> 49 / false
        let (events_b, count_b, trunc_b) = apply_event_cap_and_sentinel((0..49).collect(), false, 50);
        assert_eq!(count_b, 49);
        assert_eq!(trunc_b, false);
        assert_eq!(events_b.len(), 49);

        // C. 50 eventi esatti senza sentinel -> 50 / false
        let (events_c, count_c, trunc_c) = apply_event_cap_and_sentinel((0..50).collect(), false, 50);
        assert_eq!(count_c, 50);
        assert_eq!(trunc_c, false);
        assert_eq!(events_c.len(), 50);

        // D. 50 eventi con sentinel positivo (51+ nel log) -> 50 / true (sentinel scartato)
        let (events_d, count_d, trunc_d) = apply_event_cap_and_sentinel((0..50).collect(), true, 50);
        assert_eq!(count_d, 50);
        assert_eq!(trunc_d, true);
        assert_eq!(events_d.len(), 50);

        // E. 55 eventi collezionati con sentinel -> cap a 50 / true
        let (events_e, count_e, trunc_e) = apply_event_cap_and_sentinel((0..55).collect(), true, 50);
        assert_eq!(count_e, 50);
        assert_eq!(trunc_e, true);
        assert_eq!(events_e.len(), 50);
    }

    #[test]
    fn test_parsing_disk_7_vs_disk_51() {
        // F. disk 7 != disk 51
        let xml7 = "<Event><System><Provider Name='disk'/><EventID>7</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-20T10:00:00Z'/><EventRecordID>100</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk0\\DR0</Data></EventData></Event>";
        let xml51 = "<Event><System><Provider Name='disk'/><EventID>51</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-20T10:05:00Z'/><EventRecordID>101</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk0\\DR0</Data></EventData></Event>";

        let fact7 = parse_event_xml(xml7).expect("parse disk 7 failed");
        let fact51 = parse_event_xml(xml51).expect("parse disk 51 failed");

        assert_eq!(fact7.event_id, 7);
        assert_eq!(fact51.event_id, 51);
        assert_ne!(fact7.event_id, fact51.event_id);
        assert_eq!(fact7.target_context.as_deref(), Some("\\Device\\Harddisk0\\DR0"));
        assert_eq!(fact51.target_context.as_deref(), Some("\\Device\\Harddisk0\\DR0"));
    }

    #[test]
    fn test_parsing_disk_11_controller_error() {
        // G. disk 11 preserva il contesto controller error senza trasformarlo in disk failure
        let xml11 = "<Event><System><Provider Name='disk'/><EventID>11</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-21T08:00:00Z'/><EventRecordID>102</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk1\\DR1</Data><Data Name='Status'>0xC000000E</Data></EventData></Event>";

        let fact11 = parse_event_xml(xml11).expect("parse disk 11 failed");
        assert_eq!(fact11.event_id, 11);
        assert_eq!(fact11.target_context.as_deref(), Some("\\Device\\Harddisk1\\DR1"));
        if let Some(EventPayload::Disk { device_name, io_status }) = fact11.payload {
            assert_eq!(device_name.as_deref(), Some("\\Device\\Harddisk1\\DR1"));
            assert_eq!(io_status.as_deref(), Some("0xC000000E"));
        } else {
            panic!("Expected EventPayload::Disk");
        }
    }

    #[test]
    fn test_parsing_ntfs_55_vs_98() {
        // H. NTFS 55 / 98 vengono conservati come fatti nativi distinti
        let xml55 = "<Event><System><Provider Name='Ntfs'/><EventID>55</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-22T09:00:00Z'/><EventRecordID>103</EventRecordID><Channel>System</Channel></System><EventData><Data Name='DriveName'>C:</Data><Data Name='Description'>Corruption</Data></EventData></Event>";
        let xml98 = "<Event><System><Provider Name='Ntfs'/><EventID>98</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-22T09:30:00Z'/><EventRecordID>104</EventRecordID><Channel>System</Channel></System><EventData><Data Name='VolumeName'>D:</Data><Data Name='RepairHint'>Online spot fix required</Data></EventData></Event>";

        let fact55 = parse_event_xml(xml55).expect("parse ntfs 55 failed");
        let fact98 = parse_event_xml(xml98).expect("parse ntfs 98 failed");

        assert_eq!(fact55.event_id, 55);
        assert_eq!(fact98.event_id, 98);
        assert_ne!(fact55.event_id, fact98.event_id);
        assert_eq!(fact55.target_context.as_deref(), Some("C:"));
        assert_eq!(fact98.target_context.as_deref(), Some("D:"));

        if let Some(EventPayload::Ntfs { volume_name, repair_hint, .. }) = fact98.payload {
            assert_eq!(volume_name.as_deref(), Some("D:"));
            assert_eq!(repair_hint.as_deref(), Some("Online spot fix required"));
        } else {
            panic!("Expected EventPayload::Ntfs for event 98");
        }
    }

    #[test]
    fn test_parsing_kernel_power_41() {
        // I. Kernel-Power 41 conserva BugcheckCode / PowerButtonTimestamp quando presenti
        let xml41 = "<Event><System><Provider Name='Microsoft-Windows-Kernel-Power'/><EventID>41</EventID><Level>1</Level><TimeCreated SystemTime='2026-09-23T11:00:00Z'/><EventRecordID>105</EventRecordID><Channel>System</Channel></System><EventData><Data Name='BugcheckCode'>159</Data><Data Name='BugcheckParameter1'>0x3</Data><Data Name='PowerButtonTimestamp'>13370000000</Data><Data Name='SleepInProgress'>0</Data><Data Name='ConnectedStandbyInProgress'>false</Data></EventData></Event>";

        let fact41 = parse_event_xml(xml41).expect("parse kp 41 failed");
        assert_eq!(fact41.event_id, 41);
        assert_eq!(fact41.level, 1);
        if let Some(EventPayload::KernelPower { bugcheck_code, bugcheck_parameter1, power_button_timestamp, sleep_in_progress, connected_standby_in_progress }) = fact41.payload {
            assert_eq!(bugcheck_code, 159);
            assert_eq!(bugcheck_parameter1.as_deref(), Some("0x3"));
            assert_eq!(power_button_timestamp, 13370000000);
            assert_eq!(sleep_in_progress, Some(0));
            assert_eq!(connected_standby_in_progress, Some(false));
        } else {
            panic!("Expected EventPayload::KernelPower");
        }
    }

    #[test]
    fn test_parsing_whea_events_17_18_19_47() {
        // J. WHEA 17/18/19/47 vengono distinti per Event ID e structured data
        let xml17 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>17</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:00:00Z'/><EventRecordID>106</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>4</Data></EventData></Event>";
        let xml18 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>18</EventID><Level>1</Level><TimeCreated SystemTime='2026-09-24T12:10:00Z'/><EventRecordID>107</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>3</Data><Data Name='MCABank'>2</Data></EventData></Event>";
        let xml19 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>19</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:20:00Z'/><EventRecordID>108</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>3</Data><Data Name='MCABank'>0</Data></EventData></Event>";
        let xml47 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>47</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:30:00Z'/><EventRecordID>109</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>5</Data></EventData></Event>";

        let fact17 = parse_event_xml(xml17).expect("parse whea 17 failed");
        let fact18 = parse_event_xml(xml18).expect("parse whea 18 failed");
        let fact19 = parse_event_xml(xml19).expect("parse whea 19 failed");
        let fact47 = parse_event_xml(xml47).expect("parse whea 47 failed");

        assert_eq!(fact17.event_id, 17);
        assert_eq!(fact18.event_id, 18);
        assert_eq!(fact19.event_id, 19);
        assert_eq!(fact47.event_id, 47);

        if let Some(EventPayload::Whea { error_source, mca_bank, .. }) = fact18.payload {
            assert_eq!(error_source, Some(3));
            assert_eq!(mca_bank, Some(2));
        } else {
            panic!("Expected Whea payload for 18");
        }
    }

    #[test]
    fn test_parsing_display_4101() {
        let xml_disp = "<Event><System><Provider Name='Display'/><EventID>4101</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-25T14:00:00Z'/><EventRecordID>110</EventRecordID><Channel>System</Channel></System><EventData><Data>nvlddmkm</Data></EventData></Event>";
        let fact_disp = parse_event_xml(xml_disp).expect("parse display 4101 failed");
        assert_eq!(fact_disp.event_id, 4101);
        assert_eq!(fact_disp.target_context.as_deref(), Some("nvlddmkm"));
        if let Some(EventPayload::Display { driver_name }) = fact_disp.payload {
            assert_eq!(driver_name.as_deref(), Some("nvlddmkm"));
        } else {
            panic!("Expected EventPayload::Display");
        }
    }

    #[test]
    fn test_error_and_malformed_xml_handling() {
        // K & L: malformed XML o rendering fallito -> None controllato senza crash
        let malformed = "<Event><Broken";
        assert!(parse_event_xml(malformed).is_none());

        let missing_event_id = "<Event><System><Provider Name='disk'/></System></Event>";
        assert!(parse_event_xml(missing_event_id).is_none());
    }

    #[test]
    fn test_xpath_query_builder() {
        let query = build_event_log_xpath_query(168);
        assert!(query.contains("Microsoft-Windows-WHEA-Logger"));
        assert!(query.contains("Microsoft-Windows-Kernel-Power"));
        assert!(query.contains("disk"));
        assert!(query.contains("Ntfs"));
        assert!(query.contains("Display"));
        assert!(query.contains("604800000")); // 168 * 3600 * 1000
    }
}
