/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/AppRouter';
import './index.css';



function App() {


  return <AppRouter />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'service-worker.js').catch(
      (error) => console.error('Service Worker registration failed:', error)
    );
  });
}

if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}
