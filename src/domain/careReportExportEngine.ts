/**
 * Care Center Health Report Export Engine — Motore puro di generazione ed esportazione report di salute
 * (PC Care Center - Tranche 12)
 *
 * Genera report di salute diagnostici completi in formato Markdown e JSON strutturato.
 * Include metriche di sintesi, copertura sensori, finding ordinati per gravità,
 * inventario hardware, storage/SMART, display, audio, connettività di rete e raccomandazioni.
 *
 * Regola: Zero effetti collaterali, funzioni pure e deterministiche, 100% testabili.
 */

import { SystemFactsInput, SystemHealthReport, HealthAffectedArea } from '../types/health';
import { OptimizationRecommendation } from '../types/optimization';
import { SupportedLocale } from '../types';
import { downloadFile } from '../storage/backupService';

export interface CareReportExportPayload {
  filename: string;
  content: string;
  mimeType: string;
  format: 'markdown' | 'json';
}

/**
 * Genera il report in formato JSON strutturato con schema versionato.
 */
export function generateCareHealthReportJson(
  report: SystemHealthReport,
  facts: SystemFactsInput,
  recommendations: OptimizationRecommendation[] = []
): string {
  const exportData = {
    schemaVersion: 1,
    generatedAt: report.evaluatedAt || new Date().toISOString(),
    generator: 'PC Tracker Care Center v3.1.0',
    summary: {
      healthScore: report.healthScore,
      overallStatus: report.overallStatus,
      totalFindings: report.findings.length,
      criticalFindings: report.findings.filter((f) => f.severity === 'CRITICAL').length,
      warningFindings: report.findings.filter((f) => f.severity === 'WARNING').length,
      attentionFindings: report.findings.filter((f) => f.severity === 'ATTENTION').length,
      infoFindings: report.findings.filter((f) => f.severity === 'INFO').length,
    },
    diagnosticCoverage: report.diagnosticCoverage || null,
    areaBreakdown: report.areaBreakdown,
    findings: report.findings,
    network: {
      adapter: facts.networkAdapter || null,
      wifiSignal: facts.wifiSignal || null,
      diagnostics: facts.networkDiagnostics || null,
    },
    display: facts.displayDiagnostics || null,
    audio: facts.audioDiagnostics || null,
    drives: facts.drives || [],
    smartDisks: facts.smartDisks || [],
    securityAudit: facts.securityAudit || null,
    windowsUpdate: facts.windowsUpdate || null,
    currentRigComponents: (facts.currentRigComponents || []).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      brand: c.brand,
      model: c.model,
    })),
    recommendations: recommendations.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      reason: r.reason,
      evidence: r.evidence,
      expectedBenefit: r.expectedBenefit,
      risk: r.risk,
      actionAvailability: r.actionAvailability,
    })),
    privacyNotice: '100% Local-First & Confidential — Generated locally by PC Tracker without remote telemetry.',
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Genera il report completo e formattato in Markdown per documentazione, benchmark e diagnosi.
 */
export function generateCareHealthReportMarkdown(
  report: SystemHealthReport,
  facts: SystemFactsInput,
  recommendations: OptimizationRecommendation[] = [],
  _locale: SupportedLocale = 'it'
): string {
  const lines: string[] = [];
  const dateStr = (report.evaluatedAt || new Date().toISOString()).replace('T', ' ').slice(0, 19);

  // 1. Header & Score
  lines.push('# PC Tracker Care Center — Health & Diagnostics Report');
  lines.push('');
  lines.push(`- **Evaluation Date:** \`${dateStr}\``);
  lines.push(`- **Overall Health Score:** **${report.healthScore} / 100** (\`${report.overallStatus.toUpperCase()}\`)`);
  if (report.diagnosticCoverage) {
    lines.push(
      `- **Diagnostic Coverage:** **${report.diagnosticCoverage.percentage}%** (${report.diagnosticCoverage.availableChannels}/${report.diagnosticCoverage.totalChannels} active sensors - Level \`${report.diagnosticCoverage.level.toUpperCase()}\`)`
    );
  }
  lines.push('');

  // 2. Health by Area
  lines.push('## 1. Health Breakdown by Area');
  lines.push('');
  lines.push('| Area | Status | Findings Detected |');
  lines.push('| :--- | :---: | :---: |');
  const areas: HealthAffectedArea[] = ['system', 'cpu', 'gpu', 'ram', 'storage', 'thermal', 'maintenance', 'security'];
  for (const a of areas) {
    const summary = report.areaBreakdown?.[a] || { status: 'healthy', findingsCount: 0 };
    const statusIcon =
      summary.status === 'healthy'
        ? 'OK'
        : summary.status === 'attention'
        ? 'ATTENTION'
        : summary.status === 'warning'
        ? 'WARNING'
        : 'CRITICAL';
    lines.push(`| **${a.toUpperCase()}** | \`${statusIcon}\` | ${summary.findingsCount} |`);
  }
  lines.push('');

  // 3. Network & Connectivity (Tranche 12)
  lines.push('## 2. Network Connectivity & Link Speed');
  lines.push('');
  if (facts.networkAdapter) {
    const na = facts.networkAdapter;
    const typeLabel = na.adapterType === 'wifi' ? 'Wi-Fi' : 'Ethernet (802.3)';
    lines.push(`- **Active Network Adapter:** ${na.adapterName} (${na.description})`);
    lines.push(`- **Physical Interface:** ${typeLabel}`);
    lines.push(
      `- **Negotiated Link Speed:** **${na.linkSpeedMbps} Mbps**${
        na.maxSpeedMbps ? ` (Nominal capacity: ${na.maxSpeedMbps} Mbps)` : ''
      }${na.isLinkSpeedDowngraded ? ' ⚠️ **WARNING: Link negotiation downgraded to 100 Mbps**' : ''}`
    );
    if (na.ipv4) lines.push(`- **IPv4 Address:** \`${na.ipv4}\``);
    if (na.gateway) lines.push(`- **Default Gateway:** \`${na.gateway}\``);
    if (na.macAddress) lines.push(`- **Physical MAC Address:** \`${na.macAddress}\``);
  } else {
    lines.push('- *No active physical network adapter detected.*');
  }

  if (facts.wifiSignal?.isConnected) {
    const ws = facts.wifiSignal;
    lines.push(`- **Connected Wi-Fi Network (SSID):** "${ws.ssid || 'N/A'}"`);
    lines.push(
      `- **Wi-Fi Signal Quality:** **${ws.signalQualityPercent}%** (${ws.rssiDbm} dBm) — Band: **${ws.band}** | Protocol: **${ws.standard}**`
    );
  } else if (facts.wifiSignal && !facts.wifiSignal.isConnected) {
    lines.push(`- **Wi-Fi Status:** Adapter present but disconnected from wireless networks.`);
  }

  if (facts.networkDiagnostics) {
    const nd = facts.networkDiagnostics;
    lines.push(
      `- **ICMP Latency Test (${nd.targetHost}):** Avg RTT: \`${nd.rttAvgMs ?? 'N/A'} ms\`, Jitter: \`${nd.jitterMs ?? 'N/A'} ms\`, Packet Loss: \`${nd.packetLossPercent}%\` (Rating: \`${nd.qualityRating}\`)`
    );
  }
  lines.push('');

  // 4. Active Findings
  lines.push('## 3. Active Diagnostic Findings');
  lines.push('');
  if (report.findings.length === 0) {
    lines.push('No anomalies or critical issues detected. All checks are healthy.');
  } else {
    const sorted = [...report.findings].sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, ATTENTION: 2, INFO: 3, GOOD: 4 };
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
    });

    for (const f of sorted) {
      lines.push(`### [${f.severity}] ${f.title}`);
      lines.push(`- **Area:** \`${f.area}\` | **Confidence:** \`${f.confidence}\``);
      lines.push(`- **Measured Evidence:** \`${f.evidence}\``);
      lines.push(`- **Explanation:** ${f.explanation}`);
      if (f.recommendedActionId) {
        lines.push(`- **Recommended Action:** \`${f.recommendedActionId}\``);
      }
      lines.push('');
    }
  }

  // 5. Storage & Volumes
  if (facts.drives && facts.drives.length > 0) {
    lines.push('## 4. Storage Volumes & File System');
    lines.push('');
    lines.push('| Volume | Label | File System | Total Capacity | Free Space | Media Type | TRIM |');
    lines.push('| :---: | :--- | :---: | :---: | :---: | :---: | :---: |');
    for (const d of facts.drives) {
      const totalGb = (d.totalBytes / 1024 ** 3).toFixed(1);
      const freeGb = (d.freeBytes / 1024 ** 3).toFixed(1);
      const trimStr = d.trimSupported ? 'Active' : 'N/A';
      lines.push(
        `| **${d.driveLetter}** | ${d.label || d.friendlyName || '-'} | ${d.fileSystem} | ${totalGb} GB | ${freeGb} GB | ${d.mediaType} | ${trimStr} |`
      );
    }
    lines.push('');
  }

  // 6. Display & Audio Subsystem
  lines.push('## 5. Display & Audio Subsystem');
  lines.push('');
  if (facts.displayDiagnostics?.monitors && facts.displayDiagnostics.monitors.length > 0) {
    for (const m of facts.displayDiagnostics.monitors) {
      const resStr = m.currentResolution ? `${m.currentResolution.width}x${m.currentResolution.height}` : 'N/D';
      lines.push(
        `- **Display:** ${m.monitorName || 'Display'} — Resolution: \`${resStr}\` | Refresh Rate: **${m.currentRefreshRate || 0} Hz** (Max supported: ${m.maxSupportedRefreshRate || 0} Hz)${m.isRefreshRateLimited ? ' ⚠️ [LIMITED]' : ''}`
      );
    }
  } else {
    lines.push('- *No display queried.*');
  }

  if (facts.audioDiagnostics) {
    const a = facts.audioDiagnostics;
    lines.push(
      `- **Audio:** ${a.defaultDeviceName || 'Default Output'} — ${a.defaultSampleRateHz || 0} Hz / ${a.defaultBitDepth || 0}-bit | Engine Status: \`${a.engineStatus}\` | Windows Audio Service: \`${a.audioServiceRunning ? 'RUNNING' : 'STOPPED'}\``
    );
  }
  lines.push('');

  // 7. Suggested Optimizations
  if (recommendations.length > 0) {
    lines.push('## 6. Recommended Optimizations');
    lines.push('');
    for (const r of recommendations) {
      lines.push(`- **${r.title}** (\`${r.category}\` - Risk: \`${r.risk}\`)`);
      lines.push(`  - *Reason:* ${r.reason}`);
      lines.push(`  - *Expected Benefit:* ${r.expectedBenefit}`);
    }
    lines.push('');
  }

  // 8. Footer & Privacy
  lines.push('---');
  lines.push(
    `*Report generated locally by PC Tracker v3.1.0 under Local-First & Zero-Telemetry architecture.*`
  );

  return lines.join('\n');
}

/**
 * Prepara il payload completo per l'esportazione e il salvataggio su file.
 */
export function exportCareHealthReportToFile(
  report: SystemHealthReport,
  facts: SystemFactsInput,
  recommendations: OptimizationRecommendation[] = [],
  format: 'markdown' | 'json' = 'markdown',
  locale: SupportedLocale = 'it'
): CareReportExportPayload {
  const dateIso = (report.evaluatedAt || new Date().toISOString()).slice(0, 10);
  if (format === 'json') {
    return {
      filename: `pc-care-health-report-${dateIso}.json`,
      content: generateCareHealthReportJson(report, facts, recommendations),
      mimeType: 'application/json',
      format: 'json',
    };
  }

  return {
    filename: `pc-care-health-report-${dateIso}.md`,
    content: generateCareHealthReportMarkdown(report, facts, recommendations, locale),
    mimeType: 'text/markdown',
    format: 'markdown',
  };
}

/**
 * Salva e scarica direttamente il report di salute nel browser dell'utente.
 */
export function downloadCareHealthReport(
  report: SystemHealthReport,
  facts: SystemFactsInput,
  recommendations: OptimizationRecommendation[] = [],
  format: 'markdown' | 'json' = 'markdown',
  locale: SupportedLocale = 'it'
): CareReportExportPayload {
  const payload = exportCareHealthReportToFile(report, facts, recommendations, format, locale);
  downloadFile(payload.filename, payload.content, payload.mimeType);
  return payload;
}

