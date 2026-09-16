import { describe, it, expect } from 'vitest';
import {
  validateComponent,
  validatePurchaseEvent,
  validateEvent,
} from '../validators';
import { generateId } from '../../utils/id';
import { Component, ComponentEvent, PurchaseEvent } from '../../types';

describe('Fase 2: Validazione Componente e Generazione ID', () => {
  it('genera ID stabili in formato UUID valido', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    // Verifica formato UUID (36 caratteri, 4 trattini)
    expect(id1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('accetta un componente con dati validi', () => {
    const validData: Partial<Component> = {
      name: 'GeForce RTX 4090',
      brand: 'Gigabyte',
      model: 'Gaming OC',
      category: 'gpu',
    };

    const result = validateComponent(validData);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('rifiuta un componente privo di nome o con nome troppo corto', () => {
    const missingName = validateComponent({ category: 'gpu' });
    expect(missingName.isValid).toBe(false);
    expect(missingName.errors.name).toBeDefined();

    const shortName = validateComponent({ name: 'A', category: 'gpu' });
    expect(shortName.isValid).toBe(false);
    expect(shortName.errors.name).toBeDefined();
  });

  it('rifiuta una categoria non valida', () => {
    const invalidCat = validateComponent({
      name: 'Test Component',
      // @ts-expect-error test di valore non valido
      category: 'astronave',
    });
    expect(invalidCat.isValid).toBe(false);
    expect(invalidCat.errors.category).toBeDefined();
  });
});

describe('Fase 2: Validazione Evento di Acquisto Iniziale', () => {
  it('accetta un evento di acquisto valido', () => {
    const purchase: Partial<PurchaseEvent> = {
      price: 1500,
      date: '2024-05-10',
      store: 'Amazon',
    };

    const result = validatePurchaseEvent(purchase);
    expect(result.isValid).toBe(true);
  });

  it('rifiuta un prezzo di acquisto negativo', () => {
    const negativePrice: Partial<PurchaseEvent> = {
      price: -50,
      date: '2024-05-10',
    };

    const result = validatePurchaseEvent(negativePrice);
    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe('Il prezzo di acquisto non può essere negativo.');
  });

  it('rifiuta una data di acquisto malformata o vuota', () => {
    const emptyDate = validatePurchaseEvent({ price: 100, date: '' });
    expect(emptyDate.isValid).toBe(false);
    expect(emptyDate.errors.date).toBeDefined();

    const invalidDate = validatePurchaseEvent({ price: 100, date: 'non-una-data' });
    expect(invalidDate.isValid).toBe(false);
    expect(invalidDate.errors.date).toBeDefined();
  });
});

describe('Fase 2: Integrità Referenziale e Cancellazione a Cascata', () => {
  it('rifiuta un evento collegato a un componentId inesistente', () => {
    const existingComponentIds = new Set(['comp-1', 'comp-2']);

    const orphanEvent: Partial<ComponentEvent> = {
      componentId: 'comp-inesistente',
      date: '2024-05-10',
      type: 'INSTALL',
    };

    const result = validateEvent(orphanEvent, existingComponentIds);
    expect(result.isValid).toBe(false);
    expect(result.errors.componentId).toContain('Integrità referenziale violata');
  });

  it('accetta un evento collegato a un componentId esistente', () => {
    const existingComponentIds = new Set(['comp-1', 'comp-2']);

    const validEvent: Partial<ComponentEvent> = {
      componentId: 'comp-1',
      date: '2024-05-10',
      type: 'INSTALL',
    };

    const result = validateEvent(validEvent, existingComponentIds);
    expect(result.isValid).toBe(true);
  });

  it('simula la rimozione a cascata degli eventi quando un componente viene eliminato', () => {
    const components = [
      { id: 'c1', name: 'Componente 1' },
      { id: 'c2', name: 'Componente 2' },
    ];

    const events: ComponentEvent[] = [
      { id: 'e1', componentId: 'c1', date: '2024-01-01', type: 'PURCHASE', price: 100, createdAt: '' },
      { id: 'e2', componentId: 'c1', date: '2024-01-02', type: 'INSTALL', createdAt: '' },
      { id: 'e3', componentId: 'c2', date: '2024-02-01', type: 'PURCHASE', price: 200, createdAt: '' },
    ];

    const componentToDelete = 'c1';

    // Logica di cancellazione a cascata
    const updatedComponents = components.filter((c) => c.id !== componentToDelete);
    const updatedEvents = events.filter((e) => e.componentId !== componentToDelete);

    expect(updatedComponents).toHaveLength(1);
    expect(updatedComponents[0].id).toBe('c2');

    // Tutti gli eventi di c1 devono essere scomparsi
    expect(updatedEvents).toHaveLength(1);
    expect(updatedEvents[0].id).toBe('e3');
    expect(updatedEvents.some((e) => e.componentId === 'c1')).toBe(false);
  });
});
