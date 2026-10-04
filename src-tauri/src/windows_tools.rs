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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SecurityAuditData {
    pub secure_boot_enabled: bool,
    pub tpm_present: bool,
    pub tpm_ready: bool,
    pub vbs_running: bool,
    pub hvci_running: bool,
    pub hosts_file_clean: bool,
    pub hosts_custom_entries_count: usize,
    pub details: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiskSmartHealth {
    pub device_id: String,
    pub friendly_name: String,
    pub media_type: String,
    pub temperature_celsius: Option<i32>,
    pub wear_percentage: Option<u32>,
    pub read_errors_total: u64,
    pub write_errors_total: u64,
    pub power_on_hours: Option<u64>,
    pub health_status: String,
    pub smart_status: Option<String>,
    pub smart_status_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShaderCacheCleanResult {
    pub files_removed: u64,
    pub bytes_freed: u64,
    pub details: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WinGetUpdateItem {
    pub name: String,
    pub id: String,
    pub installed_version: String,
    pub available_version: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StartupAppItem {
    pub name: String,
    pub command: String,
    pub scope: String, // "current_user" | "local_machine" | "local_machine_wow64"
    pub enabled: bool,
    pub impact: String, // "high" | "medium" | "low" | "none" | "unknown"
    pub raw_status_hex: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StartupAppsSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub total_apps: u32,
    pub enabled_count: u32,
    pub disabled_count: u32,
    pub apps: Vec<StartupAppItem>,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkDiagnosticsResult {
    pub target_host: String,
    pub sent_packets: u32,
    pub received_packets: u32,
    pub packet_loss_percent: f64,
    pub rtt_min_ms: Option<f64>,
    pub rtt_max_ms: Option<f64>,
    pub rtt_avg_ms: Option<f64>,
    pub jitter_ms: Option<f64>,
    pub quality_rating: String, // "optimal" | "good" | "degraded" | "critical" | "offline"
    pub raw_samples: Vec<f64>,
    pub status: String, // "success" | "error"
    pub error_details: Option<String>,
    pub execution_time_ms: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WindowsUpdateStatus {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub reboot_pending: bool,
    pub reboot_sources: Vec<String>,
    pub last_check_time: Option<String>,
    pub last_install_time: Option<String>,
    pub pending_file_rename_count: u32,
    pub details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorResolution {
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorVirtualBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: String,
    pub monitor_name: String,
    pub adapter_name: String,
    pub current_resolution: MonitorResolution,
    pub current_refresh_rate: u32,
    pub max_supported_refresh_rate: u32,
    pub supported_refresh_rates: Vec<u32>,
    pub bits_per_pixel: u32,
    pub orientation: String, // "landscape" | "portrait" | "landscape_flipped" | "portrait_flipped" | "unknown"
    pub is_primary: bool,
    pub virtual_bounds: MonitorVirtualBounds,
    pub dpi_scale_percent: u32,
    pub is_refresh_rate_limited: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DisplayDiagnosticsSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub total_monitors: u32,
    pub monitors: Vec<MonitorInfo>,
    pub has_high_refresh_rate_mismatch: bool,
    pub has_mixed_refresh_rates: bool,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub state: String, // "active" | "disabled" | "unplugged" | "not_present" | "unknown"
    pub sample_rate_hz: Option<u32>,
    pub bit_depth: Option<u32>,
    pub channels: Option<u32>,
    pub driver_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioDiagnosticsSnapshot {
    pub availability: String, // "available" | "unavailable" | "unsupported" | "error"
    pub source: String,
    pub default_device_name: Option<String>,
    pub default_sample_rate_hz: Option<u32>,
    pub default_bit_depth: Option<u32>,
    pub default_channels: Option<u32>,
    pub devices: Vec<AudioDeviceInfo>,
    pub audio_service_running: bool,
    pub audio_endpoint_builder_running: bool,
    pub engine_status: String, // "optimal" | "standard" | "degraded" | "issues_detected"
    pub glitch_or_issue_detected: bool,
    pub issue_summary: Option<String>,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAdapterSnapshot {
    pub availability: String, // "available" | "unavailable" | "error"
    pub source: String,       // "win32_iphelper" | "win32_mock"
    pub adapter_name: String,
    pub description: String,
    pub adapter_type: String, // "ethernet" | "wifi" | "virtual" | "other"
    pub status: String,       // "connected" | "disconnected" | "unknown"
    pub link_speed_mbps: u64,
    pub max_speed_mbps: Option<u64>,
    pub is_link_speed_downgraded: bool,
    pub ipv4: Option<String>,
    pub ipv6: Option<String>,
    pub gateway: Option<String>,
    pub mac_address: Option<String>,
    pub dhcp_enabled: bool,
    pub error_details: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WifiSignalSnapshot {
    pub availability: String, // "available" | "unavailable" | "not_connected" | "error"
    pub source: String,       // "win32_wlanapi" | "win32_mock"
    pub is_connected: bool,
    pub ssid: Option<String>,
    pub bssid: Option<String>,
    pub signal_quality_percent: u32, // 0 - 100%
    pub rssi_dbm: i32,                // e.g. -50 dBm
    pub band: String,                 // "2.4GHz" | "5GHz" | "6GHz" | "unknown"
    pub standard: String,             // "Wi-Fi 7" | "Wi-Fi 6/6E" | "Wi-Fi 5" | "Wi-Fi 4" | "legacy" | "unknown"
    pub channel: Option<u32>,
    pub error_details: Option<String>,
}

/// Converte la stringa di velocità link (es. "1 Gbps", "100 Mbps", "2.5 Gbps", "0 bps") in Mbps
pub fn parse_link_speed_to_mbps(val: &str) -> u64 {
    let clean = val.trim().to_lowercase();
    if clean.contains("gbps") {
        let num_str = clean.replace("gbps", "").trim().to_string();
        if let Ok(gbps) = num_str.parse::<f64>() {
            return (gbps * 1000.0).round() as u64;
        }
    } else if clean.contains("mbps") {
        let num_str = clean.replace("mbps", "").trim().to_string();
        if let Ok(mbps) = num_str.parse::<f64>() {
            return mbps.round() as u64;
        }
    } else if clean.contains("kbps") {
        let num_str = clean.replace("kbps", "").trim().to_string();
        if let Ok(kbps) = num_str.parse::<f64>() {
            return (kbps / 1000.0).round() as u64;
        }
    } else if clean.contains("bps") {
        let num_str = clean.replace("bps", "").trim().to_string();
        if let Ok(bps) = num_str.parse::<f64>() {
            return (bps / 1_000_000.0).round() as u64;
        }
    }
    0
}

/// Stima la velocità nominale massima di una scheda di rete partendo dalla sua descrizione hardware
pub fn estimate_max_speed_from_desc(description: &str) -> Option<u64> {
    let lower = description.to_lowercase();
    if lower.contains("10g") || lower.contains("10 gigabit") || lower.contains("10gbe") {
        Some(10000)
    } else if lower.contains("2.5g")
        || lower.contains("2.5 gigabit")
        || lower.contains("2.5gbe")
        || lower.contains("rtl8125")
        || lower.contains("i225")
        || lower.contains("i226")
    {
        Some(2500)
    } else if lower.contains("5gbe") || lower.contains("5 gigabit") || lower.contains(" 5g ") {
        Some(5000)
    } else if lower.contains("gigabit")
        || lower.contains("gbe")
        || lower.contains("10/100/1000")
        || lower.contains("1000m")
        || lower.contains("rtl8111")
        || lower.contains("i219")
        || lower.contains("i211")
    {
        Some(1000)
    } else if lower.contains("fast ethernet") || lower.contains("10/100") {
        Some(100)
    } else {
        None
    }
}

/// Valuta se il link speed Ethernet negoziato è ridotto rispetto alla capacità nominale della scheda
/// (es. scheda 1000M o 2500M che negozia a soli 100 Mbps o 10 Mbps a causa di cavo difettoso o porta limitata)
pub fn evaluate_ethernet_link_speed_downgrade(
    adapter_type: &str,
    description: &str,
    link_speed_mbps: u64,
    max_speed_mbps: Option<u64>,
) -> bool {
    if adapter_type != "ethernet" || link_speed_mbps == 0 {
        return false;
    }
    let max = max_speed_mbps.or_else(|| estimate_max_speed_from_desc(description));
    if let Some(nominal) = max {
        if nominal >= 1000 && link_speed_mbps <= 100 {
            return true;
        }
    }
    false
}

/// Converte la percentuale di qualità del segnale Wi-Fi (0-100) in RSSI (dBm)
/// secondo la specifica standard Windows NDIS / WLAN (100% = -50 dBm, 0% = -100 dBm).
pub fn wifi_quality_to_rssi_dbm(quality_percent: u32) -> i32 {
    let clamped = quality_percent.min(100) as i32;
    (clamped / 2) - 100
}

/// Determina la banda radio (2.4GHz, 5GHz, 6GHz) in base al canale Wi-Fi o frequenza
pub fn detect_wifi_band(channel: Option<u32>, freq_khz_or_mhz: Option<u64>) -> &'static str {
    if let Some(freq) = freq_khz_or_mhz {
        let mhz = if freq > 100_000 { freq / 1000 } else { freq };
        if mhz >= 5925 {
            return "6GHz";
        } else if mhz >= 4900 && mhz < 5925 {
            return "5GHz";
        } else if mhz >= 2400 && mhz < 2500 {
            return "2.4GHz";
        }
    }
    if let Some(ch) = channel {
        if ch >= 1 && ch <= 14 {
            return "2.4GHz";
        } else if ch >= 32 && ch <= 177 {
            return "5GHz";
        }
    }
    "5GHz"
}

/// Determina lo standard Wi-Fi (Wi-Fi 7, Wi-Fi 6/6E, Wi-Fi 5, Wi-Fi 4, legacy, unknown)
pub fn detect_wifi_standard(radio_type: &str, band: &str) -> &'static str {
    let lower = radio_type.to_lowercase();
    if lower.contains("802.11be") || lower.contains("wifi 7") || lower.contains("wi-fi 7") {
        "Wi-Fi 7"
    } else if lower.contains("802.11ax") || lower.contains("wifi 6") || lower.contains("wi-fi 6") {
        if band == "6GHz" {
            "Wi-Fi 6E"
        } else {
            "Wi-Fi 6"
        }
    } else if lower.contains("802.11ac") || lower.contains("wifi 5") || lower.contains("wi-fi 5") {
        "Wi-Fi 5"
    } else if lower.contains("802.11n") || lower.contains("wifi 4") || lower.contains("wi-fi 4") {
        "Wi-Fi 4"
    } else if lower.contains("802.11g") || lower.contains("802.11a") || lower.contains("802.11b") {
        "legacy"
    } else {
        "unknown"
    }
}

/// Esegue il parsing deterministico dell'output del comando `netsh wlan show interfaces`
pub fn parse_netsh_wifi_output(output: &str) -> WifiSignalSnapshot {
    let lower = output.to_lowercase();
    if lower.contains("there is no wireless interface") || lower.contains("nessuna interfaccia wireless") {
        return WifiSignalSnapshot {
            availability: "unavailable".to_string(),
            source: "win32_netsh_wlan".to_string(),
            is_connected: false,
            ssid: None,
            bssid: None,
            signal_quality_percent: 0,
            rssi_dbm: -100,
            band: "unknown".to_string(),
            standard: "unknown".to_string(),
            channel: None,
            error_details: Some("Nessuna interfaccia wireless rilevata nel sistema.".to_string()),
        };
    }

    let mut is_connected = false;
    let mut ssid = None;
    let mut bssid = None;
    let mut signal_percent = 0u32;
    let mut radio_type = String::new();
    let mut channel = None;
    let mut band_str = None;

    for line in output.lines() {
        let trimmed = line.trim();
        if let Some(pos) = trimmed.find(':') {
            let key = trimmed[..pos].trim().to_lowercase();
            let val = trimmed[pos + 1..].trim();

            if key == "state" || key == "stato" {
                if val.eq_ignore_ascii_case("connected") || val.eq_ignore_ascii_case("connesso") {
                    is_connected = true;
                }
            } else if key == "ssid" {
                if !val.is_empty() {
                    ssid = Some(val.to_string());
                }
            } else if key == "bssid" {
                if !val.is_empty() {
                    bssid = Some(val.to_string());
                }
            } else if key == "signal" || key == "segnale" {
                let clean = val.replace('%', "").trim().to_string();
                if let Ok(pct) = clean.parse::<u32>() {
                    signal_percent = pct.min(100);
                }
            } else if key == "radio type" || key == "tipo frequenza radio" {
                radio_type = val.to_string();
            } else if key == "channel" || key == "canale" {
                if let Ok(ch) = val.parse::<u32>() {
                    channel = Some(ch);
                }
            } else if key == "band" || key == "banda" {
                if val.contains('6') {
                    band_str = Some("6GHz".to_string());
                } else if val.contains('5') {
                    band_str = Some("5GHz".to_string());
                } else if val.contains("2.4") {
                    band_str = Some("2.4GHz".to_string());
                }
            }
        }
    }

    if !is_connected {
        return WifiSignalSnapshot {
            availability: "not_connected".to_string(),
            source: "win32_netsh_wlan".to_string(),
            is_connected: false,
            ssid: None,
            bssid: None,
            signal_quality_percent: 0,
            rssi_dbm: -100,
            band: "unknown".to_string(),
            standard: "unknown".to_string(),
            channel: None,
            error_details: Some("Scheda Wi-Fi disconnessa o nessuna rete associata.".to_string()),
        };
    }

    let detected_band = band_str.unwrap_or_else(|| detect_wifi_band(channel, None).to_string());
    let detected_standard = detect_wifi_standard(&radio_type, &detected_band).to_string();
    let rssi = wifi_quality_to_rssi_dbm(signal_percent);

    WifiSignalSnapshot {
        availability: "available".to_string(),
        source: "win32_netsh_wlan".to_string(),
        is_connected: true,
        ssid,
        bssid,
        signal_quality_percent: signal_percent,
        rssi_dbm: rssi,
        band: detected_band,
        standard: detected_standard,
        channel,
        error_details: None,
    }
}


/// Determina in modo deterministico se un monitor con refresh rate potenziale elevato (>= 100 Hz)
/// è limitato a un refresh rate ridotto (es. 60 Hz).
pub fn is_monitor_refresh_rate_limited(max_hz: u32, current_hz: u32) -> bool {
    (max_hz >= 100 && current_hz <= 60) || (max_hz > current_hz + 20)
}

/// Classifica lo stato di salute del motore audio Windows in base ai servizi e al formato predefinito.
pub fn classify_audio_engine_status(
    service_running: bool,
    default_hz: Option<u32>,
    default_bits: Option<u32>,
) -> (&'static str, bool, &'static str) {
    if !service_running {
        return (
            "issues_detected",
            true,
            "Il servizio principale Windows Audio (Audiosrv) risulta interrotto.",
        );
    }
    match (default_hz, default_bits) {
        (Some(hz), Some(bits)) if hz >= 48000 && bits >= 16 => (
            "optimal",
            false,
            "Sottosistema audio operativo con risoluzione Studio/HD (>= 48.0 kHz, >= 16-bit).",
        ),
        (Some(hz), Some(bits)) if hz >= 44100 && bits >= 16 => (
            "standard",
            false,
            "Sottosistema audio operativo con risoluzione standard CD (44.1 kHz, 16-bit).",
        ),
        (Some(hz), _) if hz < 44100 => (
            "degraded",
            true,
            "Rilevato formato audio sub-ottimale con frequenza di campionamento ridotta (< 44.1 kHz).",
        ),
        _ => (
            "standard",
            false,
            "Sottosistema audio attivo e operante.",
        ),
    }
}

/// Decodifica lo stato abilitato/disabilitato da StartupApproved\Run nel Registry Windows.
/// Se None o vuoto -> true (default Task Manager: abilitato).
/// Se presente: byte[0] pari (0x02, 0x00) -> abilitato; byte[0] dispari (0x01, 0x03) -> disabilitato.
pub fn decode_startup_approved_status(raw: Option<&[u8]>) -> bool {
    match raw {
        None => true,
        Some(bytes) if bytes.is_empty() => true,
        Some(bytes) => bytes[0] % 2 == 0,
    }
}

/// Stima euristica dell'impatto di avvio di un'applicazione (high, medium, low).
pub fn estimate_startup_impact(name: &str, cmd: &str) -> &'static str {
    let s = format!("{} {}", name, cmd).to_lowercase();
    if s.contains("steam")
        || s.contains("epicgames")
        || s.contains("discord")
        || s.contains("slack")
        || s.contains("teams")
        || s.contains("spotify")
        || s.contains("chrome")
        || s.contains("battle.net")
        || s.contains("origin")
        || s.contains("riot")
        || s.contains("ea desktop")
    {
        "high"
    } else if s.contains("audio")
        || s.contains("realtek")
        || s.contains("tray")
        || s.contains("helper")
        || s.contains("service")
        || s.contains("driver")
        || s.contains("synaptics")
        || s.contains("logitech")
    {
        "low"
    } else {
        "medium"
    }
}

/// Classifica la qualità della connessione di rete in base a latenza media, packet loss e jitter.
pub fn classify_network_quality(avg_rtt: f64, packet_loss: f64, jitter: f64) -> String {
    if packet_loss >= 100.0 {
        "offline".to_string()
    } else if packet_loss > 20.0 || avg_rtt > 200.0 {
        "critical".to_string()
    } else if packet_loss > 0.0 || avg_rtt > 80.0 || jitter > 30.0 {
        "degraded".to_string()
    } else if avg_rtt <= 30.0 && jitter <= 5.0 {
        "optimal".to_string()
    } else {
        "good".to_string()
    }
}

/// Calcola metriche di rete min, max, avg, jitter, packet loss e quality rating dai campioni RTT.
pub fn calculate_network_metrics(
    samples: &[f64],
    sent_packets: u32,
) -> (Option<f64>, Option<f64>, Option<f64>, Option<f64>, f64, String) {
    let received = samples.len() as u32;
    let packet_loss = if sent_packets == 0 {
        0.0
    } else {
        ((sent_packets.saturating_sub(received)) as f64 / sent_packets as f64) * 100.0
    };

    if samples.is_empty() {
        return (None, None, None, None, 100.0, "offline".to_string());
    }

    let min = samples.iter().copied().fold(f64::INFINITY, f64::min);
    let max = samples.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let sum: f64 = samples.iter().sum();
    let avg = sum / (samples.len() as f64);

    let jitter = if samples.len() > 1 {
        let diff_sum: f64 = samples.windows(2).map(|w| (w[1] - w[0]).abs()).sum();
        Some(diff_sum / ((samples.len() - 1) as f64))
    } else {
        Some(0.0)
    };

    let quality = classify_network_quality(avg, packet_loss, jitter.unwrap_or(0.0));
    (Some(min), Some(max), Some(avg), jitter, packet_loss, quality)
}

/// Estrae il tempo in ms da una riga di risposta di ping (supporta IT 'tempo=Xms', EN 'time=Xms', 'tempo<1ms', ecc.)
pub fn parse_ping_time_line(line: &str) -> Option<f64> {
    let lower = line.to_lowercase();
    if lower.contains("tempo<1ms")
        || lower.contains("time<1ms")
        || lower.contains("tempo < 1ms")
        || lower.contains("time < 1ms")
    {
        return Some(0.5);
    }

    let markers = ["tempo=", "time="];
    for marker in markers {
        if let Some(pos) = lower.find(marker) {
            let start = pos + marker.len();
            let remainder = &lower[start..];
            let mut num_str = String::new();
            for ch in remainder.chars() {
                if ch.is_ascii_digit() || ch == '.' {
                    num_str.push(ch);
                } else if !num_str.is_empty() {
                    break;
                }
            }
            if let Ok(val) = num_str.parse::<f64>() {
                return Some(val);
            }
        }
    }
    None
}

/// Parsa l'output completo di ping.exe e costruisce NetworkDiagnosticsResult
pub fn parse_ping_output(
    output_text: &str,
    target_host: &str,
    sent_packets: u32,
    duration_ms: u64,
) -> NetworkDiagnosticsResult {
    let mut samples: Vec<f64> = Vec::new();

    for line in output_text.lines() {
        if let Some(ms) = parse_ping_time_line(line) {
            samples.push(ms);
        }
    }

    let (rtt_min_ms, rtt_max_ms, rtt_avg_ms, jitter_ms, packet_loss_percent, quality_rating) =
        calculate_network_metrics(&samples, sent_packets);

    let received_packets = samples.len() as u32;
    let is_offline = quality_rating == "offline";

    NetworkDiagnosticsResult {
        target_host: target_host.to_string(),
        sent_packets,
        received_packets,
        packet_loss_percent,
        rtt_min_ms,
        rtt_max_ms,
        rtt_avg_ms,
        jitter_ms,
        quality_rating,
        raw_samples: samples,
        status: if is_offline && received_packets == 0 {
            "warning".to_string()
        } else {
            "success".to_string()
        },
        error_details: if is_offline {
            Some("Nessuna risposta ricevuta dal target host (100% packet loss).".to_string())
        } else {
            None
        },
        execution_time_ms: duration_ms,
    }
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
        fn LoadLibraryA(lp_lib_file_name: *const i8) -> *mut std::ffi::c_void;
        fn GetProcAddress(
            h_module: *mut std::ffi::c_void,
            lp_proc_name: *const i8,
        ) -> *mut std::ffi::c_void;
        fn FreeLibrary(h_lib_module: *mut std::ffi::c_void) -> i32;
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

    /// Crea un punto di ripristino di sistema 1-click prima di qualsiasi modifica
    pub fn create_restore_point_native(description: &str) -> WindowsToolResult<String> {
        let start = Instant::now();
        let desc = if description.trim().is_empty() {
            "PC Tracker Safety Point"
        } else {
            description.trim()
        };
        let escaped_desc = desc.replace('\'', "''");
        let cmd = format!(
            "Checkpoint-Computer -Description '{}' -RestorePointType 'MODIFY_SETTINGS'",
            escaped_desc
        );
        let (status, msg, details, exit_code) = run_powershell_elevated_uac(&cmd);
        WindowsToolResult {
            status,
            message: if exit_code == 0 {
                format!("Punto di ripristino '{}' creato con successo.", desc)
            } else {
                msg
            },
            details: Some(details),
            data: if exit_code == 0 { Some(desc.to_string()) } else { None },
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: true,
        }
    }

    /// Esegue un audit di sicurezza rapido e non distruttivo (Secure Boot, TPM, VBS, HVCI, Hosts file)
    pub fn query_security_audit_native() -> WindowsToolResult<SecurityAuditData> {
        let start = Instant::now();
        let cmd = r#"$sb = try { Confirm-SecureBootUEFI } catch { $false }
$tpm = try { Get-Tpm } catch { $null }
$dg = try { Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\Microsoft\Windows\DeviceGuard } catch { $null }
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsLines = if (Test-Path $hostsPath) { @(Get-Content $hostsPath | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }) } else { @() }
[PSCustomObject]@{
  secureBoot = [bool]$sb
  tpmPresent = if ($tpm) { [bool]$tpm.TpmPresent } else { $false }
  tpmReady = if ($tpm) { [bool]$tpm.TpmReady } else { $false }
  vbsRunning = if ($dg) { ($dg.SecurityServicesRunning -contains 1 -or $dg.VirtualizationBasedSecurityStatus -eq 2) } else { $false }
  hvciRunning = if ($dg) { ($dg.SecurityServicesRunning -contains 2) } else { $false }
  hostsClean = ($hostsLines.Count -le 5)
  hostsCustomCount = $hostsLines.Count
} | ConvertTo-Json -Compress"#;

        match run_powershell_hidden(cmd) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                #[derive(Deserialize)]
                struct RawAudit {
                    #[serde(rename = "secureBoot")]
                    secure_boot: Option<bool>,
                    #[serde(rename = "tpmPresent")]
                    tpm_present: Option<bool>,
                    #[serde(rename = "tpmReady")]
                    tpm_ready: Option<bool>,
                    #[serde(rename = "vbsRunning")]
                    vbs_running: Option<bool>,
                    #[serde(rename = "hvciRunning")]
                    hvci_running: Option<bool>,
                    #[serde(rename = "hostsClean")]
                    hosts_clean: Option<bool>,
                    #[serde(rename = "hostsCustomCount")]
                    hosts_custom_count: Option<usize>,
                }
                let parsed: RawAudit = serde_json::from_str(&stdout).unwrap_or(RawAudit {
                    secure_boot: Some(false),
                    tpm_present: Some(false),
                    tpm_ready: Some(false),
                    vbs_running: Some(false),
                    hvci_running: Some(false),
                    hosts_clean: Some(true),
                    hosts_custom_count: Some(0),
                });
                let data = SecurityAuditData {
                    secure_boot_enabled: parsed.secure_boot.unwrap_or(false),
                    tpm_present: parsed.tpm_present.unwrap_or(false),
                    tpm_ready: parsed.tpm_ready.unwrap_or(false),
                    vbs_running: parsed.vbs_running.unwrap_or(false),
                    hvci_running: parsed.hvci_running.unwrap_or(false),
                    hosts_file_clean: parsed.hosts_clean.unwrap_or(true),
                    hosts_custom_entries_count: parsed.hosts_custom_count.unwrap_or(0),
                    details: stdout,
                };
                WindowsToolResult {
                    status: "success".to_string(),
                    message: "Audit sicurezza di sistema completato.".to_string(),
                    details: None,
                    data: Some(data),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile completare l'audit di sicurezza: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    fn parse_smart_json(stdout: &str) -> Vec<DiskSmartHealth> {
        #[derive(Deserialize)]
        struct RawSmart {
            #[serde(rename = "deviceId")]
            device_id: Option<String>,
            #[serde(rename = "friendlyName")]
            friendly_name: Option<String>,
            #[serde(rename = "mediaType")]
            media_type: Option<String>,
            #[serde(rename = "healthStatus")]
            health_status: Option<String>,
            #[serde(rename = "temperature")]
            temperature: Option<i32>,
            #[serde(rename = "wear")]
            wear: Option<u32>,
            #[serde(rename = "readErrors")]
            read_errors: Option<u64>,
            #[serde(rename = "writeErrors")]
            write_errors: Option<u64>,
            #[serde(rename = "powerOnHours")]
            power_on_hours: Option<u64>,
            #[serde(rename = "smartStatus")]
            smart_status: Option<String>,
            #[serde(rename = "smartReason")]
            smart_reason: Option<String>,
        }

        let items: Vec<RawSmart> = if stdout.starts_with('[') {
            serde_json::from_str(stdout).unwrap_or_default()
        } else if stdout.starts_with('{') {
            serde_json::from_str::<RawSmart>(stdout).map(|i| vec![i]).unwrap_or_default()
        } else {
            vec![]
        };

        items
            .into_iter()
            .map(|i| DiskSmartHealth {
                device_id: i.device_id.unwrap_or_else(|| "0".to_string()),
                friendly_name: i.friendly_name.unwrap_or_else(|| "Disco Sconosciuto".to_string()),
                media_type: i.media_type.unwrap_or_else(|| "SSD".to_string()),
                temperature_celsius: i.temperature,
                wear_percentage: i.wear,
                read_errors_total: i.read_errors.unwrap_or(0),
                write_errors_total: i.write_errors.unwrap_or(0),
                power_on_hours: i.power_on_hours,
                health_status: i.health_status.unwrap_or_else(|| "Healthy".to_string()),
                smart_status: i.smart_status.or_else(|| Some("available".to_string())),
                smart_status_reason: i.smart_reason,
            })
            .collect()
    }

    /// Interroga lo stato di salute S.M.A.R.T. e i contatori di affidabilità dei dischi fisici.
    /// Se elevate == false, interroga in user-space e segnala se è richiesta elevazione UAC.
    /// Se elevate == true, esegue con richiesta esplicita UAC per leggere contatori avanzati.
    pub fn get_storage_smart_health_native(elevate: bool) -> WindowsToolResult<Vec<DiskSmartHealth>> {
        let start = Instant::now();
        let cmd = r#"$disks = try { Get-PhysicalDisk -ErrorAction Stop | Select-Object DeviceId, FriendlyName, MediaType, HealthStatus } catch { @() }
$smartStatus = 'available'
$smartReason = $null
$counters = try {
    Get-PhysicalDisk | Get-StorageReliabilityCounter -ErrorAction Stop | Select-Object DeviceId, Temperature, Wear, ReadErrorsTotal, WriteErrorsTotal, PowerOnHours
} catch {
    $msg = $_.Exception.Message
    if ($msg -match 'CIM' -or $msg -match 'Access' -or $msg -match 'denied' -or $msg -match 'autorizzaz') {
        $smartStatus = 'permission_required'
        $smartReason = 'Accesso ai contatori di affidabilità e temperatura limitato: richiede privilegi di amministratore Windows (UAC).'
    } else {
        $smartStatus = 'unavailable'
        $smartReason = $msg
    }
    @()
}
$res = foreach ($d in $disks) {
    $c = $counters | Where-Object { $_.DeviceId -eq $d.DeviceId } | Select-Object -First 1
    [PSCustomObject]@{
        deviceId = [string]$d.DeviceId
        friendlyName = [string]$d.FriendlyName
        mediaType = [string]$d.MediaType
        healthStatus = [string]$d.HealthStatus
        temperature = if ($c -and $c.Temperature -gt 0) { [int]$c.Temperature } else { $null }
        wear = if ($c -and $c.Wear -ne $null) { [int]$c.Wear } else { $null }
        readErrors = if ($c) { [int64]$c.ReadErrorsTotal } else { 0 }
        writeErrors = if ($c) { [int64]$c.WriteErrorsTotal } else { 0 }
        powerOnHours = if ($c) { [int64]$c.PowerOnHours } else { $null }
        smartStatus = if ($c) { 'available' } else { $smartStatus }
        smartReason = if ($c) { $null } else { $smartReason }
    }
}
$res | ConvertTo-Json -Compress"#;

        if elevate {
            let (status, msg, details, exit_code) = run_powershell_elevated_uac(cmd);
            if exit_code == 1223 {
                return WindowsToolResult {
                    status: "cancelled".to_string(),
                    message: "Richiesta di elevazione UAC annullata dall'utente.".to_string(),
                    details: Some(details),
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                };
            }
            if exit_code != 0 {
                return WindowsToolResult {
                    status,
                    message: msg,
                    details: Some(details),
                    data: None,
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: true,
                };
            }
            let stdout = details.trim();
            let smart_list = parse_smart_json(stdout);
            return WindowsToolResult {
                status: "success".to_string(),
                message: format!("Rilevati dati S.M.A.R.T. avanzati con privilegi per {} dischi fisici.", smart_list.len()),
                details: None,
                data: Some(smart_list),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            };
        }

        match run_powershell_hidden(cmd) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let smart_list = parse_smart_json(&stdout);
                let any_perm = smart_list.iter().any(|s| s.smart_status.as_deref() == Some("permission_required"));

                WindowsToolResult {
                    status: "success".to_string(),
                    message: if any_perm {
                        format!("Rilevati {} dischi fisici. Nota: contatori di usura/temperatura richiedono elevazione UAC.", smart_list.len())
                    } else {
                        format!("Rilevati dati S.M.A.R.T. per {} dischi fisici.", smart_list.len())
                    },
                    details: None,
                    data: Some(smart_list),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: any_perm,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile interrogare i dati S.M.A.R.T.: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Sblocca e attiva lo schema Prestazioni Eccellenti (Ultimate Performance)
    pub fn enable_ultimate_performance_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let cmd = "powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61; powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61";
        let (status, msg, details, exit_code) = run_powershell_elevated_uac(cmd);
        WindowsToolResult {
            status,
            message: if exit_code == 0 {
                "Schema Prestazioni Eccellenti (Ultimate Performance) sbloccato e attivato con successo.".to_string()
            } else {
                msg
            },
            details: Some(details),
            data: if exit_code == 0 { Some("e9a42b02-d5df-448d-aa00-03f14749eb61".to_string()) } else { None },
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: true,
        }
    }

    /// Pulisce in sicurezza le cache shader DirectX e GPU di sistema
    pub fn clean_gpu_shader_cache_native() -> WindowsToolResult<ShaderCacheCleanResult> {
        let start = Instant::now();
        let cmd = r#"$paths = @(
    "$env:LOCALAPPDATA\D3DSCache",
    "$env:LOCALAPPDATA\NVIDIA\DXCache",
    "$env:LOCALAPPDATA\AMD\DxCache"
)
$removed = 0
$freed = [int64]0
foreach ($p in $paths) {
    if (Test-Path $p) {
        Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $sz = $_.Length
                Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop
                $removed++
                $freed += $sz
            } catch {}
        }
    }
}
[PSCustomObject]@{
    filesRemoved = $removed
    bytesFreed = $freed
} | ConvertTo-Json -Compress"#;

        match run_powershell_hidden(cmd) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                #[derive(Deserialize)]
                struct RawShader {
                    #[serde(rename = "filesRemoved")]
                    files_removed: Option<u64>,
                    #[serde(rename = "bytesFreed")]
                    bytes_freed: Option<u64>,
                }
                let parsed: RawShader = serde_json::from_str(&stdout).unwrap_or(RawShader { files_removed: Some(0), bytes_freed: Some(0) });
                let files = parsed.files_removed.unwrap_or(0);
                let bytes = parsed.bytes_freed.unwrap_or(0);
                WindowsToolResult {
                    status: "success".to_string(),
                    message: format!("Pulizia Shader Cache GPU completata: {} file rimossi ({:.1} MB liberati).", files, bytes as f64 / (1024.0 * 1024.0)),
                    details: Some(stdout),
                    data: Some(ShaderCacheCleanResult {
                        files_removed: files,
                        bytes_freed: bytes,
                        details: format!("Rimossi {} file di cache DirectX/GPU.", files),
                    }),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Errore durante la pulizia della cache shader: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Esegue la pulizia profonda del repository pacchetti Windows WinSxS Component Store
    pub fn clean_component_store_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let cmd = "DISM.exe /Online /Cleanup-Image /StartComponentCleanup";
        let (status, msg, details, exit_code) = run_powershell_elevated_uac(cmd);
        WindowsToolResult {
            status,
            message: if exit_code == 0 {
                "Pulizia repository WinSxS Component Store completata con successo.".to_string()
            } else {
                msg
            },
            details: Some(details),
            data: if exit_code == 0 { Some("DISM StartComponentCleanup completed".to_string()) } else { None },
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: true,
        }
    }

    /// Riavvia il computer direttamente nel firmware BIOS/UEFI
    pub fn reboot_to_uefi_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let cmd = "shutdown.exe /r /fw /t 0";
        let (status, msg, details, exit_code) = run_powershell_elevated_uac(cmd);
        WindowsToolResult {
            status,
            message: if exit_code == 0 {
                "Riavvio nel BIOS/UEFI avviato con successo.".to_string()
            } else {
                msg
            },
            details: Some(details),
            data: if exit_code == 0 { Some("reboot_uefi".to_string()) } else { None },
            duration_ms: start.elapsed().as_millis() as u64,
            requires_elevation: true,
        }
    }

    /// Controlla la presenza di aggiornamenti software disponibili tramite WinGet
    pub fn check_winget_updates_native() -> WindowsToolResult<Vec<WinGetUpdateItem>> {
        let start = Instant::now();
        let cmd = "winget upgrade --include-unknown";
        match run_powershell_hidden(cmd) {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let mut updates = Vec::new();
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with("Name") || trimmed.starts_with("Nome") || trimmed.starts_with('-') {
                        continue;
                    }
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let name = parts[0];
                        let id = parts[1];
                        let installed = parts[2];
                        let available = parts[3];
                        updates.push(WinGetUpdateItem {
                            name: name.to_string(),
                            id: id.to_string(),
                            installed_version: installed.to_string(),
                            available_version: available.to_string(),
                        });
                    }
                }
                WindowsToolResult {
                    status: "success".to_string(),
                    message: format!("Rilevati {} aggiornamenti disponibili con WinGet.", updates.len()),
                    details: Some(stdout),
                    data: Some(updates),
                    duration_ms: start.elapsed().as_millis() as u64,
                    requires_elevation: false,
                }
            }
            Err(e) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile interrogare WinGet: {}", e),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    fn scan_registry_run_scope(
        root: &RegKey,
        run_path: &str,
        approved_path: &str,
        scope: &str,
        apps: &mut Vec<StartupAppItem>,
    ) {
        let run_key = match root.open_subkey_with_flags(run_path, KEY_READ) {
            Ok(k) => k,
            Err(_) => return,
        };
        let approved_key = root.open_subkey_with_flags(approved_path, KEY_READ).ok();

        for item in run_key.enum_values().flatten() {
            let (name, val) = item;
            let command = val.to_string();
            if name.is_empty() || command.is_empty() {
                continue;
            }

            let raw_bytes: Option<Vec<u8>> = approved_key.as_ref().and_then(|k| {
                k.get_raw_value(&name).ok().map(|v| v.bytes)
            });

            let enabled = decode_startup_approved_status(raw_bytes.as_deref());
            let impact = estimate_startup_impact(&name, &command).to_string();
            let raw_status_hex = raw_bytes.map(|b| {
                b.iter().map(|byte| format!("{:02X}", byte)).collect::<Vec<_>>().join(" ")
            });

            apps.push(StartupAppItem {
                name,
                command,
                scope: scope.to_string(),
                enabled,
                impact,
                raw_status_hex,
            });
        }
    }

    /// Query non-distruttiva (KEY_READ) delle applicazioni configurate per l'avvio automatico
    pub fn query_startup_apps_native() -> StartupAppsSnapshot {
        let mut apps: Vec<StartupAppItem> = Vec::new();
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // HKCU Run
        scan_registry_run_scope(
            &hkcu,
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
            "current_user",
            &mut apps,
        );

        // HKLM Run
        scan_registry_run_scope(
            &hklm,
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
            "local_machine",
            &mut apps,
        );

        // HKLM WOW6432Node Run
        scan_registry_run_scope(
            &hklm,
            "Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run",
            "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32",
            "local_machine_wow64",
            &mut apps,
        );

        // Ordina alfabeticamente per nome
        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        apps.dedup_by(|a, b| a.name.eq_ignore_ascii_case(&b.name) && a.scope == b.scope);

        let total_apps = apps.len() as u32;
        let enabled_count = apps.iter().filter(|a| a.enabled).count() as u32;
        let disabled_count = total_apps.saturating_sub(enabled_count);

        StartupAppsSnapshot {
            availability: "available".to_string(),
            source: "windows_registry_run".to_string(),
            total_apps,
            enabled_count,
            disabled_count,
            apps,
            error_details: None,
        }
    }

    /// Apre l'interfaccia nativa ufficiale "App di avvio" di Windows
    pub fn open_startup_settings_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let res = Command::new("cmd.exe")
            .args(["/c", "start", "ms-settings:startupapps"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        match res {
            Ok(_) => WindowsToolResult {
                status: "success".to_string(),
                message: "Impostazioni App di avvio Windows aperte con successo.".to_string(),
                details: Some("È possibile abilitare o disabilitare le applicazioni in modo sicuro dall'interfaccia ufficiale di Windows.".to_string()),
                data: Some("ms-settings:startupapps".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
            Err(err) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile aprire Impostazioni Windows: {}", err),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Esegue test ICMP Echo (ping) on-demand con calcolo di latenza e jitter
    pub fn run_network_diagnostics_native(target: Option<String>) -> NetworkDiagnosticsResult {
        let start = Instant::now();
        let host = target.unwrap_or_else(|| "1.1.1.1".to_string()).trim().to_string();
        let host = if host.is_empty() { "1.1.1.1".to_string() } else { host };

        let is_valid_host = !host.is_empty()
            && host.len() <= 255
            && host.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':');

        if !is_valid_host {
            return NetworkDiagnosticsResult {
                target_host: host,
                sent_packets: 0,
                received_packets: 0,
                packet_loss_percent: 100.0,
                rtt_min_ms: None,
                rtt_max_ms: None,
                rtt_avg_ms: None,
                jitter_ms: None,
                quality_rating: "offline".to_string(),
                raw_samples: vec![],
                status: "error".to_string(),
                error_details: Some("Target host non valido. Specificare un indirizzo IPv4/IPv6 o hostname valido.".to_string()),
                execution_time_ms: 0,
            };
        }

        let sent_packets = 4;
        let res = Command::new("ping.exe")
            .args(["-n", &sent_packets.to_string(), "-w", "1000", &host])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let duration_ms = start.elapsed().as_millis() as u64;

        match res {
            Ok(output) => {
                let text = String::from_utf8_lossy(&output.stdout);
                parse_ping_output(&text, &host, sent_packets, duration_ms)
            }
            Err(err) => NetworkDiagnosticsResult {
                target_host: host,
                sent_packets,
                received_packets: 0,
                packet_loss_percent: 100.0,
                rtt_min_ms: None,
                rtt_max_ms: None,
                rtt_avg_ms: None,
                jitter_ms: None,
                quality_rating: "offline".to_string(),
                raw_samples: vec![],
                status: "error".to_string(),
                error_details: Some(format!("Errore esecuzione ping: {}", err)),
                execution_time_ms: duration_ms,
            },
        }
    }

    /// Rileva flag di riavvio pendente (RebootRequired, CBS, PendingFileRenameOperations) e date aggiornamento
    pub fn query_windows_update_status_native() -> WindowsUpdateStatus {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut reboot_sources: Vec<String> = Vec::new();
        let mut last_check_time: Option<String> = None;
        let mut last_install_time: Option<String> = None;
        let mut pending_file_rename_count: u32 = 0;

        // 1. WindowsUpdate Auto Update RebootRequired
        if hklm.open_subkey_with_flags(
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired",
            KEY_READ,
        ).is_ok() {
            reboot_sources.push("WindowsUpdate: RebootRequired".to_string());
        }

        // 2. Component Based Servicing RebootPending
        if hklm.open_subkey_with_flags(
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending",
            KEY_READ,
        ).is_ok() {
            reboot_sources.push("CBS: RebootPending".to_string());
        }

        // 3. Session Manager PendingFileRenameOperations
        if let Ok(sm_key) = hklm.open_subkey_with_flags(
            "SYSTEM\\CurrentControlSet\\Control\\Session Manager",
            KEY_READ,
        ) {
            if let Ok(raw_val) = sm_key.get_raw_value("PendingFileRenameOperations") {
                if !raw_val.bytes.is_empty() {
                    let op_count = raw_val.bytes.windows(2).filter(|w| w[0] == 0 && w[1] == 0).count() as u32;
                    let count = if op_count == 0 { 1 } else { op_count };
                    pending_file_rename_count = count;
                    reboot_sources.push(format!("SessionManager: PendingFileRenameOperations ({} file)", count));
                }
            }
        }

        // 4. Date di ultimo check / installazione
        if let Ok(detect_key) = hklm.open_subkey_with_flags(
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\Results\\Detect",
            KEY_READ,
        ) {
            if let Ok(ts) = detect_key.get_value::<String, _>("LastSuccessTime") {
                if !ts.trim().is_empty() {
                    last_check_time = Some(ts.trim().to_string());
                }
            }
        }

        if let Ok(install_key) = hklm.open_subkey_with_flags(
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\Results\\Install",
            KEY_READ,
        ) {
            if let Ok(ts) = install_key.get_value::<String, _>("LastSuccessTime") {
                if !ts.trim().is_empty() {
                    last_install_time = Some(ts.trim().to_string());
                }
            }
        }

        let reboot_pending = !reboot_sources.is_empty();
        let details = if reboot_pending {
            Some(format!(
                "Rilevato riavvio pendente da: {}.",
                reboot_sources.join(", ")
            ))
        } else {
            Some("Nessun riavvio pendente rilevato nel sistema operativo.".to_string())
        };

        WindowsUpdateStatus {
            availability: "available".to_string(),
            source: "windows_registry_update_flags".to_string(),
            reboot_pending,
            reboot_sources,
            last_check_time,
            last_install_time,
            pending_file_rename_count,
            details,
        }
    }

    #[repr(C)]
    struct RECT {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }

    #[repr(C)]
    struct MONITORINFOEXW {
        cb_size: u32,
        rc_monitor: RECT,
        rc_work: RECT,
        dw_flags: u32,
        sz_device: [u16; 32],
    }

    #[repr(C)]
    struct DISPLAY_DEVICEW {
        cb: u32,
        device_name: [u16; 32],
        device_string: [u16; 128],
        state_flags: u32,
        device_id: [u16; 128],
        device_key: [u16; 128],
    }

    #[repr(C)]
    struct DEVMODEW {
        dm_device_name: [u16; 32],
        dm_spec_version: u16,
        dm_driver_version: u16,
        dm_size: u16,
        dm_driver_extra: u16,
        dm_fields: u32,
        dm_orientation: i16,
        dm_paper_size: i16,
        dm_paper_length: i16,
        dm_paper_width: i16,
        dm_scale: i16,
        dm_copies: i16,
        dm_default_source: i16,
        dm_print_quality: i16,
        dm_color: i16,
        dm_duplex: i16,
        dm_y_resolution: i16,
        dm_tt_option: i16,
        dm_collate: i16,
        dm_form_name: [u16; 32],
        dm_log_pixels: u16,
        dm_bits_per_pel: u32,
        dm_pels_width: u32,
        dm_pels_height: u32,
        dm_display_flags: u32,
        dm_display_frequency: u32,
        dm_icm_method: u32,
        dm_icm_intent: u32,
        dm_media_type: u32,
        dm_dither_type: u32,
        dm_reserved1: u32,
        dm_reserved2: u32,
        dm_panning_width: u32,
        dm_panning_height: u32,
    }

    type EnumDisplayMonitorsFn = unsafe extern "system" fn(
        hdc: *mut std::ffi::c_void,
        lprc_clip: *const RECT,
        lpfn_enum: unsafe extern "system" fn(*mut std::ffi::c_void, *mut std::ffi::c_void, *mut RECT, isize) -> i32,
        dw_data: isize,
    ) -> i32;

    type GetMonitorInfoWFn = unsafe extern "system" fn(
        h_monitor: *mut std::ffi::c_void,
        lpmi: *mut MONITORINFOEXW,
    ) -> i32;

    type EnumDisplayDevicesWFn = unsafe extern "system" fn(
        lp_device: *const u16,
        i_dev_num: u32,
        lp_display_device: *mut DISPLAY_DEVICEW,
        dw_flags: u32,
    ) -> i32;

    type EnumDisplaySettingsWFn = unsafe extern "system" fn(
        lpsz_device_name: *const u16,
        i_mode_num: u32,
        lp_dev_mode: *mut DEVMODEW,
    ) -> i32;

    type GetDpiForMonitorFn = unsafe extern "system" fn(
        h_monitor: *mut std::ffi::c_void,
        dpi_type: u32,
        dpi_x: *mut u32,
        dpi_y: *mut u32,
    ) -> i32;

    /// Rileva tutti i monitor attivi con risoluzione, refresh rate corrente, massimo supportato e DPI
    pub fn query_display_diagnostics_native() -> DisplayDiagnosticsSnapshot {
        unsafe {
            let user32 = LoadLibraryA(b"user32.dll\0".as_ptr() as *const i8);
            if user32.is_null() {
                return DisplayDiagnosticsSnapshot {
                    availability: "error".to_string(),
                    source: "win32_enum_display".to_string(),
                    total_monitors: 0,
                    monitors: vec![],
                    has_high_refresh_rate_mismatch: false,
                    has_mixed_refresh_rates: false,
                    error_details: Some("Impossibile caricare user32.dll".to_string()),
                };
            }

            let fn_enum_monitors: Option<EnumDisplayMonitorsFn> = {
                let p = GetProcAddress(user32, b"EnumDisplayMonitors\0".as_ptr() as *const i8);
                if p.is_null() { None } else { Some(std::mem::transmute(p)) }
            };
            let fn_get_mon_info: Option<GetMonitorInfoWFn> = {
                let p = GetProcAddress(user32, b"GetMonitorInfoW\0".as_ptr() as *const i8);
                if p.is_null() { None } else { Some(std::mem::transmute(p)) }
            };
            let fn_enum_devices: Option<EnumDisplayDevicesWFn> = {
                let p = GetProcAddress(user32, b"EnumDisplayDevicesW\0".as_ptr() as *const i8);
                if p.is_null() { None } else { Some(std::mem::transmute(p)) }
            };
            let fn_enum_settings: Option<EnumDisplaySettingsWFn> = {
                let p = GetProcAddress(user32, b"EnumDisplaySettingsW\0".as_ptr() as *const i8);
                if p.is_null() { None } else { Some(std::mem::transmute(p)) }
            };

            let shcore = LoadLibraryA(b"shcore.dll\0".as_ptr() as *const i8);
            let fn_get_dpi: Option<GetDpiForMonitorFn> = if !shcore.is_null() {
                let p = GetProcAddress(shcore, b"GetDpiForMonitor\0".as_ptr() as *const i8);
                if p.is_null() { None } else { Some(std::mem::transmute(p)) }
            } else {
                None
            };

            if fn_enum_monitors.is_none() || fn_get_mon_info.is_none() || fn_enum_settings.is_none() {
                FreeLibrary(user32);
                if !shcore.is_null() {
                    FreeLibrary(shcore);
                }
                return DisplayDiagnosticsSnapshot {
                    availability: "error".to_string(),
                    source: "win32_enum_display".to_string(),
                    total_monitors: 0,
                    monitors: vec![],
                    has_high_refresh_rate_mismatch: false,
                    has_mixed_refresh_rates: false,
                    error_details: Some("Funzioni Win32 EnumDisplay non disponibili".to_string()),
                };
            }

            let fn_enum_monitors = fn_enum_monitors.unwrap();
            let fn_get_mon_info = fn_get_mon_info.unwrap();
            let fn_enum_settings = fn_enum_settings.unwrap();

            unsafe extern "system" fn collect_mon_cb(
                h_mon: *mut std::ffi::c_void,
                _hdc: *mut std::ffi::c_void,
                _rc: *mut RECT,
                dw_data: isize,
            ) -> i32 {
                let list = &mut *(dw_data as *mut Vec<*mut std::ffi::c_void>);
                list.push(h_mon);
                1
            }

            let mut h_monitors: Vec<*mut std::ffi::c_void> = Vec::new();
            fn_enum_monitors(
                std::ptr::null_mut(),
                std::ptr::null(),
                collect_mon_cb,
                &mut h_monitors as *mut Vec<*mut std::ffi::c_void> as isize,
            );

            let mut monitors_info: Vec<MonitorInfo> = Vec::new();

            for (idx, &h_mon) in h_monitors.iter().enumerate() {
                let mut mi: MONITORINFOEXW = std::mem::zeroed();
                mi.cb_size = std::mem::size_of::<MONITORINFOEXW>() as u32;

                if fn_get_mon_info(h_mon, &mut mi) == 0 {
                    continue;
                }

                let is_primary = (mi.dw_flags & 1) != 0;
                let v_bounds = MonitorVirtualBounds {
                    x: mi.rc_monitor.left,
                    y: mi.rc_monitor.top,
                    width: (mi.rc_monitor.right - mi.rc_monitor.left).max(0) as u32,
                    height: (mi.rc_monitor.bottom - mi.rc_monitor.top).max(0) as u32,
                };

                let sz_len = mi.sz_device.iter().position(|&c| c == 0).unwrap_or(mi.sz_device.len());
                let adapter_name = String::from_utf16_lossy(&mi.sz_device[..sz_len]);

                // Current settings (ENUM_CURRENT_SETTINGS = 0xFFFFFFFF)
                let mut current_dm: DEVMODEW = std::mem::zeroed();
                current_dm.dm_size = std::mem::size_of::<DEVMODEW>() as u16;

                let (current_res, current_hz, bpp, orientation) = if fn_enum_settings(
                    mi.sz_device.as_ptr(),
                    0xFFFFFFFF,
                    &mut current_dm,
                ) != 0 {
                    let orient_str = match current_dm.dm_orientation {
                        0 => "landscape",
                        1 => "portrait",
                        2 => "landscape_flipped",
                        3 => "portrait_flipped",
                        _ => "unknown",
                    };
                    (
                        MonitorResolution {
                            width: current_dm.dm_pels_width,
                            height: current_dm.dm_pels_height,
                        },
                        current_dm.dm_display_frequency,
                        current_dm.dm_bits_per_pel,
                        orient_str.to_string(),
                    )
                } else {
                    (
                        MonitorResolution {
                            width: v_bounds.width,
                            height: v_bounds.height,
                        },
                        60,
                        32,
                        "landscape".to_string(),
                    )
                };

                // Enumerate supported refresh rates for current resolution
                let mut supported_rates = std::collections::BTreeSet::new();
                if current_hz > 0 {
                    supported_rates.insert(current_hz);
                }

                let mut mode_idx = 0u32;
                loop {
                    let mut mode_dm: DEVMODEW = std::mem::zeroed();
                    mode_dm.dm_size = std::mem::size_of::<DEVMODEW>() as u16;

                    if fn_enum_settings(mi.sz_device.as_ptr(), mode_idx, &mut mode_dm) == 0 {
                        break;
                    }

                    if mode_dm.dm_pels_width == current_res.width
                        && mode_dm.dm_pels_height == current_res.height
                        && mode_dm.dm_display_frequency > 0
                    {
                        supported_rates.insert(mode_dm.dm_display_frequency);
                    }

                    mode_idx += 1;
                    if mode_idx > 1000 {
                        break;
                    }
                }

                let rates_vec: Vec<u32> = supported_rates.into_iter().collect();
                let max_hz = *rates_vec.iter().max().unwrap_or(&current_hz);
                let is_limited = is_monitor_refresh_rate_limited(max_hz, current_hz);

                // Friendly Name
                let mut monitor_name = format!("Display {}", idx + 1);
                if let Some(fn_enum_dev) = fn_enum_devices {
                    let mut disp_dev: DISPLAY_DEVICEW = std::mem::zeroed();
                    disp_dev.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;

                    if fn_enum_dev(mi.sz_device.as_ptr(), 0, &mut disp_dev, 0) != 0 {
                        let dev_str_len = disp_dev.device_string.iter().position(|&c| c == 0).unwrap_or(disp_dev.device_string.len());
                        let name_str = String::from_utf16_lossy(&disp_dev.device_string[..dev_str_len]).trim().to_string();
                        if !name_str.is_empty() && !name_str.eq_ignore_ascii_case("Generic PnP Monitor") {
                            monitor_name = name_str;
                        } else if !name_str.is_empty() {
                            monitor_name = format!("{} ({})", name_str, adapter_name);
                        }
                    }
                }

                // DPI scale
                let dpi_scale = if let Some(fn_dpi) = fn_get_dpi {
                    let mut dpi_x = 96u32;
                    let mut dpi_y = 96u32;
                    if fn_dpi(h_mon, 0, &mut dpi_x, &mut dpi_y) == 0 {
                        ((dpi_x as f64 / 96.0) * 100.0).round() as u32
                    } else {
                        100
                    }
                } else {
                    100
                };

                let mon_id = if !adapter_name.is_empty() {
                    adapter_name.clone()
                } else {
                    format!("MONITOR_{}", idx + 1)
                };

                monitors_info.push(MonitorInfo {
                    id: mon_id,
                    monitor_name,
                    adapter_name,
                    current_resolution: current_res,
                    current_refresh_rate: current_hz,
                    max_supported_refresh_rate: max_hz,
                    supported_refresh_rates: rates_vec,
                    bits_per_pixel: bpp,
                    orientation,
                    is_primary,
                    virtual_bounds: v_bounds,
                    dpi_scale_percent: dpi_scale,
                    is_refresh_rate_limited: is_limited,
                });
            }

            FreeLibrary(user32);
            if !shcore.is_null() {
                FreeLibrary(shcore);
            }

            let has_mismatch = monitors_info.iter().any(|m| m.is_refresh_rate_limited);
            let unique_rates: std::collections::HashSet<u32> = monitors_info.iter().map(|m| m.current_refresh_rate).collect();
            let has_mixed = monitors_info.len() > 1 && unique_rates.len() > 1;

            DisplayDiagnosticsSnapshot {
                availability: "available".to_string(),
                source: "win32_enum_display".to_string(),
                total_monitors: monitors_info.len() as u32,
                monitors: monitors_info,
                has_high_refresh_rate_mismatch: has_mismatch,
                has_mixed_refresh_rates: has_mixed,
                error_details: None,
            }
        }
    }

    /// Rileva gli endpoint audio attivi da MMDevices, formato di campionamento e stato dei servizi audio
    pub fn detect_audio_glitches_or_status_native() -> AudioDiagnosticsSnapshot {
        let mut devices: Vec<AudioDeviceInfo> = Vec::new();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        if let Ok(render_key) = hklm.open_subkey_with_flags(
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
            KEY_READ,
        ) {
            for subkey_name in render_key.enum_keys().filter_map(|k| k.ok()) {
                if let Ok(dev_key) = render_key.open_subkey_with_flags(&subkey_name, KEY_READ) {
                    let state_raw: u32 = dev_key.get_value("DeviceState").unwrap_or(0);
                    let state_str = match state_raw {
                        1 => "active",
                        2 => "disabled",
                        4 => "not_present",
                        8 => "unplugged",
                        _ => "unknown",
                    };

                    let mut friendly_name = subkey_name.clone();
                    let mut driver_name: Option<String> = None;
                    let mut sample_rate_hz: Option<u32> = None;
                    let mut bit_depth: Option<u32> = None;
                    let mut channels: Option<u32> = None;

                    if let Ok(props_key) = dev_key.open_subkey_with_flags("Properties", KEY_READ) {
                        if let Ok(name_val) = props_key.get_value::<String, _>("{a45c254e-df1c-4efd-8020-67d146a850e0},2") {
                            if !name_val.trim().is_empty() {
                                friendly_name = name_val.trim().to_string();
                            }
                        }

                        if let Ok(drv_val) = props_key.get_value::<String, _>("{b3f8fa53-0004-438e-9003-51a46e139bfc},6") {
                            driver_name = Some(drv_val.trim().to_string());
                        }

                        // Read PKEY_AudioEngine_DeviceFormat binary blob: {f19f064d-082c-4e27-bc73-6882a1bb8e4c},0
                        if let Ok(raw_blob) = props_key.get_raw_value("{f19f064d-082c-4e27-bc73-6882a1bb8e4c},0") {
                            let bytes = &raw_blob.bytes;
                            if bytes.len() >= 24 {
                                let ch = u16::from_le_bytes([bytes[10], bytes[11]]) as u32;
                                let hz = u32::from_le_bytes([bytes[12], bytes[13], bytes[14], bytes[15]]);
                                let bits = u16::from_le_bytes([bytes[22], bytes[23]]) as u32;
                                if hz > 0 && hz < 1_000_000 {
                                    sample_rate_hz = Some(hz);
                                }
                                if bits > 0 && bits <= 64 {
                                    bit_depth = Some(bits);
                                }
                                if ch > 0 && ch <= 32 {
                                    channels = Some(ch);
                                }
                            }
                        }
                    }

                    if state_str == "active" || state_str == "disabled" {
                        devices.push(AudioDeviceInfo {
                            id: subkey_name,
                            name: friendly_name,
                            is_default: false,
                            state: state_str.to_string(),
                            sample_rate_hz,
                            bit_depth,
                            channels,
                            driver_name,
                        });
                    }
                }
            }
        }

        // Determina il default device con euristica su speaker/altoparlanti o primo attivo
        let mut default_idx = None;
        for (i, d) in devices.iter().enumerate() {
            if d.state == "active" {
                let lower = d.name.to_lowercase();
                if lower.contains("altoparlanti")
                    || lower.contains("speakers")
                    || lower.contains("cuffie")
                    || lower.contains("headphones")
                {
                    default_idx = Some(i);
                    break;
                }
            }
        }
        if default_idx.is_none() {
            default_idx = devices.iter().position(|d| d.state == "active");
        }
        if let Some(idx) = default_idx {
            devices[idx].is_default = true;
        }

        let default_device = devices.iter().find(|d| d.is_default);
        let default_name = default_device.map(|d| d.name.clone());
        let default_hz = default_device.and_then(|d| d.sample_rate_hz);
        let default_bits = default_device.and_then(|d| d.bit_depth);
        let default_channels = default_device.and_then(|d| d.channels);

        let (audio_srv, endpoint_builder) = check_audio_services_status();
        let (status, glitch_detected, summary) = classify_audio_engine_status(audio_srv, default_hz, default_bits);

        AudioDiagnosticsSnapshot {
            availability: "available".to_string(),
            source: "win32_audio_engine".to_string(),
            default_device_name: default_name,
            default_sample_rate_hz: default_hz,
            default_bit_depth: default_bits,
            default_channels,
            devices,
            audio_service_running: audio_srv,
            audio_endpoint_builder_running: endpoint_builder,
            engine_status: status.to_string(),
            glitch_or_issue_detected: glitch_detected,
            issue_summary: Some(summary.to_string()),
            error_details: None,
        }
    }

    fn check_audio_services_status() -> (bool, bool) {
        unsafe {
            let advapi32 = LoadLibraryA(b"advapi32.dll\0".as_ptr() as *const i8);
            if advapi32.is_null() {
                return (true, true);
            }

            type OpenSCManagerWFn = unsafe extern "system" fn(*const u16, *const u16, u32) -> *mut std::ffi::c_void;
            type OpenServiceWFn = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, u32) -> *mut std::ffi::c_void;
            type QueryServiceStatusExFn = unsafe extern "system" fn(*mut std::ffi::c_void, u32, *mut u8, u32, *mut u32) -> i32;
            type CloseServiceHandleFn = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;

            let p_open_scm = GetProcAddress(advapi32, b"OpenSCManagerW\0".as_ptr() as *const i8);
            let p_open_svc = GetProcAddress(advapi32, b"OpenServiceW\0".as_ptr() as *const i8);
            let p_query_stat = GetProcAddress(advapi32, b"QueryServiceStatusEx\0".as_ptr() as *const i8);
            let p_close = GetProcAddress(advapi32, b"CloseServiceHandle\0".as_ptr() as *const i8);

            if p_open_scm.is_null() || p_open_svc.is_null() || p_query_stat.is_null() || p_close.is_null() {
                FreeLibrary(advapi32);
                return (true, true);
            }

            let fn_open_scm: OpenSCManagerWFn = std::mem::transmute(p_open_scm);
            let fn_open_svc: OpenServiceWFn = std::mem::transmute(p_open_svc);
            let fn_query_stat: QueryServiceStatusExFn = std::mem::transmute(p_query_stat);
            let fn_close: CloseServiceHandleFn = std::mem::transmute(p_close);

            let scm = fn_open_scm(std::ptr::null(), std::ptr::null(), 0x0001); // SC_MANAGER_CONNECT
            if scm.is_null() {
                FreeLibrary(advapi32);
                return (true, true);
            }

            let check_svc = |name: &str| -> bool {
                let mut name_w: Vec<u16> = name.encode_utf16().collect();
                name_w.push(0);
                let svc = fn_open_svc(scm, name_w.as_ptr(), 0x0004); // SERVICE_QUERY_STATUS
                if svc.is_null() {
                    return false;
                }
                let mut buf = [0u8; 36];
                let mut needed = 0u32;
                let ok = fn_query_stat(svc, 0, buf.as_mut_ptr(), 36, &mut needed);
                fn_close(svc);
                if ok != 0 {
                    let state = u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]);
                    state == 4 // SERVICE_RUNNING
                } else {
                    false
                }
            };

            let audiosrv_running = check_svc("Audiosrv");
            let endpoint_running = check_svc("AudioEndpointBuilder");

            fn_close(scm);
            FreeLibrary(advapi32);

            (audiosrv_running, endpoint_running)
        }
    }

    /// Apre l'interfaccia nativa ufficiale "Impostazioni schermo avanzate" di Windows
    pub fn open_display_settings_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let res = Command::new("cmd.exe")
            .args(["/c", "start", "ms-settings:display-advanced"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        match res {
            Ok(_) => WindowsToolResult {
                status: "success".to_string(),
                message: "Impostazioni Schermo Avanzate aperte con successo.".to_string(),
                details: Some("È possibile configurare il refresh rate (Hz) e la profondità colore nativamente in Windows.".to_string()),
                data: Some("ms-settings:display-advanced".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
            Err(err) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile aprire Impostazioni Schermo: {}", err),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    /// Apre l'interfaccia nativa ufficiale "Impostazioni audio" di Windows
    pub fn open_sound_settings_native() -> WindowsToolResult<String> {
        let start = Instant::now();
        let res = Command::new("cmd.exe")
            .args(["/c", "start", "ms-settings:sound"])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        match res {
            Ok(_) => WindowsToolResult {
                status: "success".to_string(),
                message: "Impostazioni Audio di Windows aperte con successo.".to_string(),
                details: Some("È possibile configurare i dispositivi di output, sample rate e bit depth nelle impostazioni audio.".to_string()),
                data: Some("ms-settings:sound".to_string()),
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
            Err(err) => WindowsToolResult {
                status: "failed".to_string(),
                message: format!("Impossibile aprire Impostazioni Audio: {}", err),
                details: None,
                data: None,
                duration_ms: start.elapsed().as_millis() as u64,
                requires_elevation: false,
            },
        }
    }

    #[repr(C)]
    struct SOCKET_ADDRESS {
        lp_sockaddr: *mut std::ffi::c_void,
        i_sockaddr_length: i32,
    }

    #[repr(C)]
    struct IP_ADAPTER_UNICAST_ADDRESS_LH {
        alignment: u64,
        next: *mut IP_ADAPTER_UNICAST_ADDRESS_LH,
        address: SOCKET_ADDRESS,
    }

    #[repr(C)]
    struct IP_ADAPTER_GATEWAY_ADDRESS_LH {
        alignment: u64,
        next: *mut IP_ADAPTER_GATEWAY_ADDRESS_LH,
        address: SOCKET_ADDRESS,
    }

    #[repr(C)]
    struct IP_ADAPTER_ADDRESSES_LH {
        alignment: u64,
        next: *mut IP_ADAPTER_ADDRESSES_LH,
        adapter_name: *const i8,
        first_unicast_address: *mut IP_ADAPTER_UNICAST_ADDRESS_LH,
        first_anycast_address: *mut std::ffi::c_void,
        first_multicast_address: *mut std::ffi::c_void,
        first_dns_server_address: *mut std::ffi::c_void,
        dns_suffix: *const u16,
        description: *const u16,
        friendly_name: *const u16,
        physical_address: [u8; 8],
        physical_address_length: u32,
        flags: u32,
        mtu: u32,
        if_type: u32,
        oper_status: u32,
        ipv6_if_index: u32,
        zone_indices: [u32; 16],
        first_prefix: *mut std::ffi::c_void,
        transmit_link_speed: u64,
        receive_link_speed: u64,
        first_wins_server_address: *mut std::ffi::c_void,
        first_gateway_address: *mut IP_ADAPTER_GATEWAY_ADDRESS_LH,
    }

    type GetAdaptersAddressesFn = unsafe extern "system" fn(
        family: u32,
        flags: u32,
        reserved: *mut std::ffi::c_void,
        adapter_addresses: *mut IP_ADAPTER_ADDRESSES_LH,
        size_pointer: *mut u32,
    ) -> u32;

    /// Interroga Win32 IP Helper (GetAdaptersAddresses) e parametri di rete fisici per rilevare
    /// la scheda di rete attiva, tipologia, link speed negoziato e indirizzi IP.
    pub fn query_network_adapter_details_native() -> NetworkAdapterSnapshot {
        let mut adapter_name = String::new();
        let mut description = String::new();
        let mut adapter_type = "ethernet".to_string();
        let status = "connected".to_string();
        let mut link_speed_mbps = 0u64;
        let mut mac_address = None;
        let mut ipv4 = None;
        let mut ipv6 = None;
        let mut gateway = None;
        let dhcp_enabled = true;

        // 1. Interrogazione FFI Win32 IP Helper (iphlpapi.dll -> GetAdaptersAddresses)
        unsafe {
            let iphlpapi = LoadLibraryA(b"iphlpapi.dll\0".as_ptr() as *const i8);
            if !iphlpapi.is_null() {
                let p_get_adapters = GetProcAddress(iphlpapi, b"GetAdaptersAddresses\0".as_ptr() as *const i8);
                if !p_get_adapters.is_null() {
                    let fn_get_adapters: GetAdaptersAddressesFn = std::mem::transmute(p_get_adapters);
                    let mut buf_len: u32 = 16384;
                    let mut buffer: Vec<u8> = vec![0u8; buf_len as usize];

                    let mut ret = fn_get_adapters(
                        0, // AF_UNSPEC
                        0x0080 | 0x0010, // GAA_FLAG_INCLUDE_GATEWAYS | GAA_FLAG_INCLUDE_ALL_INTERFACES
                        std::ptr::null_mut(),
                        buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
                        &mut buf_len,
                    );

                    if ret == 111 { // ERROR_BUFFER_OVERFLOW
                        buffer = vec![0u8; buf_len as usize];
                        ret = fn_get_adapters(
                            0,
                            0x0080 | 0x0010,
                            std::ptr::null_mut(),
                            buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
                            &mut buf_len,
                        );
                    }

                    if ret == 0 { // NO_ERROR
                        let mut curr = buffer.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
                        while !curr.is_null() {
                            let item = &*curr;
                            // Filtriamo interfacce fisiche Ethernet (6) o Wi-Fi (71)
                            if (item.if_type == 6 || item.if_type == 71) && item.oper_status == 1 {
                                // Nome amichevole
                                if !item.friendly_name.is_null() {
                                    let mut len = 0;
                                    while *item.friendly_name.add(len) != 0 { len += 1; }
                                    let slice = std::slice::from_raw_parts(item.friendly_name, len);
                                    let f_name = String::from_utf16_lossy(slice);
                                    if !f_name.trim().is_empty() {
                                        adapter_name = f_name.trim().to_string();
                                    }
                                }

                                // Descrizione hardware
                                if !item.description.is_null() {
                                    let mut len = 0;
                                    while *item.description.add(len) != 0 { len += 1; }
                                    let slice = std::slice::from_raw_parts(item.description, len);
                                    let desc = String::from_utf16_lossy(slice);
                                    if !desc.trim().is_empty() {
                                        description = desc.trim().to_string();
                                    }
                                }

                                adapter_type = if item.if_type == 71 { "wifi".to_string() } else { "ethernet".to_string() };

                                if item.transmit_link_speed > 0 {
                                    link_speed_mbps = item.transmit_link_speed / 1_000_000;
                                }

                                // MAC address
                                if item.physical_address_length == 6 {
                                    mac_address = Some(format!(
                                        "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                                        item.physical_address[0], item.physical_address[1],
                                        item.physical_address[2], item.physical_address[3],
                                        item.physical_address[4], item.physical_address[5]
                                    ));
                                }

                                break;
                            }
                            curr = item.next;
                        }
                    }
                }
                FreeLibrary(iphlpapi);
            }
        }

        // 2. Integrazione con Get-NetAdapter -Physical per convalida link speed nominale/negoziato
        if link_speed_mbps == 0 || adapter_name.is_empty() {
            let res = Command::new("powershell.exe")
                .args([
                    "-NoProfile",
                    "-Command",
                    "Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | Select-Object -First 1 Name, InterfaceDescription, MediaType, LinkSpeed, MacAddress | ConvertTo-Json",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .output();

            if let Ok(output) = res {
                let json_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    if let Some(n) = val.get("Name").and_then(|v| v.as_str()) {
                        adapter_name = n.to_string();
                    }
                    if let Some(d) = val.get("InterfaceDescription").and_then(|v| v.as_str()) {
                        description = d.to_string();
                    }
                    if let Some(m) = val.get("MediaType").and_then(|v| v.as_str()) {
                        adapter_type = if m.to_lowercase().contains("802.11") || m.to_lowercase().contains("wireless") {
                            "wifi".to_string()
                        } else {
                            "ethernet".to_string()
                        };
                    }
                    if let Some(ls) = val.get("LinkSpeed").and_then(|v| v.as_str()) {
                        let parsed = parse_link_speed_to_mbps(ls);
                        if parsed > 0 {
                            link_speed_mbps = parsed;
                        }
                    }
                    if let Some(mac) = val.get("MacAddress").and_then(|v| v.as_str()) {
                        if !mac.trim().is_empty() {
                            mac_address = Some(mac.trim().replace('-', ":").to_uppercase());
                        }
                    }
                }
            }
        }

        // 3. Estrazione IPv4 e Gateway da ipconfig
        let ipcfg_res = Command::new("ipconfig.exe")
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(output) = ipcfg_res {
            let text = String::from_utf8_lossy(&output.stdout);
            let mut current_block_matches = false;
            for line in text.lines() {
                let trimmed = line.trim();
                if line.starts_with("Ethernet adapter") || line.starts_with("Wireless LAN adapter") || line.starts_with("Scheda Ethernet") || line.starts_with("Scheda LAN wireless") {
                    current_block_matches = line.to_lowercase().contains(&adapter_name.to_lowercase())
                        || (adapter_name.is_empty() && (line.contains("Ethernet") || line.contains("Wi-Fi")));
                } else if current_block_matches {
                    if trimmed.starts_with("IPv4") || trimmed.starts_with("Indirizzo IPv4") {
                        if let Some(pos) = trimmed.find(':') {
                            let ip = trimmed[pos + 1..].trim().replace("(Preferred)", "").replace("(Preferenziale)", "");
                            if !ip.trim().is_empty() && ipv4.is_none() {
                                ipv4 = Some(ip.trim().to_string());
                            }
                        }
                    } else if trimmed.starts_with("Default Gateway") || trimmed.starts_with("Gateway predefinito") {
                        if let Some(pos) = trimmed.find(':') {
                            let gw = trimmed[pos + 1..].trim();
                            if !gw.is_empty() && gateway.is_none() {
                                gateway = Some(gw.to_string());
                            }
                        }
                    } else if trimmed.starts_with("Link-local IPv6") || trimmed.starts_with("Indirizzo IPv6 locale rispetto al collegamento") {
                        if let Some(pos) = trimmed.find(':') {
                            let ip6 = trimmed[pos + 1..].trim();
                            if !ip6.is_empty() && ipv6.is_none() {
                                ipv6 = Some(ip6.to_string());
                            }
                        }
                    }
                }
            }
        }

        let max_speed_mbps = estimate_max_speed_from_desc(&description);
        let is_link_speed_downgraded = evaluate_ethernet_link_speed_downgrade(
            &adapter_type,
            &description,
            link_speed_mbps,
            max_speed_mbps,
        );

        if adapter_name.is_empty() {
            adapter_name = "Ethernet".to_string();
        }

        NetworkAdapterSnapshot {
            availability: "available".to_string(),
            source: "win32_iphelper".to_string(),
            adapter_name,
            description,
            adapter_type,
            status,
            link_speed_mbps,
            max_speed_mbps,
            is_link_speed_downgraded,
            ipv4,
            ipv6,
            gateway,
            mac_address,
            dhcp_enabled,
            error_details: None,
        }
    }

    /// Interroga Windows Native Wifi API (wlanapi.dll) e netsh wlan per rilevare SSID connesso,
    /// qualità del segnale in percentuale, RSSI, banda e standard Wi-Fi (Wi-Fi 6/6E/7).
    pub fn query_wifi_signal_metrics_native() -> WifiSignalSnapshot {
        unsafe {
            let wlanapi = LoadLibraryA(b"wlanapi.dll\0".as_ptr() as *const i8);
            if !wlanapi.is_null() {
                type WlanOpenHandleFn = unsafe extern "system" fn(u32, *mut std::ffi::c_void, *mut u32, *mut *mut std::ffi::c_void) -> u32;
                type WlanCloseHandleFn = unsafe extern "system" fn(*mut std::ffi::c_void, *mut std::ffi::c_void) -> u32;

                let p_open = GetProcAddress(wlanapi, b"WlanOpenHandle\0".as_ptr() as *const i8);
                let p_close = GetProcAddress(wlanapi, b"WlanCloseHandle\0".as_ptr() as *const i8);

                if !p_open.is_null() && !p_close.is_null() {
                    let fn_open: WlanOpenHandleFn = std::mem::transmute(p_open);
                    let fn_close: WlanCloseHandleFn = std::mem::transmute(p_close);
                    let mut negotiated_ver = 0u32;
                    let mut client_h = std::ptr::null_mut();
                    if fn_open(2, std::ptr::null_mut(), &mut negotiated_ver, &mut client_h) == 0 {
                        fn_close(client_h, std::ptr::null_mut());
                    }
                }
                FreeLibrary(wlanapi);
            }
        }

        let res = Command::new("netsh.exe")
            .args(["wlan", "show", "interfaces"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match res {
            Ok(output) => {
                let text = String::from_utf8_lossy(&output.stdout);
                parse_netsh_wifi_output(&text)
            }
            Err(err) => WifiSignalSnapshot {
                availability: "error".to_string(),
                source: "win32_wlanapi".to_string(),
                is_connected: false,
                ssid: None,
                bssid: None,
                signal_quality_percent: 0,
                rssi_dbm: -100,
                band: "unknown".to_string(),
                standard: "unknown".to_string(),
                channel: None,
                error_details: Some(format!("Errore esecuzione netsh wlan: {}", err)),
            },
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

#[tauri::command]
pub async fn create_restore_point(description: Option<String>) -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::create_restore_point_native(&description.unwrap_or_default()))
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
pub async fn query_security_audit() -> Result<WindowsToolResult<SecurityAuditData>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_security_audit_native())
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
pub async fn get_storage_smart_health(elevate: Option<bool>) -> Result<WindowsToolResult<Vec<DiskSmartHealth>>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::get_storage_smart_health_native(elevate.unwrap_or(false)))
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
pub async fn enable_ultimate_performance() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::enable_ultimate_performance_native())
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
pub async fn clean_gpu_shader_cache() -> Result<WindowsToolResult<ShaderCacheCleanResult>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::clean_gpu_shader_cache_native())
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
pub async fn clean_component_store() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::clean_component_store_native())
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
pub async fn reboot_to_uefi() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::reboot_to_uefi_native())
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
pub async fn check_winget_updates() -> Result<WindowsToolResult<Vec<WinGetUpdateItem>>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::check_winget_updates_native())
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
pub async fn query_startup_apps() -> Result<StartupAppsSnapshot, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_startup_apps_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(query_startup_apps_mock())
    }
}

#[tauri::command]
pub async fn open_startup_settings() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::open_startup_settings_native())
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
pub async fn run_network_diagnostics(target: Option<String>) -> Result<NetworkDiagnosticsResult, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::run_network_diagnostics_native(target))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let host = target.unwrap_or_else(|| "1.1.1.1".to_string());
        Ok(parse_ping_output("", &host, 4, 0))
    }
}

#[tauri::command]
pub async fn query_windows_update_status() -> Result<WindowsUpdateStatus, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_windows_update_status_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(query_windows_update_status_mock())
    }
}

#[cfg(not(target_os = "windows"))]
pub fn query_startup_apps_mock() -> StartupAppsSnapshot {
    StartupAppsSnapshot {
        availability: "unsupported".to_string(),
        source: "unsupported_os".to_string(),
        total_apps: 0,
        enabled_count: 0,
        disabled_count: 0,
        apps: vec![],
        error_details: Some("Disponibile solo su Windows.".to_string()),
    }
}

#[cfg(not(target_os = "windows"))]
pub fn query_windows_update_status_mock() -> WindowsUpdateStatus {
    WindowsUpdateStatus {
        availability: "unsupported".to_string(),
        source: "unsupported_os".to_string(),
        reboot_pending: false,
        reboot_sources: vec![],
        last_check_time: None,
        last_install_time: None,
        pending_file_rename_count: 0,
        details: Some("Disponibile solo su Windows.".to_string()),
    }
}

#[tauri::command]
pub async fn query_display_diagnostics() -> Result<DisplayDiagnosticsSnapshot, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_display_diagnostics_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(query_display_diagnostics_mock())
    }
}

#[tauri::command]
pub async fn detect_audio_glitches_or_status() -> Result<AudioDiagnosticsSnapshot, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::detect_audio_glitches_or_status_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(detect_audio_glitches_or_status_mock())
    }
}

#[tauri::command]
pub async fn open_display_settings() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::open_display_settings_native())
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
pub async fn open_sound_settings() -> Result<WindowsToolResult<String>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::open_sound_settings_native())
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

#[cfg(not(target_os = "windows"))]
pub fn query_display_diagnostics_mock() -> DisplayDiagnosticsSnapshot {
    DisplayDiagnosticsSnapshot {
        availability: "unsupported".to_string(),
        source: "unsupported_os".to_string(),
        total_monitors: 1,
        monitors: vec![MonitorInfo {
            id: "MOCK_DISPLAY".to_string(),
            monitor_name: "Generic Display".to_string(),
            adapter_name: "Mock Adapter".to_string(),
            current_resolution: MonitorResolution { width: 1920, height: 1080 },
            current_refresh_rate: 60,
            max_supported_refresh_rate: 60,
            supported_refresh_rates: vec![60],
            bits_per_pixel: 32,
            orientation: "landscape".to_string(),
            is_primary: true,
            virtual_bounds: MonitorVirtualBounds { x: 0, y: 0, width: 1920, height: 1080 },
            dpi_scale_percent: 100,
            is_refresh_rate_limited: false,
        }],
        has_high_refresh_rate_mismatch: false,
        has_mixed_refresh_rates: false,
        error_details: Some("Disponibile solo su Windows.".to_string()),
    }
}

#[cfg(not(target_os = "windows"))]
pub fn detect_audio_glitches_or_status_mock() -> AudioDiagnosticsSnapshot {
    AudioDiagnosticsSnapshot {
        availability: "unsupported".to_string(),
        source: "unsupported_os".to_string(),
        default_device_name: Some("Altoparlanti (Mock)".to_string()),
        default_sample_rate_hz: Some(48000),
        default_bit_depth: Some(24),
        default_channels: Some(2),
        devices: vec![],
        audio_service_running: true,
        audio_endpoint_builder_running: true,
        engine_status: "optimal".to_string(),
        glitch_or_issue_detected: false,
        issue_summary: Some("Mock audio status".to_string()),
        error_details: Some("Disponibile solo su Windows.".to_string()),
    }
}

#[tauri::command]
pub async fn query_network_adapter_details() -> Result<NetworkAdapterSnapshot, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_network_adapter_details_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(query_network_adapter_details_mock())
    }
}

#[tauri::command]
pub async fn query_wifi_signal_metrics() -> Result<WifiSignalSnapshot, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native::query_wifi_signal_metrics_native())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(query_wifi_signal_metrics_mock())
    }
}

#[cfg(not(target_os = "windows"))]
pub fn query_network_adapter_details_mock() -> NetworkAdapterSnapshot {
    NetworkAdapterSnapshot {
        availability: "available".to_string(),
        source: "mock_network_adapter".to_string(),
        adapter_name: "Ethernet".to_string(),
        description: "Realtek PCIe 2.5GbE Family Controller".to_string(),
        adapter_type: "ethernet".to_string(),
        status: "connected".to_string(),
        link_speed_mbps: 1000,
        max_speed_mbps: Some(2500),
        is_link_speed_downgraded: false,
        ipv4: Some("192.168.1.100".to_string()),
        ipv6: Some("fe80::1".to_string()),
        gateway: Some("192.168.1.1".to_string()),
        mac_address: Some("00:1A:2B:3C:4D:5E".to_string()),
        dhcp_enabled: true,
        error_details: None,
    }
}

#[cfg(not(target_os = "windows"))]
pub fn query_wifi_signal_metrics_mock() -> WifiSignalSnapshot {
    WifiSignalSnapshot {
        availability: "available".to_string(),
        source: "mock_wifi_signal".to_string(),
        is_connected: true,
        ssid: Some("HomeNetwork_5G".to_string()),
        bssid: Some("AA:BB:CC:DD:EE:FF".to_string()),
        signal_quality_percent: 88,
        rssi_dbm: -56,
        band: "5GHz".to_string(),
        standard: "Wi-Fi 6".to_string(),
        channel: Some(36),
        error_details: None,
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_startup_approved_status_none_and_empty() {
        assert_eq!(decode_startup_approved_status(None), true);
        assert_eq!(decode_startup_approved_status(Some(&[])), true);
    }

    #[test]
    fn test_decode_startup_approved_status_enabled_even_bytes() {
        // In Task Manager 0x02 indica esplicitamente abilitato
        assert_eq!(decode_startup_approved_status(Some(&[0x02, 0x00, 0x00, 0x00])), true);
        // 0x00 (pari)
        assert_eq!(decode_startup_approved_status(Some(&[0x00])), true);
        assert_eq!(decode_startup_approved_status(Some(&[0x06, 0x11])), true);
    }

    #[test]
    fn test_decode_startup_approved_status_disabled_odd_bytes() {
        // In Task Manager 0x03 o 0x01 indicano disabilitato dall'utente
        assert_eq!(decode_startup_approved_status(Some(&[0x03, 0x00, 0x00, 0x00])), false);
        assert_eq!(decode_startup_approved_status(Some(&[0x01, 0x00, 0x00, 0x00])), false);
        assert_eq!(decode_startup_approved_status(Some(&[0x05])), false);
    }

    #[test]
    fn test_estimate_startup_impact_classifications() {
        assert_eq!(estimate_startup_impact("Discord", "C:\\Users\\Peppe\\AppData\\Local\\Discord\\app.exe"), "high");
        assert_eq!(estimate_startup_impact("Steam", "\"C:\\Program Files (x86)\\Steam\\steam.exe\" -silent"), "high");
        assert_eq!(estimate_startup_impact("Spotify", "C:\\Users\\Peppe\\AppData\\Roaming\\Spotify\\Spotify.exe"), "high");
        assert_eq!(estimate_startup_impact("Realtek HD Audio", "C:\\Program Files\\Realtek\\Audio\\RtkNGUI64.exe -s"), "low");
        assert_eq!(estimate_startup_impact("Logitech G HUB", "lghub_tray.exe --background"), "low");
        assert_eq!(estimate_startup_impact("GenericApp", "C:\\Tools\\app.exe"), "medium");
    }

    #[test]
    fn test_parse_ping_time_line_it_and_en() {
        let line_it = "Risposta da 1.1.1.1: byte=32 tempo=12ms TTL=57";
        assert_eq!(parse_ping_time_line(line_it), Some(12.0));

        let line_en = "Reply from 1.1.1.1: bytes=32 time=15.4ms TTL=57";
        assert_eq!(parse_ping_time_line(line_en), Some(15.4));

        let line_sub_ms = "Risposta da 127.0.0.1: byte=32 tempo<1ms TTL=128";
        assert_eq!(parse_ping_time_line(line_sub_ms), Some(0.5));

        let line_timeout = "Richiesta scaduta.";
        assert_eq!(parse_ping_time_line(line_timeout), None);
    }

    #[test]
    fn test_calculate_network_metrics_optimal() {
        let samples = vec![12.0, 14.0, 16.0, 14.0];
        let (min, max, avg, jitter, packet_loss, quality) = calculate_network_metrics(&samples, 4);

        assert_eq!(min, Some(12.0));
        assert_eq!(max, Some(16.0));
        assert_eq!(avg, Some(14.0));
        assert_eq!(packet_loss, 0.0);
        // Jitter: |14-12| + |16-14| + |14-16| = 2 + 2 + 2 = 6 / 3 = 2.0
        assert_eq!(jitter, Some(2.0));
        assert_eq!(quality, "optimal");
    }

    #[test]
    fn test_calculate_network_metrics_packet_loss_critical() {
        let samples = vec![50.0, 60.0];
        let (_, _, _, _, packet_loss, quality) = calculate_network_metrics(&samples, 4);

        assert_eq!(packet_loss, 50.0);
        assert_eq!(quality, "critical");
    }

    #[test]
    fn test_calculate_network_metrics_offline() {
        let samples: Vec<f64> = vec![];
        let (min, max, avg, jitter, packet_loss, quality) = calculate_network_metrics(&samples, 4);

        assert_eq!(min, None);
        assert_eq!(max, None);
        assert_eq!(avg, None);
        assert_eq!(jitter, None);
        assert_eq!(packet_loss, 100.0);
        assert_eq!(quality, "offline");
    }

    #[test]
    fn test_classify_network_quality_thresholds() {
        assert_eq!(classify_network_quality(20.0, 0.0, 3.0), "optimal");
        assert_eq!(classify_network_quality(50.0, 0.0, 10.0), "good");
        assert_eq!(classify_network_quality(90.0, 0.0, 5.0), "degraded");
        assert_eq!(classify_network_quality(25.0, 0.0, 35.0), "degraded");
        assert_eq!(classify_network_quality(210.0, 0.0, 10.0), "critical");
        assert_eq!(classify_network_quality(40.0, 25.0, 5.0), "critical");
        assert_eq!(classify_network_quality(0.0, 100.0, 0.0), "offline");
    }

    #[test]
    fn test_parse_ping_output_full_scenario() {
        let stdout = "\
Esecuzione di Ping 1.1.1.1 con 32 byte di dati:
Risposta da 1.1.1.1: byte=32 tempo=11ms TTL=57
Risposta da 1.1.1.1: byte=32 tempo=13ms TTL=57
Risposta da 1.1.1.1: byte=32 tempo=12ms TTL=57
Risposta da 1.1.1.1: byte=32 tempo=14ms TTL=57

Statistiche Ping per 1.1.1.1:
    Pacchetti: Trasmessi = 4, Ricevuti = 4, Persi = 0 (0% persi),
Tempo approssimativo percorsi andata/ritorno in millisecondi:
    Minimo = 11ms, Massimo = 14ms, Medio = 12ms
";
        let res = parse_ping_output(stdout, "1.1.1.1", 4, 120);
        assert_eq!(res.sent_packets, 4);
        assert_eq!(res.received_packets, 4);
        assert_eq!(res.packet_loss_percent, 0.0);
        assert_eq!(res.rtt_min_ms, Some(11.0));
        assert_eq!(res.rtt_max_ms, Some(14.0));
        assert_eq!(res.rtt_avg_ms, Some(12.5));
        assert_eq!(res.quality_rating, "optimal");
        assert_eq!(res.status, "success");
    }

    #[test]
    fn test_startup_apps_snapshot_serialization() {
        let snapshot = StartupAppsSnapshot {
            availability: "available".to_string(),
            source: "windows_registry_run".to_string(),
            total_apps: 2,
            enabled_count: 1,
            disabled_count: 1,
            apps: vec![
                StartupAppItem {
                    name: "Discord".to_string(),
                    command: "C:\\Discord\\app.exe".to_string(),
                    scope: "current_user".to_string(),
                    enabled: true,
                    impact: "high".to_string(),
                    raw_status_hex: Some("02 00 00 00".to_string()),
                },
                StartupAppItem {
                    name: "OldApp".to_string(),
                    command: "C:\\Old\\app.exe".to_string(),
                    scope: "local_machine".to_string(),
                    enabled: false,
                    impact: "medium".to_string(),
                    raw_status_hex: Some("03 00 00 00".to_string()),
                },
            ],
            error_details: None,
        };

        let json = serde_json::to_string(&snapshot).expect("must serialize");
        assert!(json.contains("\"totalApps\":2"));
        assert!(json.contains("\"enabledCount\":1"));
        assert!(json.contains("\"disabledCount\":1"));
        assert!(json.contains("\"rawStatusHex\":\"02 00 00 00\""));
    }

    #[test]
    fn test_windows_update_status_serialization() {
        let status = WindowsUpdateStatus {
            availability: "available".to_string(),
            source: "windows_registry_update_flags".to_string(),
            reboot_pending: true,
            reboot_sources: vec!["WindowsUpdate: RebootRequired".to_string()],
            last_check_time: Some("2026-10-02 10:00:00".to_string()),
            last_install_time: Some("2026-10-01 22:30:00".to_string()),
            pending_file_rename_count: 0,
            details: Some("Riavvio richiesto.".to_string()),
        };

        let json = serde_json::to_string(&status).expect("must serialize");
        assert!(json.contains("\"rebootPending\":true"));
        assert!(json.contains("\"rebootSources\":[\"WindowsUpdate: RebootRequired\"]"));
    }

    #[test]
    fn test_is_monitor_refresh_rate_limited() {
        // Monitor 144Hz o 165Hz impostato a 60Hz per errore
        assert!(is_monitor_refresh_rate_limited(144, 60));
        assert!(is_monitor_refresh_rate_limited(165, 60));
        assert!(is_monitor_refresh_rate_limited(240, 60));
        assert!(is_monitor_refresh_rate_limited(144, 120)); // > 20 Hz gap

        // Monitor impostato alla frequenza massima o standard 60Hz nativo
        assert!(!is_monitor_refresh_rate_limited(60, 60));
        assert!(!is_monitor_refresh_rate_limited(75, 75));
        assert!(!is_monitor_refresh_rate_limited(144, 144));
        assert!(!is_monitor_refresh_rate_limited(165, 164)); // jitter di 1 Hz arrotondato
    }

    #[test]
    fn test_classify_audio_engine_status() {
        // Servizio interrotto -> issues_detected
        let (status, glitch, _) = classify_audio_engine_status(false, Some(48000), Some(24));
        assert_eq!(status, "issues_detected");
        assert!(glitch);

        // 48 kHz 24-bit -> optimal
        let (status, glitch, _) = classify_audio_engine_status(true, Some(48000), Some(24));
        assert_eq!(status, "optimal");
        assert!(!glitch);

        // 44.1 kHz 16-bit -> standard
        let (status, glitch, _) = classify_audio_engine_status(true, Some(44100), Some(16));
        assert_eq!(status, "standard");
        assert!(!glitch);

        // < 44.1 kHz -> degraded
        let (status, glitch, _) = classify_audio_engine_status(true, Some(22050), Some(16));
        assert_eq!(status, "degraded");
        assert!(glitch);
    }

    #[test]
    fn test_display_diagnostics_snapshot_serialization() {
        let snap = DisplayDiagnosticsSnapshot {
            availability: "available".to_string(),
            source: "win32_enum_display".to_string(),
            total_monitors: 1,
            monitors: vec![MonitorInfo {
                id: "\\\\.\\DISPLAY1".to_string(),
                monitor_name: "LG UltraGear 27GP850".to_string(),
                adapter_name: "\\\\.\\DISPLAY1".to_string(),
                current_resolution: MonitorResolution { width: 2560, height: 1440 },
                current_refresh_rate: 165,
                max_supported_refresh_rate: 165,
                supported_refresh_rates: vec![60, 120, 144, 165],
                bits_per_pixel: 32,
                orientation: "landscape".to_string(),
                is_primary: true,
                virtual_bounds: MonitorVirtualBounds { x: 0, y: 0, width: 2560, height: 1440 },
                dpi_scale_percent: 100,
                is_refresh_rate_limited: false,
            }],
            has_high_refresh_rate_mismatch: false,
            has_mixed_refresh_rates: false,
            error_details: None,
        };

        let json = serde_json::to_string(&snap).expect("must serialize");
        assert!(json.contains("\"totalMonitors\":1"));
        assert!(json.contains("\"monitorName\":\"LG UltraGear 27GP850\""));
        assert!(json.contains("\"currentRefreshRate\":165"));
        assert!(json.contains("\"isRefreshRateLimited\":false"));
    }

    #[test]
    fn test_audio_diagnostics_snapshot_serialization() {
        let snap = AudioDiagnosticsSnapshot {
            availability: "available".to_string(),
            source: "win32_audio_engine".to_string(),
            default_device_name: Some("Altoparlanti (Realtek High Definition Audio)".to_string()),
            default_sample_rate_hz: Some(48000),
            default_bit_depth: Some(24),
            default_channels: Some(2),
            devices: vec![AudioDeviceInfo {
                id: "{0.0.0.00000000}.{mock_guid}".to_string(),
                name: "Altoparlanti".to_string(),
                is_default: true,
                state: "active".to_string(),
                sample_rate_hz: Some(48000),
                bit_depth: Some(24),
                channels: Some(2),
                driver_name: Some("Realtek".to_string()),
            }],
            audio_service_running: true,
            audio_endpoint_builder_running: true,
            engine_status: "optimal".to_string(),
            glitch_or_issue_detected: false,
            issue_summary: Some("Tutti i servizi operativi".to_string()),
            error_details: None,
        };

        let json = serde_json::to_string(&snap).expect("must serialize");
        assert!(json.contains("\"defaultDeviceName\":\"Altoparlanti (Realtek High Definition Audio)\""));
        assert!(json.contains("\"defaultSampleRateHz\":48000"));
        assert!(json.contains("\"audioServiceRunning\":true"));
        assert!(json.contains("\"engineStatus\":\"optimal\""));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_native_display_and_audio_diagnostics_execution() {
        let disp = windows_native::query_display_diagnostics_native();
        assert_eq!(disp.availability, "available");
        assert!(disp.total_monitors >= 1);
        let first_mon = &disp.monitors[0];
        assert!(first_mon.current_resolution.width > 0);
        assert!(first_mon.current_resolution.height > 0);
        assert!(first_mon.current_refresh_rate > 0);

        let audio = windows_native::detect_audio_glitches_or_status_native();
        assert_eq!(audio.availability, "available");
        assert!(audio.audio_service_running);
    }

    #[test]
    fn test_parse_link_speed_to_mbps() {
        assert_eq!(parse_link_speed_to_mbps("1 Gbps"), 1000);
        assert_eq!(parse_link_speed_to_mbps("2.5 Gbps"), 2500);
        assert_eq!(parse_link_speed_to_mbps("10 Gbps"), 10000);
        assert_eq!(parse_link_speed_to_mbps("100 Mbps"), 100);
        assert_eq!(parse_link_speed_to_mbps("10 Mbps"), 10);
        assert_eq!(parse_link_speed_to_mbps("1000000000 bps"), 1000);
        assert_eq!(parse_link_speed_to_mbps("0 bps"), 0);
        assert_eq!(parse_link_speed_to_mbps("unknown"), 0);
    }

    #[test]
    fn test_estimate_max_speed_from_desc() {
        assert_eq!(estimate_max_speed_from_desc("Realtek Gaming 2.5GbE Family Controller"), Some(2500));
        assert_eq!(estimate_max_speed_from_desc("Intel(R) Ethernet Controller I225-V"), Some(2500));
        assert_eq!(estimate_max_speed_from_desc("Intel(R) Ethernet Connection (7) I219-V"), Some(1000));
        assert_eq!(estimate_max_speed_from_desc("Realtek PCIe GBE Family Controller"), Some(1000));
        assert_eq!(estimate_max_speed_from_desc("Aquantia AQtion 10G Pro NIC"), Some(10000));
        assert_eq!(estimate_max_speed_from_desc("Generic Fast Ethernet Adapter"), Some(100));
        assert_eq!(estimate_max_speed_from_desc("Generic Virtual Adapter"), None);
    }

    #[test]
    fn test_evaluate_ethernet_link_speed_downgrade() {
        // Scheda 2.5GbE che negozia a 100 Mbps -> Downgrade (cavo difettoso/porta limitata)
        assert!(evaluate_ethernet_link_speed_downgrade(
            "ethernet",
            "Realtek Gaming 2.5GbE Family Controller",
            100,
            Some(2500)
        ));

        // Scheda Gigabit che negozia a 100 Mbps -> Downgrade
        assert!(evaluate_ethernet_link_speed_downgrade(
            "ethernet",
            "Intel Gigabit Network Connection",
            100,
            None
        ));

        // Scheda Gigabit che negozia a 1000 Mbps -> Corretto
        assert!(!evaluate_ethernet_link_speed_downgrade(
            "ethernet",
            "Intel Gigabit Network Connection",
            1000,
            Some(1000)
        ));

        // Scheda 2.5G che negozia a 1000 Mbps (su switch gigabit) -> Non è downgrade critico
        assert!(!evaluate_ethernet_link_speed_downgrade(
            "ethernet",
            "Realtek Gaming 2.5GbE Family Controller",
            1000,
            Some(2500)
        ));

        // Wi-Fi non applica downgrade ethernet
        assert!(!evaluate_ethernet_link_speed_downgrade(
            "wifi",
            "Intel Wi-Fi 6E AX211",
            100,
            Some(1000)
        ));
    }

    #[test]
    fn test_wifi_quality_to_rssi_dbm() {
        assert_eq!(wifi_quality_to_rssi_dbm(100), -50);
        assert_eq!(wifi_quality_to_rssi_dbm(80), -60);
        assert_eq!(wifi_quality_to_rssi_dbm(50), -75);
        assert_eq!(wifi_quality_to_rssi_dbm(30), -85);
        assert_eq!(wifi_quality_to_rssi_dbm(0), -100);
    }

    #[test]
    fn test_detect_wifi_band_and_standard() {
        assert_eq!(detect_wifi_band(Some(6), None), "2.4GHz");
        assert_eq!(detect_wifi_band(Some(36), None), "5GHz");
        assert_eq!(detect_wifi_band(None, Some(6000)), "6GHz");

        assert_eq!(detect_wifi_standard("802.11ax", "5GHz"), "Wi-Fi 6");
        assert_eq!(detect_wifi_standard("802.11ax", "6GHz"), "Wi-Fi 6E");
        assert_eq!(detect_wifi_standard("802.11be", "6GHz"), "Wi-Fi 7");
        assert_eq!(detect_wifi_standard("802.11ac", "5GHz"), "Wi-Fi 5");
        assert_eq!(detect_wifi_standard("802.11n", "2.4GHz"), "Wi-Fi 4");
        assert_eq!(detect_wifi_standard("802.11g", "2.4GHz"), "legacy");
    }

    #[test]
    fn test_parse_netsh_wifi_output_connected() {
        let sample = "\
There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6E AX211 160MHz
    State                  : connected
    SSID                   : Fastweb_Ultra_5G
    BSSID                  : a4:91:b1:22:33:44
    Radio type             : 802.11ax
    Channel                : 36
    Band                   : 5 GHz
    Signal                 : 92%
";
        let res = parse_netsh_wifi_output(sample);
        assert_eq!(res.availability, "available");
        assert!(res.is_connected);
        assert_eq!(res.ssid.as_deref(), Some("Fastweb_Ultra_5G"));
        assert_eq!(res.signal_quality_percent, 92);
        assert_eq!(res.rssi_dbm, -54);
        assert_eq!(res.band, "5GHz");
        assert_eq!(res.standard, "Wi-Fi 6");
        assert_eq!(res.channel, Some(36));
    }

    #[test]
    fn test_parse_netsh_wifi_output_disconnected() {
        let sample = "\
There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6E AX211 160MHz
    State                  : disconnected
";
        let res = parse_netsh_wifi_output(sample);
        assert_eq!(res.availability, "not_connected");
        assert!(!res.is_connected);
        assert_eq!(res.signal_quality_percent, 0);
        assert_eq!(res.rssi_dbm, -100);
    }

    #[test]
    fn test_parse_netsh_wifi_output_no_interface() {
        let sample = "There is no wireless interface on the system.";
        let res = parse_netsh_wifi_output(sample);
        assert_eq!(res.availability, "unavailable");
        assert!(!res.is_connected);
    }

    #[test]
    fn test_network_adapter_snapshot_serialization() {
        let snap = NetworkAdapterSnapshot {
            availability: "available".to_string(),
            source: "win32_iphelper".to_string(),
            adapter_name: "Ethernet".to_string(),
            description: "Realtek Gaming 2.5GbE Family Controller".to_string(),
            adapter_type: "ethernet".to_string(),
            status: "connected".to_string(),
            link_speed_mbps: 1000,
            max_speed_mbps: Some(2500),
            is_link_speed_downgraded: false,
            ipv4: Some("192.168.1.17".to_string()),
            ipv6: Some("fe80::1".to_string()),
            gateway: Some("192.168.1.1".to_string()),
            mac_address: Some("D8:43:AE:14:6A:DF".to_string()),
            dhcp_enabled: true,
            error_details: None,
        };

        let json = serde_json::to_string(&snap).expect("must serialize");
        assert!(json.contains("\"adapterName\":\"Ethernet\""));
        assert!(json.contains("\"linkSpeedMbps\":1000"));
        assert!(json.contains("\"maxSpeedMbps\":2500"));
        assert!(json.contains("\"isLinkSpeedDowngraded\":false"));
        assert!(json.contains("\"ipv4\":\"192.168.1.17\""));
    }

    #[test]
    fn test_wifi_signal_snapshot_serialization() {
        let snap = WifiSignalSnapshot {
            availability: "available".to_string(),
            source: "win32_wlanapi".to_string(),
            is_connected: true,
            ssid: Some("Office_Wi-Fi_7".to_string()),
            bssid: Some("00:11:22:33:44:55".to_string()),
            signal_quality_percent: 85,
            rssi_dbm: -57,
            band: "6GHz".to_string(),
            standard: "Wi-Fi 7".to_string(),
            channel: Some(69),
            error_details: None,
        };

        let json = serde_json::to_string(&snap).expect("must serialize");
        assert!(json.contains("\"ssid\":\"Office_Wi-Fi_7\""));
        assert!(json.contains("\"signalQualityPercent\":85"));
        assert!(json.contains("\"rssiDbm\":-57"));
        assert!(json.contains("\"band\":\"6GHz\""));
        assert!(json.contains("\"standard\":\"Wi-Fi 7\""));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_native_network_adapter_and_wifi_execution() {
        let adapter = windows_native::query_network_adapter_details_native();
        assert_eq!(adapter.availability, "available");
        assert!(!adapter.adapter_name.is_empty());

        let wifi = windows_native::query_wifi_signal_metrics_native();
        assert!(wifi.availability == "available" || wifi.availability == "not_connected" || wifi.availability == "unavailable");
    }
}


