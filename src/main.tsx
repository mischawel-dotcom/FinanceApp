/// <reference types="vite/client" />
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/AppRouter';
import { useAppStore } from './app/store/useAppStore';
import './index.css';

console.log("[ENV_CHECK] VITE_DEBUG =", import.meta.env.VITE_DEBUG);

function App() {
  const { initializeSeedData } = useAppStore();

  useEffect(() => {
    initializeSeedData();
  }, [initializeSeedData]);

  return <AppRouter />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service Worker Registrierung (nur Production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('Service Worker registered:', registration);
      },
      (error) => {
        console.error('Service Worker registration failed:', error);
      }
    );
  });
}
