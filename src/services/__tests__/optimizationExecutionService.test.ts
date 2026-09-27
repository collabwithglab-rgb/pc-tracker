import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeOptimizationWorkflow,
  recordCancelledOptimization,
} from '../optimizationExecutionService';
import {
  OptimizationRecommendation,
  SystemFactsInput,
  CreateOptimizationRecordInput,
  OptimizationExecutionRecord,
} from '../../types';

// Mock windowsToolsService
vi.mock('../windowsToolsService', () => ({
  runSsdTrim: vi.fn(async (letter: string) => ({
    status: 'success',
    tool: 'trim',
    message: `TRIM completato su ${letter}:`,
    timestamp: new Date().toISOString(),
  })),
  emptyRecycleBin: vi.fn(async () => ({
    status: 'success',
    tool: 'recycle_bin',
    message: 'Cestino svuotato',
    timestamp: new Date().toISOString(),
  })),
  queryRecycleBin: vi.fn(async () => ({
    status: 'success',
    tool: 'recycle_bin',
    data: {
      totalSizeBytes: 0,
      itemCount: 0,
    },
    timestamp: new Date().toISOString(),
  })),
  verifySystemFiles: vi.fn(async () => ({
    status: 'success',
    tool: 'sfc',
    message: 'File protetti ripristinati con successo.',
    timestamp: new Date().toISOString(),
  })),
  cleanGpuShaderCache: vi.fn(async () => ({
    status: 'success',
    tool: 'shader_cache',
    message: '350 MB rimossi',
    timestamp: new Date().toISOString(),
  })),
  enableUltimatePerformance: vi.fn(async () => ({
    status: 'success',
    tool: 'power_scheme',
    message: 'Attivato',
    timestamp: new Date().toISOString(),
  })),
  cleanComponentStore: vi.fn(async () => ({
    status: 'success',
    tool: 'dism',
    message: 'WinSxS ripulito',
    timestamp: new Date().toISOString(),
  })),
  checkDiskReadonly: vi.fn(async (letter: string) => ({
    status: 'success',
    tool: 'chkdsk',
    message: `Volume ${letter}: integro`,
    timestamp: new Date().toISOString(),
  })),
  openDiskCleanup: vi.fn(async () => ({
    status: 'success',
    tool: 'cleanmgr',
    message: 'Avviato',
    timestamp: new Date().toISOString(),
  })),
  createRestorePoint: vi.fn(async () => ({
    status: 'success',
    tool: 'restore_point',
    message: 'Punto creato',
    timestamp: new Date().toISOString(),
  })),
}));

describe('optimizationExecutionService - Full Action Lifecycle', () => {
  let recordedInputs: CreateOptimizationRecordInput[] = [];

  const mockRecordExecution = async (input: CreateOptimizationRecordInput): Promise<OptimizationExecutionRecord> => {
    recordedInputs.push(input);
    return {
      ...input,
      id: 'mock-rec-id',
      timestampCompleted: input.timestampCompleted || new Date().toISOString(),
      schemaVersion: 1,
    };
  };

  const sampleFacts: SystemFactsInput = {
    recycleBin: {
      totalSizeBytes: 5242880000, // ~5.24 GB
      itemCount: 142,
    },
    drives: [
      {
        driveLetter: 'C',
        label: 'System',
        fileSystem: 'NTFS',
        totalBytes: 1000000000000,
        freeBytes: 400000000000,
        isSSD: true,
        mediaType: 'SSD',
        trimSupported: true,
      },
    ],
  };

  beforeEach(() => {
    recordedInputs = [];
    vi.clearAllMocks();
  });

  it('esegue il ciclo completo per svuota cestino con verifica quantitativa e calcolo delta', async () => {
    const rec: OptimizationRecommendation = {
      id: 'rec-recycle-bin',
      title: 'Svuota Cestino di Windows',
      category: 'storage',
      reason: 'Cestino superiore alla soglia',
      evidence: '5.24 GB occupati',
      expectedBenefit: 'Recupero immediato di 5.24 GB di spazio',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'USER_CONFIRMED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'empty-recycle-bin',
      actionDescription: 'Svuotamento programmatico del cestino',
      verificationMethod: 'Interrogazione API Windows per dimensione residua',
    };

    const res = await executeOptimizationWorkflow({
      recommendation: rec,
      facts: sampleFacts,
      recordExecution: mockRecordExecution,
    });

    expect(res.notification.type).toBe('success');
    expect(recordedInputs).toHaveLength(1);

    const record = recordedInputs[0];
    expect(record.recommendationId).toBe('rec-recycle-bin');
    expect(record.outcome).toBe('success');
    expect(record.verificationType).toBe('quantitative');
    expect(record.verificationStatus).toBe('verified');
    expect(record.metricsDelta?.numericChange).toBe(5242880000);
    expect(record.metricsDelta?.description).toContain('Liberati');
  });

  it('esegue il ciclo completo per TRIM con verifica di stato', async () => {
    const rec: OptimizationRecommendation = {
      id: 'rec-trim-C',
      title: 'Esegui Ottimizzazione TRIM (C:)',
      category: 'storage',
      reason: 'Nessun TRIM registrato',
      evidence: 'Ultimo TRIM: mai',
      expectedBenefit: 'Mantenimento prestazioni scrittura SSD',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ONE_CLICK',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'run-trim',
      actionDescription: 'Invio comando defrag /O /V a unità C:',
      verificationMethod: 'Conferma esecuzione da sottosistema defrag',
      parameters: { driveLetter: 'C' },
    };

    const res = await executeOptimizationWorkflow({
      recommendation: rec,
      facts: sampleFacts,
      recordExecution: mockRecordExecution,
    });

    expect(res.notification.type).toBe('success');
    expect(recordedInputs).toHaveLength(1);

    const record = recordedInputs[0];
    expect(record.recommendationId).toBe('rec-trim-C');
    expect(record.outcome).toBe('success');
    expect(record.verificationType).toBe('state_based');
    expect(record.verificationStatus).toBe('verified');
    expect(record.evidenceAfter).toContain('Comando TRIM eseguito');
  });

  it('registra correttamente un annullamento esplicito da parte dell\'utente', async () => {
    const rec: OptimizationRecommendation = {
      id: 'rec-recycle-bin',
      title: 'Svuota Cestino di Windows',
      category: 'storage',
      reason: 'Cestino superiore alla soglia',
      evidence: '5.24 GB occupati',
      expectedBenefit: 'Recupero spazio',
      risk: 'LOW',
      confidence: 'HIGH',
      actionAvailability: 'USER_CONFIRMED',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'empty-recycle-bin',
    };

    const record = await recordCancelledOptimization(
      rec,
      'Operazione annullata dall\'utente al prompt di conferma',
      mockRecordExecution
    );

    expect(record.outcome).toBe('cancelled');
    expect(record.cancellationReason).toBe('Operazione annullata dall\'utente al prompt di conferma');
    expect(record.verificationStatus).toBe('not_applicable');
  });

  it('gestisce e registra gli errori imprevisti con outcome = failed', async () => {
    const { runSsdTrim } = await import('../windowsToolsService');
    vi.mocked(runSsdTrim).mockRejectedValueOnce(new Error('Device I/O Error'));

    const rec: OptimizationRecommendation = {
      id: 'rec-trim-fail',
      title: 'TRIM SSD con Errore',
      category: 'storage',
      reason: 'Test',
      evidence: 'Test',
      expectedBenefit: 'Test',
      risk: 'NONE',
      confidence: 'HIGH',
      actionAvailability: 'ONE_CLICK',
      rollbackAvailability: 'NOT_APPLICABLE',
      actionId: 'run-trim',
      parameters: { driveLetter: 'D' },
    };

    const res = await executeOptimizationWorkflow({
      recommendation: rec,
      facts: sampleFacts,
      recordExecution: mockRecordExecution,
    });

    expect(res.notification.type).toBe('error');
    expect(recordedInputs).toHaveLength(1);

    const record = recordedInputs[0];
    expect(record.outcome).toBe('failed');
    expect(record.errorMessage).toContain('Device I/O Error');
    expect(record.verificationStatus).toBe('failed');
  });
});
