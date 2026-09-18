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
