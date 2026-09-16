import React from 'react';
import { PCProvider } from './store';
import { AppShell } from './components/layout/AppShell';
import './styles/global.css';
import './styles/components.css';

export const App: React.FC = () => {
  return (
    <PCProvider>
      <AppShell />
    </PCProvider>
  );
};
