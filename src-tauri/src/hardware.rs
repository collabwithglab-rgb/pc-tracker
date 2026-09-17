use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DetectedComponent {
    pub category: String, // "cpu" | "gpu" | "ram" | "storage" | "motherboard"
    pub manufacturer: String,
    pub model: String,
    pub capacity: Option<String>,
    pub serial_number: Option<String>,
    pub source: String,
    pub confidence: String, // "HIGH" | "MEDIUM"
    pub detected_at: String,
    pub extra_details: Option<HashMap<String, String>>,
}

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use std::time::SystemTime;
    use winreg::enums::*;
    use winreg::RegKey;

    fn get_iso_timestamp() -> String {
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        format!("{now}")
    }

    fn clean_string(s: &str) -> String {
        s.trim().replace('\0', "").trim().to_string()
    }

    fn format_bytes_to_human(bytes: u64) -> String {
        let gb = bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        if gb >= 900.0 {
            let tb = gb / 1024.0;
            if (tb - tb.round()).abs() < 0.15 {
                format!("{:.0} TB", tb.round())
            } else {
                format!("{:.1} TB", tb)
            }
        } else if gb >= 1.0 {
            format!("{:.0} GB", gb.round())
        } else {
            format!("{} MB", bytes / (1024 * 1024))
        }
    }

    fn clean_manufacturer(raw: &str) -> String {
        let m = raw.trim();
        let upper = m.to_uppercase();
        if upper.contains("ASUSTEK") || upper.contains("ASUS") {
            "ASUS".to_string()
        } else if upper.contains("MICRO-STAR") || upper.contains("MSI") {
            "MSI".to_string()
        } else if upper.contains("GIGABYTE") {
            "Gigabyte".to_string()
        } else if upper.contains("ASROCK") {
            "ASRock".to_string()
        } else if upper.contains("ADVANCED MICRO DEVICES") || upper.contains("AMD") {
            "AMD".to_string()
        } else if upper.contains("INTEL") {
            "Intel".to_string()
        } else if upper.contains("NVIDIA") {
            "NVIDIA".to_string()
        } else if upper.contains("SAMSUNG") {
            "Samsung".to_string()
        } else if upper.contains("CORSAIR") {
            "Corsair".to_string()
        } else if upper.contains("CRUCIAL") || upper.contains("MICRON") {
            "Crucial".to_string()
        } else if upper.contains("G.SKILL") || upper.contains("GSKILL") {
            "G.Skill".to_string()
        } else if upper.contains("KINGSTON") {
            "Kingston".to_string()
        } else if upper.contains("WESTERN DIGITAL") || upper.starts_with("WDC") || upper.starts_with("WD") {
            "Western Digital".to_string()
        } else if upper.contains("SEAGATE") {
            "Seagate".to_string()
        } else {
            m.to_string()
        }
    }

    fn clean_cpu_name(raw: &str) -> (String, String) {
        let mut name = clean_string(raw);
        name = name.replace("(R)", "").replace("(TM)", "").replace(" CPU", "");
        
        if let Some(idx) = name.find('@') {
            name = name[..idx].trim().to_string();
        }
        if let Some(idx) = name.to_uppercase().find("PROCESSOR") {
            let prefix = &name[..idx];
            if let Some(dash_idx) = prefix.rfind('-') {
                if let Some(space_idx) = prefix[..dash_idx].rfind(' ') {
                    name = name[..space_idx].trim().to_string();
                } else {
                    name = prefix.trim().to_string();
                }
            } else {
                name = prefix.trim().to_string();
            }
        }

        let brand = if name.to_uppercase().contains("AMD") {
            "AMD".to_string()
        } else if name.to_uppercase().contains("INTEL") {
            "Intel".to_string()
        } else {
            "CPU".to_string()
        };

        // Normalizza spazi multipli
        let cleaned_name = name.split_whitespace().collect::<Vec<_>>().join(" ");
        (brand, cleaned_name)
    }

    fn clean_storage_model(friendly: &str, raw_id: &str) -> (String, String) {
        let s = if !friendly.is_empty() { friendly } else { raw_id };
        let mut model = clean_string(s);
        model = model.replace("SCSI Disk Device", "")
            .replace("NVMe", "")
            .trim()
            .to_string();

        let upper = model.to_uppercase();
        let brand = if upper.contains("SAMSUNG") {
            "Samsung".to_string()
        } else if upper.contains("CRUCIAL") || upper.contains("CT1000") || upper.contains("CT2000") || upper.contains("CT4000") {
            "Crucial".to_string()
        } else if upper.contains("WD") || upper.contains("WESTERN DIGITAL") || upper.contains("BLACK") {
            "Western Digital".to_string()
        } else if upper.contains("KINGSTON") {
            "Kingston".to_string()
        } else if upper.contains("SEAGATE") {
            "Seagate".to_string()
        } else if upper.contains("SABRENT") {
            "Sabrent".to_string()
        } else if upper.contains("CORSAIR") {
            "Corsair".to_string()
        } else if upper.contains("LEXAR") {
            "Lexar".to_string()
        } else {
            model.split_whitespace().next().unwrap_or("Storage").to_string()
        };

        // Rendi più leggibile CT1000P3PSSD8 se è un Crucial P3 Plus
        if model.contains("CT1000P3P") {
            model = "Crucial P3 Plus 1TB SSD".to_string();
        } else if model.contains("CT2000P3P") {
            model = "Crucial P3 Plus 2TB SSD".to_string();
        } else if model.contains("CT4000P3P") {
            model = "Crucial P3 Plus 4TB SSD".to_string();
        }

        (brand, model)
    }

    #[repr(C)]
    struct MemoryStatusEx {
        dw_length: u32,
        dw_memory_load: u32,
        ull_total_phys: u64,
        ull_avail_phys: u64,
        ull_total_page_file: u64,
        ull_avail_page_file: u64,
        ull_total_virtual: u64,
        ull_avail_virtual: u64,
        ull_avail_extended_virtual: u64,
    }

    extern "system" {
        fn GlobalMemoryStatusEx(lp_buffer: *mut MemoryStatusEx) -> i32;
    }

    fn get_total_ram_bytes() -> Option<u64> {
        let mut status = MemoryStatusEx {
            dw_length: std::mem::size_of::<MemoryStatusEx>() as u32,
            dw_memory_load: 0,
            ull_total_phys: 0,
            ull_avail_phys: 0,
            ull_total_page_file: 0,
            ull_avail_page_file: 0,
            ull_total_virtual: 0,
            ull_avail_virtual: 0,
            ull_avail_extended_virtual: 0,
        };

        let result = unsafe { GlobalMemoryStatusEx(&mut status) };
        if result != 0 && status.ull_total_phys > 0 {
            Some(status.ull_total_phys)
        } else {
            None
        }
    }

    pub fn detect_hardware_native() -> Vec<DetectedComponent> {
        let mut components = Vec::new();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let now_str = get_iso_timestamp();

        // 1. CPU
        if let Ok(cpu_base) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\CentralProcessor") {
            let logical_count = cpu_base.enum_keys().count();
            if let Ok(cpu_key) = cpu_base.open_subkey("0") {
                if let Ok(name_str) = cpu_key.get_value::<String, _>("ProcessorNameString") {
                    let (brand, model) = clean_cpu_name(&name_str);
                    let mut extra = HashMap::new();
                    if logical_count > 0 {
                        extra.insert("logical_processors".to_string(), logical_count.to_string());
                    }
                    if let Ok(mhz) = cpu_key.get_value::<u32, _>("~MHz") {
                        extra.insert("frequency_mhz".to_string(), format!("{} MHz", mhz));
                    }
                    components.push(DetectedComponent {
                        category: "cpu".to_string(),
                        manufacturer: brand,
                        model,
                        capacity: None,
                        serial_number: None,
                        source: "Windows Registry".to_string(),
                        confidence: "HIGH".to_string(),
                        detected_at: now_str.clone(),
                        extra_details: if extra.is_empty() { None } else { Some(extra) },
                    });
                }
            }
        }

        // 2. Motherboard
        if let Ok(bios_key) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\BIOS") {
            let mfg = bios_key.get_value::<String, _>("BaseBoardManufacturer").unwrap_or_default();
            let prod = bios_key.get_value::<String, _>("BaseBoardProduct").unwrap_or_default();
            let bios_ver = bios_key.get_value::<String, _>("BIOSVersion").unwrap_or_default();
            let bios_date = bios_key.get_value::<String, _>("BIOSReleaseDate").unwrap_or_default();
            
            let clean_mfg = clean_manufacturer(&mfg);
            let clean_prod = clean_string(&prod);

            if !clean_prod.is_empty() && !clean_prod.to_uppercase().contains("O.E.M.") {
                let mut extra = HashMap::new();
                let clean_ver = clean_string(&bios_ver);
                let clean_date = clean_string(&bios_date);
                if !clean_ver.is_empty() {
                    extra.insert("bios_version".to_string(), clean_ver);
                }
                if !clean_date.is_empty() {
                    extra.insert("bios_date".to_string(), clean_date);
                }

                components.push(DetectedComponent {
                    category: "motherboard".to_string(),
                    manufacturer: if clean_mfg.is_empty() { "Motherboard".to_string() } else { clean_mfg },
                    model: clean_prod,
                    capacity: None,
                    serial_number: None,
                    source: "Windows Registry".to_string(),
                    confidence: "HIGH".to_string(),
                    detected_at: now_str.clone(),
                    extra_details: if extra.is_empty() { None } else { Some(extra) },
                });
            }
        }

        // 3. GPU (con VRAM e distinzione iGPU vs Dedicata)
        if let Ok(video_class) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}") {
            let mut detected_gpus: Vec<(bool, DetectedComponent)> = Vec::new();

            for subkey_name in video_class.enum_keys().filter_map(|k| k.ok()) {
                if subkey_name.starts_with("00") {
                    if let Ok(sub) = video_class.open_subkey(&subkey_name) {
                        let desc: String = sub.get_value("DriverDesc").unwrap_or_default();
                        let desc_clean = clean_string(&desc);
                        let upper = desc_clean.to_uppercase();

                        if !desc_clean.is_empty() 
                            && !upper.contains("BASIC DISPLAY")
                            && !upper.contains("VIRTUAL")
                            && !upper.contains("REMOTE")
                            && !upper.contains("MIRACAST") {
                            
                            let is_discrete = upper.contains("NVIDIA") || upper.contains("GEFORCE") || upper.contains("RTX") 
                                || (upper.contains("RADEON") && !upper.contains("GRAPHICS")) || upper.contains("ARC A");

                            let brand = if upper.contains("NVIDIA") || upper.contains("GEFORCE") {
                                "NVIDIA".to_string()
                            } else if upper.contains("AMD") || upper.contains("RADEON") {
                                "AMD".to_string()
                            } else if upper.contains("INTEL") {
                                "Intel".to_string()
                            } else {
                                sub.get_value("ProviderName").unwrap_or_else(|_| "GPU".to_string())
                            };

                            // Lettura VRAM dedicata
                            let mut vram_bytes: u64 = 0;
                            if let Ok(qw) = sub.get_value::<u64, _>("HardwareInformation.qwMemorySize") {
                                vram_bytes = qw;
                            } else if let Ok(dw) = sub.get_value::<u32, _>("HardwareInformation.MemorySize") {
                                vram_bytes = dw as u64;
                            } else if let Ok(bin) = sub.get_raw_value("HardwareInformation.qwMemorySize") {
                                if bin.bytes.len() >= 8 {
                                    vram_bytes = u64::from_le_bytes(bin.bytes[0..8].try_into().unwrap_or_default());
                                }
                            } else if let Ok(bin) = sub.get_raw_value("HardwareInformation.MemorySize") {
                                if bin.bytes.len() >= 4 {
                                    vram_bytes = u32::from_le_bytes(bin.bytes[0..4].try_into().unwrap_or_default()) as u64;
                                }
                            }

                            let capacity_str = if vram_bytes >= 512 * 1024 * 1024 {
                                let gb = vram_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
                                if gb >= 1.0 {
                                    Some(format!("{:.0} GB", gb.round()))
                                } else {
                                    Some(format!("{} MB", vram_bytes / (1024 * 1024)))
                                }
                            } else {
                                None
                            };

                            let mut extra = HashMap::new();
                            extra.insert("is_discrete".to_string(), if is_discrete { "true".to_string() } else { "false".to_string() });
                            extra.insert("is_integrated".to_string(), if !is_discrete { "true".to_string() } else { "false".to_string() });
                            if let Some(ref cap) = capacity_str {
                                extra.insert("vram".to_string(), cap.clone());
                            }

                            if !detected_gpus.iter().any(|(_, g)| g.model == desc_clean) {
                                detected_gpus.push((is_discrete, DetectedComponent {
                                    category: "gpu".to_string(),
                                    manufacturer: brand,
                                    model: desc_clean,
                                    capacity: capacity_str,
                                    serial_number: None,
                                    source: "Windows Registry".to_string(),
                                    confidence: "HIGH".to_string(),
                                    detected_at: now_str.clone(),
                                    extra_details: Some(extra),
                                }));
                            }
                        }
                    }
                }
            }

            // Ordina dando priorità alle GPU dedicate (es. RTX 4070 prima della iGPU UHD 770)
            detected_gpus.sort_by(|a, b| b.0.cmp(&a.0));
            for (_, gpu_comp) in detected_gpus {
                components.push(gpu_comp);
            }
        }

        // 4. RAM (Win32 GlobalMemoryStatusEx)
        if let Some(total_bytes) = get_total_ram_bytes() {
            let cap_str = format_bytes_to_human(total_bytes);
            let mut extra = HashMap::new();
            extra.insert("total_bytes".to_string(), total_bytes.to_string());
            components.push(DetectedComponent {
                category: "ram".to_string(),
                manufacturer: "RAM Kit".to_string(),
                model: format!("{} RAM", cap_str),
                capacity: Some(cap_str),
                serial_number: None,
                source: "Windows Native API".to_string(),
                confidence: "HIGH".to_string(),
                detected_at: now_str.clone(),
                extra_details: Some(extra),
            });
        }

        // 5. Storage (Disk Enum da Registry con riconoscimento interfaccia NVMe vs SATA)
        if let Ok(disk_enum) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Services\\disk\\Enum") {
            let count: u32 = disk_enum.get_value("Count").unwrap_or(0);
            for i in 0..count {
                if let Ok(device_path) = disk_enum.get_value::<String, _>(&i.to_string()) {
                    let enum_full_path = format!("SYSTEM\\CurrentControlSet\\Enum\\{device_path}");
                    if let Ok(dev_key) = hklm.open_subkey(&enum_full_path) {
                        let friendly_name: String = dev_key.get_value("FriendlyName").unwrap_or_default();
                        let hardware_id: String = dev_key.get_value::<Vec<String>, _>("HardwareID")
                            .ok()
                            .and_then(|ids| ids.into_iter().next())
                            .unwrap_or_default();

                        // Esclude USB o virtual drive
                        let upper_path = device_path.to_uppercase();
                        if !upper_path.contains("USBSTOR") && !upper_path.contains("VIRTUAL") {
                            let (brand, model) = clean_storage_model(&friendly_name, &hardware_id);
                            
                            let upper_hw = hardware_id.to_uppercase();
                            let is_nvme = upper_path.contains("NVME") || upper_hw.contains("NVME") || model.to_uppercase().contains("NVME");
                            let is_sata = upper_path.contains("SATA") || upper_path.contains("SCSI") || upper_hw.contains("SATA") || upper_hw.contains("SCSI");
                            let interface_str = if is_nvme { "NVMe" } else if is_sata { "SATA" } else { "Internal" };

                            let mut extra = HashMap::new();
                            extra.insert("interface".to_string(), interface_str.to_string());

                            if !components.iter().any(|c| c.category == "storage" && c.model == model) {
                                components.push(DetectedComponent {
                                    category: "storage".to_string(),
                                    manufacturer: brand,
                                    model,
                                    capacity: None,
                                    serial_number: None,
                                    source: "Windows Registry".to_string(),
                                    confidence: "HIGH".to_string(),
                                    detected_at: now_str.clone(),
                                    extra_details: Some(extra),
                                });
                            }
                        }
                    }
                }
            }
        }

        components
    }
}

/// Comando Tauri invocabile dal frontend React
#[tauri::command]
pub async fn detect_hardware() -> Result<Vec<DetectedComponent>, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(windows_impl::detect_hardware_native())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![])
    }
}

