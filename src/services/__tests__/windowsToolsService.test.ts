import { describe, it, expect } from 'vitest';
import {
  scanStorageVolumes,
  queryTrimConfiguration,
  runSsdTrim,
  queryRecycleBin,
  emptyRecycleBin,
  getHibernateStatus,
  setHibernateEnabled,
  openDiskCleanup,
  verifySystemFiles,
  checkDiskReadonly,
  executeDiagnosticScanNow,
} from '../windowsToolsService';

describe('windowsToolsService', () => {
  it('esegue la scansione dei volumi (fallback web)', async () => {
    const res = await scanStorageVolumes();
    expect(res.status).toBe('success');
    expect(res.data).toBeDefined();
    expect(res.data!.length).toBeGreaterThan(0);
    expect(res.data![0].driveLetter).toBe('C:');
  });

  it('interroga lo stato della configurazione TRIM', async () => {
    const res = await queryTrimConfiguration();
    expect(res.status).toBe('success');
    expect(res.data).toBeDefined();
    expect(res.data!.enabled).toBe(true);
  });

  it('esegue il TRIM su unità SSD (modalità web)', async () => {
    const res = await runSsdTrim('C:');
    expect(res.status).toBe('success');
    expect(res.requiresElevation).toBe(true);
    expect(res.message).toContain('C:');
  });

  it('interroga e svuota il Cestino', async () => {
    const queryRes = await queryRecycleBin();
    expect(queryRes.status).toBe('success');
    expect(queryRes.data?.itemCount).toBeDefined();

    const emptyRes = await emptyRecycleBin();
    expect(emptyRes.status).toBe('success');
  });

  it('interroga e commuta lo stato di ibernazione', async () => {
    const statusRes = await getHibernateStatus();
    expect(statusRes.status).toBe('success');
    expect(statusRes.data).toBeDefined();

    const toggleRes = await setHibernateEnabled(true);
    expect(toggleRes.status).toBe('success');
    expect(toggleRes.requiresElevation).toBe(true);
  });

  it('avvia la pulizia disco di Windows senza millantare dati quantitativi', async () => {
    const res = await openDiskCleanup();
    expect(res.status).toBe('success');
    expect(res.message).toContain('Pulizia disco di Windows avviato');
  });

  it('esegue la verifica non distruttiva dei file di sistema e file system', async () => {
    const sfcRes = await verifySystemFiles();
    expect(sfcRes.status).toBe('success');
    expect(sfcRes.requiresElevation).toBe(true);

    const chkdskRes = await checkDiskReadonly('C:');
    expect(chkdskRes.status).toBe('success');
    expect(chkdskRes.requiresElevation).toBe(true);
  });

  it('esegue la diagnosi complessiva non distruttiva Scan Now', async () => {
    const scan = await executeDiagnosticScanNow();
    expect(scan.scannedAt).toBeDefined();
    expect(scan.overallStatus).toBe('healthy');
    expect(scan.drives).toHaveLength(2);
    expect(scan.trimConfiguration.enabled).toBe(true);
    expect(scan.fileSystemHealth.healthy).toBe(true);
    expect(scan.recommendedActions.length).toBeGreaterThan(0);
  });
});
