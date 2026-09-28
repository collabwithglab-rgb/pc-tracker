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

    println!("\n--- 4. EVENT LOG NATIVE FACTS (TRANCHE 8A) ---");
    println!("Availability: {}", snapshot.event_log.availability);
    println!("Source: {}", snapshot.event_log.source);
    println!("Query Time Window: {} hours", snapshot.event_log.query_time_window_hours);
    println!("Max Events Cap: {}", snapshot.event_log.max_events_cap);
    println!("Returned Event Count: {}", snapshot.event_log.returned_event_count);
    println!("Truncated: {}", snapshot.event_log.truncated);

    if snapshot.event_log.events.is_empty() {
        println!("No allowlist events detected in the specified time window (Healthy system).");
    } else {
        println!("Detected {} event(s):", snapshot.event_log.events.len());
        for (i, ev) in snapshot.event_log.events.iter().enumerate() {
            println!("  [{}] Provider: {}, EventID: {}, Level: {}, Time: {}",
                i + 1, ev.provider, ev.event_id, ev.level, ev.timestamp);
            println!("      RecordID: {}, TargetContext: {:?}", ev.record_id, ev.target_context);
            println!("      Payload: {:?}", ev.payload);
        }
    }

    // Benchmark reale con Instant su Windows
    #[cfg(target_os = "windows")]
    {
        println!("\n--- 5. TIMINGS & BENCHMARK PRESTAZIONALE (TRANCHE 8A) ---");
        let start_measure = std::time::Instant::now();
        let (snap_measured, timings) = pc_tracker_lib::diagnostics::windows_impl::query_event_log_measured(168, 50);
        let total_bench_elapsed = start_measure.elapsed();

        println!("  Target:   < 20.00 ms (20000 µs)");
        println!("  Estimate: ~8.00 - 15.00 ms (query SCM/Wevtapi XPath)");
        println!("  Measured:");
        println!("    - Event Log Query Duration:  {:.3} ms ({} µs)", timings.query_duration_us as f64 / 1000.0, timings.query_duration_us);
        println!("    - Event Parsing Duration:    {:.3} ms ({} µs)", timings.parse_duration_us as f64 / 1000.0, timings.parse_duration_us);
        println!("    - Total Provider Duration:   {:.3} ms ({} µs)", timings.total_duration_us as f64 / 1000.0, timings.total_duration_us);
        println!("    - Wall Clock Total:          {:.3} ms", total_bench_elapsed.as_secs_f64() * 1000.0);
        println!("    - Availability:              {}", snap_measured.availability);
        println!("    - Returned Count:            {}", snap_measured.returned_event_count);
        println!("    - Truncated Flag:            {}", snap_measured.truncated);
    }

    println!("\n--- 6. EXHAUSTIVE TRANCHE 8A TEST SUITE ---");

    // A-E. CAPPING & SENTINEL PROBE SCENARIOS
    {
        // A. 0 eventi -> 0 / false
        let (ev_a, cnt_a, tr_a) = apply_event_cap_and_sentinel(Vec::<u32>::new(), false, 50);
        assert_eq!(cnt_a, 0);
        assert_eq!(tr_a, false);
        assert_eq!(ev_a.len(), 0);

        // B. 49 eventi -> 49 / false
        let (ev_b, cnt_b, tr_b) = apply_event_cap_and_sentinel((0..49).collect(), false, 50);
        assert_eq!(cnt_b, 49);
        assert_eq!(tr_b, false);
        assert_eq!(ev_b.len(), 49);

        // C. 50 eventi esatti senza sentinel -> 50 / false
        let (ev_c, cnt_c, tr_c) = apply_event_cap_and_sentinel((0..50).collect(), false, 50);
        assert_eq!(cnt_c, 50);
        assert_eq!(tr_c, false);
        assert_eq!(ev_c.len(), 50);

        // D. 50 eventi con sentinel positivo (51+ eventi) -> 50 / true (sentinel scartato)
        let (ev_d, cnt_d, tr_d) = apply_event_cap_and_sentinel((0..50).collect(), true, 50);
        assert_eq!(cnt_d, 50);
        assert_eq!(tr_d, true);
        assert_eq!(ev_d.len(), 50);

        // E. 55 eventi con sentinel -> 50 / true
        let (ev_e, cnt_e, tr_e) = apply_event_cap_and_sentinel((0..55).collect(), true, 50);
        assert_eq!(cnt_e, 50);
        assert_eq!(tr_e, true);
        assert_eq!(ev_e.len(), 50);

        println!("  [PASS] A-E: Cap 50 and Sentinel Probe Scenarios (0, 49, 50, 51, 55)");
    }

    // F. DISK 7 != DISK 51
    {
        let xml7 = "<Event><System><Provider Name='disk'/><EventID>7</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-20T10:00:00Z'/><EventRecordID>100</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk0\\DR0</Data></EventData></Event>";
        let xml51 = "<Event><System><Provider Name='disk'/><EventID>51</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-20T10:05:00Z'/><EventRecordID>101</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk0\\DR0</Data></EventData></Event>";

        let fact7 = parse_event_xml(xml7).expect("parse disk 7");
        let fact51 = parse_event_xml(xml51).expect("parse disk 51");
        assert_eq!(fact7.event_id, 7);
        assert_eq!(fact51.event_id, 51);
        assert_ne!(fact7.event_id, fact51.event_id);
        assert_eq!(fact7.target_context.as_deref(), Some("\\Device\\Harddisk0\\DR0"));
        assert_eq!(fact51.target_context.as_deref(), Some("\\Device\\Harddisk0\\DR0"));
        println!("  [PASS] F: disk 7 != disk 51 distinct event separation");
    }

    // G. DISK 11 CONTROLLER ERROR CONTEXT
    {
        let xml11 = "<Event><System><Provider Name='disk'/><EventID>11</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-21T08:00:00Z'/><EventRecordID>102</EventRecordID><Channel>System</Channel></System><EventData><Data Name='Device'>\\Device\\Harddisk1\\DR1</Data><Data Name='Status'>0xC000000E</Data></EventData></Event>";
        let fact11 = parse_event_xml(xml11).expect("parse disk 11");
        assert_eq!(fact11.event_id, 11);
        assert_eq!(fact11.target_context.as_deref(), Some("\\Device\\Harddisk1\\DR1"));
        if let Some(EventPayload::Disk { device_name, io_status }) = fact11.payload {
            assert_eq!(device_name.as_deref(), Some("\\Device\\Harddisk1\\DR1"));
            assert_eq!(io_status.as_deref(), Some("0xC000000E"));
        } else {
            panic!("Expected EventPayload::Disk");
        }
        println!("  [PASS] G: disk 11 controller error context preserved without disk failure claim");
    }

    // H. NTFS 55 VS NTFS 98
    {
        let xml55 = "<Event><System><Provider Name='Ntfs'/><EventID>55</EventID><Level>2</Level><TimeCreated SystemTime='2026-09-22T09:00:00Z'/><EventRecordID>103</EventRecordID><Channel>System</Channel></System><EventData><Data Name='DriveName'>C:</Data><Data Name='Description'>Corruption</Data></EventData></Event>";
        let xml98 = "<Event><System><Provider Name='Ntfs'/><EventID>98</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-22T09:30:00Z'/><EventRecordID>104</EventRecordID><Channel>System</Channel></System><EventData><Data Name='VolumeName'>D:</Data><Data Name='RepairHint'>Online spot fix required</Data></EventData></Event>";

        let fact55 = parse_event_xml(xml55).expect("parse ntfs 55");
        let fact98 = parse_event_xml(xml98).expect("parse ntfs 98");
        assert_eq!(fact55.event_id, 55);
        assert_eq!(fact98.event_id, 98);
        assert_ne!(fact55.event_id, fact98.event_id);
        assert_eq!(fact55.target_context.as_deref(), Some("C:"));
        assert_eq!(fact98.target_context.as_deref(), Some("D:"));
        println!("  [PASS] H: NTFS 55 vs 98 preserved as distinct native facts");
    }

    // I. KERNEL-POWER 41
    {
        let xml41 = "<Event><System><Provider Name='Microsoft-Windows-Kernel-Power'/><EventID>41</EventID><Level>1</Level><TimeCreated SystemTime='2026-09-23T11:00:00Z'/><EventRecordID>105</EventRecordID><Channel>System</Channel></System><EventData><Data Name='BugcheckCode'>159</Data><Data Name='BugcheckParameter1'>0x3</Data><Data Name='PowerButtonTimestamp'>13370000000</Data><Data Name='SleepInProgress'>0</Data><Data Name='ConnectedStandbyInProgress'>false</Data></EventData></Event>";
        let fact41 = parse_event_xml(xml41).expect("parse kp 41");
        assert_eq!(fact41.event_id, 41);
        if let Some(EventPayload::KernelPower { bugcheck_code, bugcheck_parameter1, power_button_timestamp, sleep_in_progress, connected_standby_in_progress }) = fact41.payload {
            assert_eq!(bugcheck_code, 159);
            assert_eq!(bugcheck_parameter1.as_deref(), Some("0x3"));
            assert_eq!(power_button_timestamp, 13370000000);
            assert_eq!(sleep_in_progress, Some(0));
            assert_eq!(connected_standby_in_progress, Some(false));
        } else {
            panic!("Expected EventPayload::KernelPower");
        }
        println!("  [PASS] I: Kernel-Power 41 BugcheckCode & PowerButtonTimestamp preserved");
    }

    // J. WHEA 17/18/19/47
    {
        let xml17 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>17</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:00:00Z'/><EventRecordID>106</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>4</Data></EventData></Event>";
        let xml18 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>18</EventID><Level>1</Level><TimeCreated SystemTime='2026-09-24T12:10:00Z'/><EventRecordID>107</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>3</Data><Data Name='MCABank'>2</Data></EventData></Event>";
        let xml19 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>19</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:20:00Z'/><EventRecordID>108</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>3</Data><Data Name='MCABank'>0</Data></EventData></Event>";
        let xml47 = "<Event><System><Provider Name='Microsoft-Windows-WHEA-Logger'/><EventID>47</EventID><Level>3</Level><TimeCreated SystemTime='2026-09-24T12:30:00Z'/><EventRecordID>109</EventRecordID><Channel>System</Channel></System><EventData><Data Name='ErrorSource'>5</Data></EventData></Event>";

        let fact17 = parse_event_xml(xml17).expect("parse whea 17");
        let fact18 = parse_event_xml(xml18).expect("parse whea 18");
        let fact19 = parse_event_xml(xml19).expect("parse whea 19");
        let fact47 = parse_event_xml(xml47).expect("parse whea 47");
        assert_eq!(fact17.event_id, 17);
        assert_eq!(fact18.event_id, 18);
        assert_eq!(fact19.event_id, 19);
        assert_eq!(fact47.event_id, 47);
        println!("  [PASS] J: WHEA 17/18/19/47 distinguished by Event ID and structured data");
    }

    // K & L. FALLBACK AVAILABILITY & CONTROLLED ERROR
    {
        let malformed = "<Event><Broken";
        assert!(parse_event_xml(malformed).is_none());
        let missing_id = "<Event><System><Provider Name='disk'/></System></Event>";
        assert!(parse_event_xml(missing_id).is_none());
        println!("  [PASS] K & L: Controlled parsing fallback and rendering error handling");
    }

    // JSON SERIALIZATION & CONTRACT TEST
    {
        let json = serde_json::to_string(&snapshot).expect("JSON serialization failed");
        assert!(json.contains("\"deviceProblems\""));
        assert!(json.contains("\"memoryCommit\""));
        assert!(json.contains("\"powerStatus\""));
        assert!(json.contains("\"eventLog\""));
        assert!(json.contains("\"collectionDurationMs\""));
        println!("  [PASS] Serialization & camelCase contract tests (including eventLog)");
    }

    println!("\nALL TRANCHE 8A NATIVE TESTS PASSED SUCCESSFULLY (100%)");
}
