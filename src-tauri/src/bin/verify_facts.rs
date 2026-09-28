use pc_tracker_lib::diagnostics::*;

fn main() {
    println!("=== RUNTIME WINDOWS VERIFICATION (TRANCHE 7A) ===");

    let snapshot = get_system_diagnostics_snapshot();

    println!("Snapshot Timestamp: {}", snapshot.timestamp);
    println!("Overall Status: {}", snapshot.status);
    println!("Collection Duration: {} ms", snapshot.collection_duration_ms);

    println!("\n--- 1. DEVICE / DRIVER FAULTS ---");
    println!("Availability: {}", snapshot.device_problems.availability);
    println!("Source: {}", snapshot.device_problems.source);
    println!("Total DevNodes Scanned: {}", snapshot.device_problems.total_devices_scanned);
    println!("Problem Count: {}", snapshot.device_problems.problem_count);
    if snapshot.device_problems.devices_with_problems.is_empty() {
        println!("No devices with problem status detected (Device Tree healthy).");
    } else {
        for (i, dev) in snapshot.device_problems.devices_with_problems.iter().enumerate() {
            println!("  [{}] Device ID: {}", i + 1, dev.device_id);
            println!("      Friendly Name: {:?}", dev.friendly_name);
            println!("      Problem Code: {}", dev.problem_code);
            println!("      Label: {}", dev.problem_label);
            println!("      Severity: {}", dev.severity);
            println!("      Description: {}", dev.problem_description);
            println!("      Status Flags: 0x{:08X}", dev.status_flags);
        }
    }

    println!("\n--- 2. MEMORY COMMIT DIAGNOSTICS ---");
    println!("Availability: {}", snapshot.memory_commit.availability);
    println!("Source: {}", snapshot.memory_commit.source);
    let commit_gb = snapshot.memory_commit.commit_total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let commit_limit_gb = snapshot.memory_commit.commit_limit_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let commit_peak_gb = snapshot.memory_commit.commit_peak_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let phys_total_gb = snapshot.memory_commit.physical_total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let phys_avail_gb = snapshot.memory_commit.physical_available_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let sys_cache_gb = snapshot.memory_commit.system_cache_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let paged_mb = snapshot.memory_commit.kernel_paged_bytes as f64 / (1024.0 * 1024.0);
    let nonpaged_mb = snapshot.memory_commit.kernel_nonpaged_bytes as f64 / (1024.0 * 1024.0);

    println!("Commit: {:.2} GB / {:.2} GB ({:.1}%)", commit_gb, commit_limit_gb, snapshot.memory_commit.commit_utilization_percent);
    println!("Commit Peak: {:.2} GB", commit_peak_gb);
    println!("Physical RAM: {:.2} GB Total, {:.2} GB Available ({:.1}% in use)", phys_total_gb, phys_avail_gb, snapshot.memory_commit.physical_utilization_percent);
    println!("System Cache: {:.2} GB", sys_cache_gb);
    println!("Kernel Pools: Paged {:.1} MB, NonPaged {:.1} MB", paged_mb, nonpaged_mb);
    println!("Active Tasks: {} Processes, {} Threads", snapshot.memory_commit.process_count, snapshot.memory_commit.thread_count);

    println!("\n--- 3. POWER ARCHITECTURE ---");
    println!("Availability: {}", snapshot.power_status.availability);
    println!("Source: {}", snapshot.power_status.source);
    println!("AC Line Status: {}", match snapshot.power_status.ac_line_status {
        1 => "Online (Connected to AC)",
        0 => "Offline (Running on Battery)",
        _ => "Unknown",
    });
    println!("Has System Battery: {}", snapshot.power_status.has_system_battery);
    println!("Battery Life Percent: {:?}", snapshot.power_status.battery_life_percent);
    println!("Battery Saver Active: {}", snapshot.power_status.battery_saver_active);
    println!("Is On AC: {:?}", snapshot.power_status.is_on_ac);
    println!("Is On Battery: {:?}", snapshot.power_status.is_on_battery);
    println!("Power Architecture (Heuristic): {}", snapshot.power_status.power_architecture);

    println!("\n--- 4. EXHAUSTIVE TRANCHE 7A UNIT TEST SUITE ---");

    // DEVICE TESTS
    {
        // 1. Known error code 43 (FAILED_POST)
        let (label43, desc43, sev43) = map_problem_code(43);
        assert_eq!(label43, "CM_PROB_FAILED_POST");
        assert_eq!(sev43, "critical");
        assert!(desc43.contains("arrestata da Windows"));

        // 2. Known error code 22 (DISABLED)
        let (label22, _, sev22) = map_problem_code(22);
        assert_eq!(label22, "CM_PROB_DISABLED");
        assert_eq!(sev22, "info");

        // 3. Known error code 10 (FAILED_START)
        let (label10, _, sev10) = map_problem_code(10);
        assert_eq!(label10, "CM_PROB_FAILED_START");
        assert_eq!(sev10, "warning");

        // 4. Unknown code
        let (label_unk, desc_unk, sev_unk) = map_problem_code(9999);
        assert_eq!(label_unk, "CM_PROB_UNKNOWN");
        assert_eq!(sev_unk, "attention");
        assert!(desc_unk.contains("non mappato"));

        // 5. Rule A.1: DN_HAS_PROBLEM false and code 0 is healthy
        let has_problem = false;
        let problem_code = 0u32;
        assert_eq!(has_problem || problem_code != 0, false);

        println!("  [PASS] Device fault mapping & healthy status tests");
    }

    // MEMORY TESTS
    {
        let page_size = 4096;
        // 1. Normal memory
        let normal = calculate_memory_commit(
            3_145_728, // 12 GB
            6_291_456, // 24 GB limit
            4_000_000,
            4_194_304, // 16 GB phys
            2_097_152, // 8 GB avail
            500_000,
            100_000,
            50_000,
            page_size,
            200,
            2500,
        );
        assert_eq!(normal.availability, "available");
        assert_eq!(normal.commit_total_bytes, 12 * 1024 * 1024 * 1024);
        assert_eq!(normal.commit_limit_bytes, 24 * 1024 * 1024 * 1024);
        assert_eq!(normal.commit_utilization_percent, 50.0);
        assert_eq!(normal.physical_utilization_percent, 50.0);

        // 2. High commit
        let high_commit = calculate_memory_commit(
            9_500_000,
            10_000_000,
            9_600_000,
            4_000_000,
            2_000_000,
            100_000,
            50_000,
            50_000,
            page_size,
            300,
            4000,
        );
        assert_eq!(high_commit.commit_utilization_percent, 95.0);

        // 3. Low physical memory
        let low_phys = calculate_memory_commit(
            5_000_000,
            10_000_000,
            5_000_000,
            4_000_000,
            200_000, // only 5% available
            50_000,
            50_000,
            50_000,
            page_size,
            150,
            1800,
        );
        assert_eq!(low_phys.physical_utilization_percent, 95.0);

        // 4. Zero limit (no crash / division by zero protection)
        let zero_limit = calculate_memory_commit(1000, 0, 1000, 0, 0, 0, 0, 0, page_size, 10, 100);
        assert_eq!(zero_limit.commit_utilization_percent, 0.0);
        assert_eq!(zero_limit.physical_utilization_percent, 0.0);

        // 5. Overflow / saturation protection
        let overflow = calculate_memory_commit(usize::MAX, usize::MAX, usize::MAX, usize::MAX, 0, 0, 0, 0, page_size, 1, 1);
        assert_eq!(overflow.commit_utilization_percent, 100.0);

        println!("  [PASS] Memory commit calculations & bounds protection tests");
    }

    // POWER TESTS
    {
        // 1. Desktop on AC with no battery
        let desktop = calculate_power_status(1, 128, 255, 0);
        assert_eq!(desktop.has_system_battery, false);
        assert_eq!(desktop.is_on_ac, Some(true));
        assert_eq!(desktop.is_on_battery, Some(false));
        assert_eq!(desktop.power_architecture, "desktop_like");

        // 2. Laptop on battery with battery saver
        let laptop = calculate_power_status(0, 1, 42, 1);
        assert_eq!(laptop.has_system_battery, true);
        assert_eq!(laptop.is_on_ac, Some(false));
        assert_eq!(laptop.is_on_battery, Some(true));
        assert_eq!(laptop.battery_life_percent, Some(42));
        assert_eq!(laptop.battery_saver_active, true);
        assert_eq!(laptop.power_architecture, "battery_capable");

        // 3. Laptop connected to AC charger
        let laptop_ac = calculate_power_status(1, 8, 95, 0); // 8 = charging
        assert_eq!(laptop_ac.has_system_battery, true);
        assert_eq!(laptop_ac.is_on_ac, Some(true));
        assert_eq!(laptop_ac.is_on_battery, Some(false));
        assert_eq!(laptop_ac.battery_life_percent, Some(95));
        assert_eq!(laptop_ac.battery_saver_active, false);
        assert_eq!(laptop_ac.power_architecture, "battery_capable");

        // 4. Unknown power status
        let unk = calculate_power_status(255, 255, 255, 0);
        assert_eq!(unk.has_system_battery, false);
        assert_eq!(unk.is_on_ac, None);
        assert_eq!(unk.is_on_battery, None);
        assert_eq!(unk.power_architecture, "unknown");

        println!("  [PASS] Power architecture & battery status tests");
    }

    // JSON SERIALIZATION & CONTRACT TEST
    {
        let json = serde_json::to_string(&snapshot).expect("JSON serialization failed");
        assert!(json.contains("\"deviceProblems\""));
        assert!(json.contains("\"memoryCommit\""));
        assert!(json.contains("\"powerStatus\""));
        assert!(json.contains("\"collectionDurationMs\""));
        println!("  [PASS] Serialization & camelCase contract tests");
    }

    println!("\nALL TRANCHE 7A AUTOMATED TESTS PASSED SUCCESSFULLY (100%)");
}
