export type ToolExecutionStatus =
  | 'success'
  | 'warning'
  | 'failed'
  | 'cancelled'
  | 'not_supported'
  | 'requires_elevation';

export interface WindowsToolResult<T = unknown> {
  status: ToolExecutionStatus;
  message: string;
  details?: string;
  data?: T;
  durationMs: number;
  requiresElevation: boolean;
}

export interface VolumeDriveInfo {
  driveLetter: string;     // es. "C" o "C:"
  label: string;           // es. "Windows NVMe" o ""
  fileSystem: string;      // es. "NTFS"
  totalBytes: number;
  freeBytes: number;
  isSSD: boolean;          // true se SSD NVMe / SATA
  mediaType: string;       // "SSD" | "HDD" | "Unknown"
  busType?: string;        // "NVMe" | "SATA" | "SCSI" | "USB"
  friendlyName?: string;   // es. "Samsung SSD 990 PRO 2TB"
  healthStatus?: string;   // "Healthy" | "Warning" | "Unhealthy"
  operationalStatus?: string; // "OK" | "Error"
  trimSupported: boolean;
}

export interface RecycleBinInfo {
  itemCount: number;
  totalSizeBytes: number;
}

export interface HibernateStatus {
  enabled: boolean;
  fileSizeGb?: number;
  canToggle: boolean;
  details?: string;
}

export interface TrimConfigStatus {
  enabled: boolean;
  details: string;
}

export interface ScanNowResult {
  scannedAt: string;
  overallStatus: 'healthy' | 'warning' | 'needs_attention';
  drives: VolumeDriveInfo[];
  trimConfiguration: {
    enabled: boolean;
    details: string;
  };
  fileSystemHealth: {
    healthy: boolean;
    drivesChecked: { driveLetter: string; healthStatus: string; operationalStatus: string }[];
    details: string;
  };
  systemFilesStatus: 'clean' | 'corrupted' | 'requires_elevation' | 'skipped' | 'not_tested';
  systemFilesMessage?: string;
  imageHealthStatus: 'clean' | 'corrupted' | 'requires_elevation' | 'skipped' | 'not_tested';
  imageHealthMessage?: string;
  hibernate: HibernateStatus;
  recycleBin: RecycleBinInfo;
  recommendedActions: {
    id: string;
    title: string;
    description: string;
    actionType: 'trim' | 'clean_recycle_bin' | 'open_cleanmgr' | 'sfc_scan' | 'dism_scan' | 'hibernate_toggle';
    driveLetter?: string;
  }[];
}

export interface SecurityAuditData {
  secureBootEnabled: boolean;
  tpmPresent: boolean;
  tpmReady: boolean;
  vbsRunning: boolean;
  hvciRunning: boolean;
  hostsFileClean: boolean;
  hostsCustomEntriesCount: number;
  details: string;
}

export type SmartAvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'permission_required'
  | 'unsupported'
  | 'not_detected'
  | 'error';

export interface DiskSmartHealth {
  deviceId: string;
  friendlyName: string;
  mediaType: string;
  temperatureCelsius?: number;
  wearPercentage?: number;
  readErrorsTotal: number;
  writeErrorsTotal: number;
  powerOnHours?: number;
  healthStatus: string;
  smartStatus?: SmartAvailabilityStatus;
  smartStatusReason?: string;
}

export interface ShaderCacheCleanResult {
  filesRemoved: number;
  bytesFreed: number;
  details: string;
}

export interface WinGetUpdateItem {
  name: string;
  id: string;
  installedVersion: string;
  availableVersion: string;
}

export type StartupScope = 'current_user' | 'local_machine' | 'local_machine_wow64';
export type StartupImpact = 'high' | 'medium' | 'low' | 'none' | 'unknown';

export interface StartupAppItem {
  name: string;
  command: string;
  scope: StartupScope;
  enabled: boolean;
  impact: StartupImpact;
  rawStatusHex?: string | null;
}

export interface StartupAppsSnapshot {
  availability: 'available' | 'unavailable' | 'unsupported' | 'error';
  source: string;
  totalApps: number;
  enabledCount: number;
  disabledCount: number;
  apps: StartupAppItem[];
  errorDetails?: string | null;
}

export type NetworkQualityRating = 'optimal' | 'good' | 'degraded' | 'critical' | 'offline';

export interface NetworkDiagnosticsResult {
  targetHost: string;
  sentPackets: number;
  receivedPackets: number;
  packetLossPercent: number;
  rttMinMs?: number | null;
  rttMaxMs?: number | null;
  rttAvgMs?: number | null;
  jitterMs?: number | null;
  qualityRating: NetworkQualityRating;
  rawSamples: number[];
  status: 'success' | 'warning' | 'error';
  errorDetails?: string | null;
  executionTimeMs: number;
}

export interface WindowsUpdateStatus {
  availability: 'available' | 'unavailable' | 'unsupported' | 'error';
  source: string;
  rebootPending: boolean;
  rebootSources: string[];
  lastCheckTime?: string | null;
  lastInstallTime?: string | null;
  pendingFileRenameCount: number;
  details?: string | null;
}

export type MonitorOrientation = 'landscape' | 'portrait' | 'landscape_flipped' | 'portrait_flipped' | 'unknown';

export interface MonitorResolution {
  width: number;
  height: number;
}

export interface MonitorVirtualBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  id: string;
  monitorName: string;
  adapterName: string;
  currentResolution: MonitorResolution;
  currentRefreshRate: number;
  maxSupportedRefreshRate: number;
  supportedRefreshRates: number[];
  bitsPerPixel: number;
  orientation: MonitorOrientation;
  isPrimary: boolean;
  virtualBounds: MonitorVirtualBounds;
  dpiScalePercent: number;
  isRefreshRateLimited: boolean;
}

export interface DisplayDiagnosticsSnapshot {
  availability: 'available' | 'unavailable' | 'unsupported' | 'error';
  source: string;
  totalMonitors: number;
  monitors: MonitorInfo[];
  hasHighRefreshRateMismatch: boolean;
  hasMixedRefreshRates: boolean;
  errorDetails?: string | null;
}

export type AudioDeviceState = 'active' | 'disabled' | 'unplugged' | 'not_present' | 'unknown';
export type AudioEngineStatus = 'optimal' | 'standard' | 'degraded' | 'issues_detected';

export interface AudioDeviceInfo {
  id: string;
  name: string;
  isDefault: boolean;
  state: AudioDeviceState;
  sampleRateHz?: number | null;
  bitDepth?: number | null;
  channels?: number | null;
  driverName?: string | null;
}

export interface AudioDiagnosticsSnapshot {
  availability: 'available' | 'unavailable' | 'unsupported' | 'error';
  source: string;
  defaultDeviceName?: string | null;
  defaultSampleRateHz?: number | null;
  defaultBitDepth?: number | null;
  defaultChannels?: number | null;
  devices: AudioDeviceInfo[];
  audioServiceRunning: boolean;
  audioEndpointBuilderRunning: boolean;
  engineStatus: AudioEngineStatus;
  glitchOrIssueDetected: boolean;
  issueSummary?: string | null;
  errorDetails?: string | null;
}

