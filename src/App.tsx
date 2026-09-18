import React from 'react';
import { PCProvider } from './store';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/global.css';
import './styles/components.css';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <PCProvider>
        <AppShell />
      </PCProvider>
    </ErrorBoundary>
  );
};
