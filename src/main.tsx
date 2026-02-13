/// <reference types="vite/client" />
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/AppRouter';
import { useAppStore } from './app/store/useAppStore';
import './index.css';



function App() {


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
        // ...removed debug log...
      },
      (error) => {
        // ...kept error log for real error handling...
        console.error('Service Worker registration failed:', error);
      }
    );
  });
}
