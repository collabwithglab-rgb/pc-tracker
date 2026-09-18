import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary Unit Tests', () => {
  it('aggiorna lo stato tramite getDerivedStateFromError quando si verifica un errore', () => {
    const testError = new Error('Test crash in render');
    const newState = ErrorBoundary.getDerivedStateFromError(testError);

    expect(newState.hasError).toBe(true);
    expect(newState.error).toBe(testError);
  });

  it('componentDidCatch registra l’errore diagnostico in console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boundary = new ErrorBoundary({ children: null });

    const error = new Error('Errore critico di dominio');
    const errorInfo = { componentStack: '\n    in FaultyComponent\n    in PCProvider' };

    boundary.componentDidCatch(error, errorInfo);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PC Tracker ErrorBoundary]'),
      error,
      errorInfo
    );

    consoleSpy.mockRestore();
  });

  it('handleReset invoca onReset se fornito nelle props', () => {
    const onResetMock = vi.fn();
    const boundary = new ErrorBoundary({ children: null, onReset: onResetMock });

    boundary.handleReset();

    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it('render restituisce i children quando non ci sono errori', () => {
    const childElement = React.createElement('div', { id: 'child' }, 'Contenuto Normale');
    const boundary = new ErrorBoundary({ children: childElement });

    const rendered = boundary.render();
    expect(rendered).toBe(childElement);
  });

  it('render restituisce la UI di fallback quando hasError è true', () => {
    const childElement = React.createElement('div', { id: 'child' }, 'Contenuto Normale');
    const boundary = new ErrorBoundary({
      children: childElement,
      fallbackTitle: 'Errore Personalizzato',
    });

    // Imposta stato di errore
    boundary.state = {
      hasError: true,
      error: new Error('Simulazione crash rendering'),
      errorInfo: null,
      showDetails: false,
    };

    const rendered = boundary.render() as React.ReactElement;
    expect(rendered).not.toBe(childElement);
    expect(rendered.props['role']).toBe('alert');
  });
});
