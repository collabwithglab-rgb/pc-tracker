use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MetricValue<T> {
    pub value: Option<T>,
    pub availability: String, // "available" | "unavailable" | "unsupported" | "permission_error" | "error"
    pub unit: Option<String>,
    pub source: String,
    pub reason: Option<String>,
}

impl<T> MetricValue<T> {
    pub fn available(value: T, unit: Option<&str>, source: &str) -> Self {
        Self {
            value: Some(value),
            availability: "available".to_string(),
            unit: unit.map(|s| s.to_string()),
            source: source.to_string(),
            reason: None,
        }
    }

    pub fn unavailable(source: &str, reason: &str) -> Self {
        Self {
            value: None,
            availability: "unavailable".to_string(),
            unit: None,
            source: source.to_string(),
            reason: Some(reason.to_string()),
        }
    }

    pub fn unsupported(source: &str, reason: &str) -> Self {
        Self {
            value: None,
            availability: "unsupported".to_string(),
            unit: None,
            source: source.to_string(),
            reason: Some(reason.to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CpuMonitoringData {
    pub utilization_percent: MetricValue<f64>,
    pub logical_processor_count: u32,
    pub base_frequency_mhz: MetricValue<u32>,
    pub package_temperature_celsius: MetricValue<f64>,
    pub package_power_watts: MetricValue<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MemoryMonitoringData {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub utilization_percent: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GpuMonitoringData {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub is_discrete: bool,
    pub utilization_percent: MetricValue<f64>,
    pub vram_total_bytes: MetricValue<u64>,
    pub vram_used_bytes: MetricValue<u64>,
    pub vram_utilization_percent: MetricValue<f64>,
    pub core_temperature_celsius: MetricValue<f64>,
    pub hotspot_temperature_celsius: MetricValue<f64>,
    pub core_clock_mhz: MetricValue<u32>,
    pub memory_clock_mhz: MetricValue<u32>,
    pub power_watts: MetricValue<f64>,
    pub fan_speed_percent: MetricValue<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StorageVolumeMonitoringData {
    pub drive_letter: String,
    pub label: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub utilization_percent: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemMonitoringData {
    pub os_version: String,
    pub os_build: String,
    pub uptime_seconds: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonitoringSnapshot {
    pub timestamp: String,
    pub status: String, // "success" | "partial" | "unsupported" | "error"
    pub cpu: CpuMonitoringData,
    pub memory: MemoryMonitoringData,
    pub gpus: Vec<GpuMonitoringData>,
    pub storage: Vec<StorageVolumeMonitoringData>,
    pub system: SystemMonitoringData,
}

// ---------------------------------------------------------------------------
// IMPLEMENTAZIONE WINDOWS NATIVA
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use std::ffi::c_void;
    use std::ptr::null_mut;
    use winreg::enums::*;
    use winreg::RegKey;

    #[repr(C)]
    #[derive(Copy, Clone, Default)]
    struct FileTime {
        dw_low_date_time: u32,
        dw_high_date_time: u32,
    }

    impl FileTime {
        fn to_u64(&self) -> u64 {
            ((self.dw_high_date_time as u64) << 32) | (self.dw_low_date_time as u64)
        }
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
        fn GetSystemTimes(
            lp_idle_time: *mut FileTime,
            lp_kernel_time: *mut FileTime,
            lp_user_time: *mut FileTime,
        ) -> i32;

        fn GlobalMemoryStatusEx(lp_buffer: *mut MemoryStatusEx) -> i32;

        fn GetTickCount64() -> u64;

        fn GetLogicalDriveStringsW(n_buffer_length: u32, lp_buffer: *mut u16) -> u32;

        fn GetDriveTypeW(lp_root_path_name: *const u16) -> u32;

        fn GetDiskFreeSpaceExW(
            lp_directory_name: *const u16,
            lp_free_bytes_available_to_caller: *mut u64,
            lp_total_number_of_bytes: *mut u64,
            lp_total_number_of_free_bytes: *mut u64,
        ) -> i32;

        fn GetVolumeInformationW(
            lp_root_path_name: *const u16,
            lp_volume_name_buffer: *mut u16,
            n_volume_name_size: u32,
            lp_volume_serial_number: *mut u32,
            lp_maximum_component_length: *mut u32,
            lp_file_system_flags: *mut u32,
            lp_file_system_name_buffer: *mut u16,
            n_file_system_name_size: u32,
        ) -> i32;

        fn LoadLibraryA(lp_lib_file_name: *const i8) -> *mut c_void;
        fn GetProcAddress(h_module: *mut c_void, lp_proc_name: *const i8) -> *mut c_void;
        fn FreeLibrary(h_lib_module: *mut c_void) -> i32;
    }

    const DRIVE_FIXED: u32 = 3;

    struct CpuSample {
        idle: u64,
        kernel: u64,
        user: u64,
        instant: Instant,
    }

    static LAST_CPU_SAMPLE: Mutex<Option<CpuSample>> = Mutex::new(None);

    fn sample_cpu_raw() -> Option<(u64, u64, u64)> {
        let mut idle = FileTime::default();
        let mut kernel = FileTime::default();
        let mut user = FileTime::default();

        let ok = unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) };
        if ok != 0 {
            Some((idle.to_u64(), kernel.to_u64(), user.to_u64()))
        } else {
            None
        }
    }

    pub fn get_cpu_utilization() -> (f64, String) {
        let mut guard = LAST_CPU_SAMPLE.lock().unwrap_or_else(|e| e.into_inner());

        let now_instant = Instant::now();
        let current_sample = match sample_cpu_raw() {
            Some(s) => s,
            None => return (0.0, "GetSystemTimes_failed".to_string()),
        };

        if let Some(prev) = guard.as_ref() {
            let elapsed = now_instant.duration_since(prev.instant);
            // Se la misurazione precedente è avvenuta tra 50ms e 30s fa, usala come riferimento
            if elapsed >= Duration::from_millis(50) && elapsed <= Duration::from_secs(30) {
                let delta_kernel = current_sample.1.saturating_sub(prev.kernel);
                let delta_user = current_sample.2.saturating_sub(prev.user);
                let delta_idle = current_sample.0.saturating_sub(prev.idle);

                let total_sys = delta_kernel + delta_user;
                let usage = if total_sys > 0 && total_sys >= delta_idle {
                    let busy = total_sys - delta_idle;
                    ((busy as f64 / total_sys as f64) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };

                *guard = Some(CpuSample {
                    idle: current_sample.0,
                    kernel: current_sample.1,
                    user: current_sample.2,
                    instant: now_instant,
                });

                return (round_1(usage), "Win32_GetSystemTimes_continuous".to_string());
            }
        }

        // Primo avvio o intervallo scaduto: campionamento con micro-delta controllato (60ms)
        std::thread::sleep(Duration::from_millis(60));
        let second_sample = match sample_cpu_raw() {
            Some(s) => s,
            None => return (0.0, "GetSystemTimes_failed".to_string()),
        };

        let delta_kernel = second_sample.1.saturating_sub(current_sample.1);
        let delta_user = second_sample.2.saturating_sub(current_sample.2);
        let delta_idle = second_sample.0.saturating_sub(current_sample.0);

        let total_sys = delta_kernel + delta_user;
        let usage = if total_sys > 0 && total_sys >= delta_idle {
            let busy = total_sys - delta_idle;
            ((busy as f64 / total_sys as f64) * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        *guard = Some(CpuSample {
            idle: second_sample.0,
            kernel: second_sample.1,
            user: second_sample.2,
            instant: Instant::now(),
        });

        (round_1(usage), "Win32_GetSystemTimes_sampled".to_string())
    }

    pub fn get_cpu_info() -> (u32, Option<u32>) {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut core_count = std::thread::available_parallelism()
            .map(|p| p.get() as u32)
            .unwrap_or(1);
        let mut mhz = None;

        if let Ok(cpu_base) = hklm.open_subkey("HARDWARE\\DESCRIPTION\\System\\CentralProcessor") {
            let reg_cores = cpu_base.enum_keys().count() as u32;
            if reg_cores > 0 {
                core_count = reg_cores;
            }
            if let Ok(c0) = cpu_base.open_subkey("0") {
                if let Ok(val) = c0.get_value::<u32, _>("~MHz") {
                    mhz = Some(val);
                }
            }
        }

        (core_count, mhz)
    }

    pub fn get_memory_info() -> MemoryMonitoringData {
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
            let total = status.ull_total_phys;
            let available = status.ull_avail_phys;
            let used = total.saturating_sub(available);
            let pct = (used as f64 / total as f64) * 100.0;

            MemoryMonitoringData {
                total_bytes: total,
                used_bytes: used,
                available_bytes: available,
                utilization_percent: round_1(pct),
            }
        } else {
            MemoryMonitoringData {
                total_bytes: 0,
                used_bytes: 0,
                available_bytes: 0,
                utilization_percent: 0.0,
            }
        }
    }

    // -----------------------------------------------------------------------
    // NVML Dynamic Telemetry Support
    // -----------------------------------------------------------------------

    #[repr(C)]
    struct NvmlUtilization {
        gpu: u32,
        memory: u32,
    }

    #[repr(C)]
    struct NvmlMemory {
        total: u64,
        free: u64,
        used: u64,
    }

    type FnNvmlInit = unsafe extern "C" fn() -> i32;
    type FnNvmlShutdown = unsafe extern "C" fn() -> i32;
    type FnNvmlDeviceGetCount = unsafe extern "C" fn(*mut u32) -> i32;
    type FnNvmlDeviceGetHandleByIndex = unsafe extern "C" fn(u32, *mut *mut c_void) -> i32;
    type FnNvmlDeviceGetName = unsafe extern "C" fn(*mut c_void, *mut i8, u32) -> i32;
    type FnNvmlDeviceGetTemperature = unsafe extern "C" fn(*mut c_void, u32, *mut u32) -> i32;
    type FnNvmlDeviceGetUtilizationRates = unsafe extern "C" fn(*mut c_void, *mut NvmlUtilization) -> i32;
    type FnNvmlDeviceGetClockInfo = unsafe extern "C" fn(*mut c_void, u32, *mut u32) -> i32;
    type FnNvmlDeviceGetPowerUsage = unsafe extern "C" fn(*mut c_void, *mut u32) -> i32;
    type FnNvmlDeviceGetFanSpeed = unsafe extern "C" fn(*mut c_void, *mut u32) -> i32;
    type FnNvmlDeviceGetMemoryInfo = unsafe extern "C" fn(*mut c_void, *mut NvmlMemory) -> i32;

    struct NvmlTelemetry {
        name: String,
        utilization: Option<f64>,
        vram_total: Option<u64>,
        vram_used: Option<u64>,
        temperature: Option<f64>,
        core_clock_mhz: Option<u32>,
        memory_clock_mhz: Option<u32>,
        power_watts: Option<f64>,
        fan_speed_pct: Option<f64>,
    }

    fn query_nvml_gpus() -> Result<Vec<NvmlTelemetry>, String> {
        let nvml_lib_names = ["nvml.dll\0", "C:\\Windows\\System32\\nvml.dll\0"];
        let mut handle: *mut c_void = null_mut();

        for name in nvml_lib_names {
            handle = unsafe { LoadLibraryA(name.as_ptr() as *const i8) };
            if !handle.is_null() {
                break;
            }
        }

        if handle.is_null() {
            return Err("nvml_dll_not_found".to_string());
        }

        let res = (|| unsafe {
            let fn_init: FnNvmlInit = std::mem::transmute(GetProcAddress(handle, b"nvmlInit_v2\0".as_ptr() as *const i8));
            let fn_shutdown: FnNvmlShutdown = std::mem::transmute(GetProcAddress(handle, b"nvmlShutdown\0".as_ptr() as *const i8));
            let fn_count: FnNvmlDeviceGetCount = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetCount_v2\0".as_ptr() as *const i8));
            let fn_get_handle: FnNvmlDeviceGetHandleByIndex = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetHandleByIndex_v2\0".as_ptr() as *const i8));
            let fn_get_name: FnNvmlDeviceGetName = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetName\0".as_ptr() as *const i8));
            let fn_get_temp: FnNvmlDeviceGetTemperature = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetTemperature\0".as_ptr() as *const i8));
            let fn_get_util: FnNvmlDeviceGetUtilizationRates = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetUtilizationRates\0".as_ptr() as *const i8));
            let fn_get_clock: FnNvmlDeviceGetClockInfo = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetClockInfo\0".as_ptr() as *const i8));
            let fn_get_power: FnNvmlDeviceGetPowerUsage = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetPowerUsage\0".as_ptr() as *const i8));
            let fn_get_fan: FnNvmlDeviceGetFanSpeed = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetFanSpeed\0".as_ptr() as *const i8));
            let fn_get_mem: FnNvmlDeviceGetMemoryInfo = std::mem::transmute(GetProcAddress(handle, b"nvmlDeviceGetMemoryInfo\0".as_ptr() as *const i8));

            if fn_init() != 0 {
                return Err("nvmlInit_failed".to_string());
            }

            let mut count = 0u32;
            if fn_count(&mut count) != 0 || count == 0 {
                let _ = fn_shutdown();
                return Err("no_nvml_devices".to_string());
            }

            let mut telemetries = Vec::new();
            for i in 0..count {
                let mut dev_handle: *mut c_void = null_mut();
                if fn_get_handle(i, &mut dev_handle) != 0 || dev_handle.is_null() {
                    continue;
                }

                // Name
                let mut name_buf = [0i8; 96];
                let name_str = if fn_get_name(dev_handle, name_buf.as_mut_ptr(), 96) == 0 {
                    let cstr = std::ffi::CStr::from_ptr(name_buf.as_ptr());
                    cstr.to_string_lossy().to_string()
                } else {
                    format!("NVIDIA GPU {}", i)
                };

                // Utilization
                let mut util = NvmlUtilization { gpu: 0, memory: 0 };
                let util_pct = if fn_get_util(dev_handle, &mut util) == 0 {
                    Some(util.gpu as f64)
                } else {
                    None
                };

                // Memory
                let mut mem = NvmlMemory { total: 0, free: 0, used: 0 };
                let (vram_tot, vram_usd) = if fn_get_mem(dev_handle, &mut mem) == 0 {
                    (Some(mem.total), Some(mem.used))
                } else {
                    (None, None)
                };

                // Temperature (0 = NVML_TEMPERATURE_GPU)
                let mut temp = 0u32;
                let temp_val = if fn_get_temp(dev_handle, 0, &mut temp) == 0 && temp < 130 {
                    Some(temp as f64)
                } else {
                    None
                };

                // Clocks: 0 = Graphics (Core), 2 = Memory
                let mut core_clock = 0u32;
                let core_clk_val = if fn_get_clock(dev_handle, 0, &mut core_clock) == 0 {
                    Some(core_clock)
                } else {
                    None
                };

                let mut mem_clock = 0u32;
                let mem_clk_val = if fn_get_clock(dev_handle, 2, &mut mem_clock) == 0 {
                    Some(mem_clock)
                } else {
                    None
                };

                // Power in milliwatts -> Watts
                let mut pwr_mw = 0u32;
                let pwr_watts = if fn_get_power(dev_handle, &mut pwr_mw) == 0 {
                    Some(round_1(pwr_mw as f64 / 1000.0))
                } else {
                    None
                };

                // Fan speed in %
                let mut fan_pct = 0u32;
                let fan_val = if fn_get_fan(dev_handle, &mut fan_pct) == 0 {
                    Some(fan_pct as f64)
                } else {
                    None
                };

                telemetries.push(NvmlTelemetry {
                    name: name_str,
                    utilization: util_pct,
                    vram_total: vram_tot,
                    vram_used: vram_usd,
                    temperature: temp_val,
                    core_clock_mhz: core_clk_val,
                    memory_clock_mhz: mem_clk_val,
                    power_watts: pwr_watts,
                    fan_speed_pct: fan_val,
                });
            }

            let _ = fn_shutdown();
            Ok(telemetries)
        })();

        unsafe { FreeLibrary(handle) };
        res
    }

    pub fn get_gpus_monitoring() -> Vec<GpuMonitoringData> {
        let mut list = Vec::new();

        // 1. Tenta telemetria profonda NVML per schede NVIDIA
        let nvml_results = query_nvml_gpus().ok().unwrap_or_default();

        // 2. Enumerazione standard Display Adapter da Registro Windows (copre NVIDIA, AMD e Intel)
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        if let Ok(video_class) = hklm.open_subkey("SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}") {
            let mut gpu_idx = 0;
            for subkey_name in video_class.enum_keys().filter_map(|k| k.ok()) {
                if subkey_name.starts_with("00") {
                    if let Ok(sub) = video_class.open_subkey(&subkey_name) {
                        let desc: String = sub.get_value("DriverDesc").unwrap_or_default();
                        let desc_clean = desc.trim().replace('\0', "").trim().to_string();
                        let upper = desc_clean.to_uppercase();

                        if !desc_clean.is_empty()
                            && !upper.contains("BASIC DISPLAY")
                            && !upper.contains("VIRTUAL")
                            && !upper.contains("REMOTE")
                            && !upper.contains("MIRACAST")
                        {
                            let is_discrete = upper.contains("NVIDIA") || upper.contains("GEFORCE") || upper.contains("RTX")
                                || (upper.contains("RADEON") && !upper.contains("GRAPHICS")) || upper.contains("ARC A");

                            let vendor = if upper.contains("NVIDIA") || upper.contains("GEFORCE") {
                                "NVIDIA".to_string()
                            } else if upper.contains("AMD") || upper.contains("RADEON") {
                                "AMD".to_string()
                            } else if upper.contains("INTEL") {
                                "Intel".to_string()
                            } else {
                                "Generic".to_string()
                            };

                            // VRAM statica da Registry
                            let mut vram_bytes: u64 = 0;
                            if let Ok(qw) = sub.get_value::<u64, _>("HardwareInformation.qwMemorySize") {
                                vram_bytes = qw;
                            } else if let Ok(dw) = sub.get_value::<u32, _>("HardwareInformation.MemorySize") {
                                vram_bytes = dw as u64;
                            }

                            // Match con eventuale telemetria NVML
                            let nvml_match = nvml_results.iter().find(|n| {
                                n.name.to_uppercase().contains(&upper) || upper.contains(&n.name.to_uppercase())
                            });

                            let id = format!("gpu-{}", gpu_idx);
                            gpu_idx += 1;

                            let (util_pct, vram_tot, vram_usd, vram_pct, temp_c, core_clk, mem_clk, pwr_w, fan_pct) = if let Some(nv) = nvml_match {
                                let total = nv.vram_total.unwrap_or(vram_bytes);
                                let used = nv.vram_used;
                                let pct = match (used, total) {
                                    (Some(u), t) if t > 0 => Some(round_1((u as f64 / t as f64) * 100.0)),
                                    _ => None,
                                };

                                (
                                    nv.utilization.map(|u| MetricValue::available(u, Some("%"), "NVML")),
                                    if total > 0 { Some(MetricValue::available(total, Some("bytes"), "NVML")) } else { None },
                                    used.map(|u| MetricValue::available(u, Some("bytes"), "NVML")),
                                    pct.map(|p| MetricValue::available(p, Some("%"), "NVML")),
                                    nv.temperature.map(|t| MetricValue::available(t, Some("°C"), "NVML")),
                                    nv.core_clock_mhz.map(|c| MetricValue::available(c, Some("MHz"), "NVML")),
                                    nv.memory_clock_mhz.map(|m| MetricValue::available(m, Some("MHz"), "NVML")),
                                    nv.power_watts.map(|w| MetricValue::available(w, Some("W"), "NVML")),
                                    nv.fan_speed_pct.map(|f| MetricValue::available(f, Some("%"), "NVML")),
                                )
                            } else {
                                (
                                    None,
                                    if vram_bytes > 0 { Some(MetricValue::available(vram_bytes, Some("bytes"), "Windows_Registry")) } else { None },
                                    None,
                                    None,
                                    None,
                                    None,
                                    None,
                                    None,
                                    None,
                                )
                            };

                            let gpu_data = GpuMonitoringData {
                                id,
                                name: desc_clean,
                                vendor,
                                is_discrete,
                                utilization_percent: util_pct.unwrap_or_else(|| {
                                    MetricValue::unavailable("D3DKMT/Registry", "live_utilization_requires_vendor_telemetry")
                                }),
                                vram_total_bytes: vram_tot.unwrap_or_else(|| {
                                    MetricValue::unavailable("Windows_Registry", "vram_size_not_reported")
                                }),
                                vram_used_bytes: vram_usd.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/D3DKMT", "vram_usage_requires_vendor_telemetry")
                                }),
                                vram_utilization_percent: vram_pct.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/D3DKMT", "vram_utilization_requires_vendor_telemetry")
                                }),
                                core_temperature_celsius: temp_c.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/ADL", "vendor_thermal_sensor_unavailable")
                                }),
                                hotspot_temperature_celsius: MetricValue::unsupported("NVML", "hotspot_sensor_requires_elevated_api"),
                                core_clock_mhz: core_clk.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/ADL", "core_clock_sensor_unavailable")
                                }),
                                memory_clock_mhz: mem_clk.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/ADL", "memory_clock_sensor_unavailable")
                                }),
                                power_watts: pwr_w.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/ADL", "power_sensor_unavailable")
                                }),
                                fan_speed_percent: fan_pct.unwrap_or_else(|| {
                                    MetricValue::unavailable("NVML/ADL", "fan_sensor_unavailable")
                                }),
                            };

                            list.push(gpu_data);
                        }
                    }
                }
            }
        }

        // Se NVML ha trovato una GPU che non era ancora nell'elenco display, aggiungila
        for nv in &nvml_results {
            if !list.iter().any(|g| g.name.to_uppercase().contains(&nv.name.to_uppercase())) {
                let total = nv.vram_total.unwrap_or(0);
                let used = nv.vram_used;
                let pct = match (used, total) {
                    (Some(u), t) if t > 0 => Some(round_1((u as f64 / t as f64) * 100.0)),
                    _ => None,
                };

                list.push(GpuMonitoringData {
                    id: format!("gpu-nvml-{}", list.len()),
                    name: nv.name.clone(),
                    vendor: "NVIDIA".to_string(),
                    is_discrete: true,
                    utilization_percent: nv.utilization.map(|u| MetricValue::available(u, Some("%"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_util")),
                    vram_total_bytes: if total > 0 { MetricValue::available(total, Some("bytes"), "NVML") } else { MetricValue::unavailable("NVML", "no_vram_total") },
                    vram_used_bytes: used.map(|u| MetricValue::available(u, Some("bytes"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_vram_used")),
                    vram_utilization_percent: pct.map(|p| MetricValue::available(p, Some("%"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_vram_pct")),
                    core_temperature_celsius: nv.temperature.map(|t| MetricValue::available(t, Some("°C"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_temp")),
                    hotspot_temperature_celsius: MetricValue::unsupported("NVML", "hotspot_sensor_requires_elevated_api"),
                    core_clock_mhz: nv.core_clock_mhz.map(|c| MetricValue::available(c, Some("MHz"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_clock")),
                    memory_clock_mhz: nv.memory_clock_mhz.map(|m| MetricValue::available(m, Some("MHz"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_mem_clock")),
                    power_watts: nv.power_watts.map(|w| MetricValue::available(w, Some("W"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_power")),
                    fan_speed_percent: nv.fan_speed_pct.map(|f| MetricValue::available(f, Some("%"), "NVML")).unwrap_or_else(|| MetricValue::unavailable("NVML", "no_fan")),
                });
            }
        }

        // Priorità alle schede video dedicate
        list.sort_by(|a, b| b.is_discrete.cmp(&a.is_discrete));
        list
    }

    pub fn get_storage_volumes() -> Vec<StorageVolumeMonitoringData> {
        let mut volumes = Vec::new();
        let mut buffer = [0u16; 512];

        let len = unsafe { GetLogicalDriveStringsW(512, buffer.as_mut_ptr()) };
        if len == 0 || len >= 512 {
            return volumes;
        }

        let mut offset = 0;
        while offset < len as usize {
            let slice = &buffer[offset..];
            if slice[0] == 0 {
                break;
            }

            let drive_len = slice.iter().position(|&c| c == 0).unwrap_or(0);
            let drive_wstr = &slice[..=drive_len]; // include null terminator

            let drive_type = unsafe { GetDriveTypeW(drive_wstr.as_ptr()) };
            if drive_type == DRIVE_FIXED {
                let drive_str = String::from_utf16_lossy(&drive_wstr[..drive_len]).replace('\\', "");

                let mut free_avail = 0u64;
                let mut total = 0u64;
                let mut total_free = 0u64;

                let space_ok = unsafe {
                    GetDiskFreeSpaceExW(
                        drive_wstr.as_ptr(),
                        &mut free_avail,
                        &mut total,
                        &mut total_free,
                    )
                };

                let mut label_buf = [0u16; 128];
                let mut fs_buf = [0u16; 64];
                let _ = unsafe {
                    GetVolumeInformationW(
                        drive_wstr.as_ptr(),
                        label_buf.as_mut_ptr(),
                        128,
                        null_mut(),
                        null_mut(),
                        null_mut(),
                        fs_buf.as_mut_ptr(),
                        64,
                    )
                };

                let label_len = label_buf.iter().position(|&c| c == 0).unwrap_or(0);
                let fs_len = fs_buf.iter().position(|&c| c == 0).unwrap_or(0);

                let label = String::from_utf16_lossy(&label_buf[..label_len]).trim().to_string();
                let fs = String::from_utf16_lossy(&fs_buf[..fs_len]).trim().to_string();

                if space_ok != 0 && total > 0 {
                    let used = total.saturating_sub(total_free);
                    let pct = (used as f64 / total as f64) * 100.0;

                    volumes.push(StorageVolumeMonitoringData {
                        drive_letter: drive_str,
                        label,
                        file_system: fs,
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: total_free,
                        utilization_percent: round_1(pct),
                    });
                }
            }

            offset += drive_len + 1;
        }

        volumes
    }

    pub fn get_system_info() -> SystemMonitoringData {
        let uptime_ms = unsafe { GetTickCount64() };
        let uptime_secs = uptime_ms / 1000;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let mut os_version = "Windows".to_string();
        let mut os_build = String::new();

        if let Ok(cv) = hklm.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion") {
            let prod: String = cv.get_value("ProductName").unwrap_or_default();
            let disp: String = cv.get_value("DisplayVersion").unwrap_or_default();
            let build: String = cv.get_value("CurrentBuildNumber").unwrap_or_default();

            if !prod.is_empty() {
                if !disp.is_empty() {
                    os_version = format!("{} {}", prod, disp);
                } else {
                    os_version = prod;
                }
            }
            os_build = build;
        }

        SystemMonitoringData {
            os_version,
            os_build,
            uptime_seconds: uptime_secs,
        }
    }

    fn round_1(val: f64) -> f64 {
        (val * 10.0).round() / 10.0
    }
}

// ---------------------------------------------------------------------------
// FALLBACK NON-WINDOWS
// ---------------------------------------------------------------------------

#[cfg(not(target_os = "windows"))]
mod non_windows_impl {
    use super::*;

    pub fn get_cpu_utilization() -> (f64, String) {
        (0.0, "non_windows_stub".to_string())
    }

    pub fn get_cpu_info() -> (u32, Option<u32>) {
        (1, None)
    }

    pub fn get_memory_info() -> MemoryMonitoringData {
        MemoryMonitoringData {
            total_bytes: 0,
            used_bytes: 0,
            available_bytes: 0,
            utilization_percent: 0.0,
        }
    }

    pub fn get_gpus_monitoring() -> Vec<GpuMonitoringData> {
        vec![]
    }

    pub fn get_storage_volumes() -> Vec<StorageVolumeMonitoringData> {
        vec![]
    }

    pub fn get_system_info() -> SystemMonitoringData {
        SystemMonitoringData {
            os_version: "Non-Windows OS".to_string(),
            os_build: "0".to_string(),
            uptime_seconds: 0,
        }
    }
}

// ---------------------------------------------------------------------------
// TAURI COMMAND ENTRYPOINT
// ---------------------------------------------------------------------------

/// Genera uno snapshot telemetrico aggregato dell'hardware e del sistema Windows.
/// Singola chiamata IPC batch, zero thread permanenti, zero scritture su disco.
#[tauri::command]
pub async fn get_monitoring_snapshot() -> Result<MonitoringSnapshot, String> {
    let now_iso = {
        let now = SystemTime::now();
        let dur = now.duration_since(UNIX_EPOCH).unwrap_or_default();
        format!("{}.{:03}Z", dur.as_secs(), dur.subsec_millis())
    };

    #[cfg(target_os = "windows")]
    {
        let (cpu_usage, cpu_source) = windows_impl::get_cpu_utilization();
        let (core_count, base_mhz) = windows_impl::get_cpu_info();
        let memory = windows_impl::get_memory_info();
        let gpus = windows_impl::get_gpus_monitoring();
        let storage = windows_impl::get_storage_volumes();
        let system = windows_impl::get_system_info();

        let cpu_data = CpuMonitoringData {
            utilization_percent: MetricValue::available(cpu_usage, Some("%"), &cpu_source),
            logical_processor_count: core_count,
            base_frequency_mhz: base_mhz
                .map(|m| MetricValue::available(m, Some("MHz"), "Win32_Registry"))
                .unwrap_or_else(|| MetricValue::unavailable("Win32_Registry", "not_reported")),
            package_temperature_celsius: MetricValue::unsupported(
                "Windows_WMI/ACPI",
                "cpu_core_temp_requires_kernel_ring0_driver",
            ),
            package_power_watts: MetricValue::unsupported(
                "RAPL/Windows_Energy",
                "package_power_requires_kernel_driver",
            ),
        };

        let has_critical_metrics = cpu_data.utilization_percent.value.is_some()
            && memory.total_bytes > 0
            && !storage.is_empty();

        let status = if has_critical_metrics {
            "success".to_string()
        } else {
            "partial".to_string()
        };

        Ok(MonitoringSnapshot {
            timestamp: now_iso,
            status,
            cpu: cpu_data,
            memory,
            gpus,
            storage,
            system,
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(MonitoringSnapshot {
            timestamp: now_iso,
            status: "unsupported".to_string(),
            cpu: CpuMonitoringData {
                utilization_percent: MetricValue::unsupported("OS", "only_windows_supported"),
                logical_processor_count: 1,
                base_frequency_mhz: MetricValue::unsupported("OS", "only_windows_supported"),
                package_temperature_celsius: MetricValue::unsupported("OS", "only_windows_supported"),
                package_power_watts: MetricValue::unsupported("OS", "only_windows_supported"),
            },
            memory: non_windows_impl::get_memory_info(),
            gpus: vec![],
            storage: vec![],
            system: non_windows_impl::get_system_info(),
        })
    }
}
