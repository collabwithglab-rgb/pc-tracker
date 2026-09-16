import { DatabaseSchema } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;

export type MigrationFunction = (data: Record<string, unknown>) => DatabaseSchema;

/**
 * Registro delle migrazioni future.
 * Se lo schemaVersion cresce oltre 1, qui vengono definite le funzioni di upgrade automatico.
 */
export const MIGRATIONS: Record<number, MigrationFunction> = {};

/**
 * Applica le migrazioni sequenziali a un dump importato se necessario.
 */
export function migrateDatabase(importedData: Record<string, unknown>): DatabaseSchema {
  const version = typeof importedData.schemaVersion === 'number' ? importedData.schemaVersion : 1;

  if (version === CURRENT_SCHEMA_VERSION) {
    return importedData as unknown as DatabaseSchema;
  }

  let currentData = { ...importedData };
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v + 1];
    if (migration) {
      currentData = migration(currentData) as unknown as Record<string, unknown>;
    }
  }

  return currentData as unknown as DatabaseSchema;
}
