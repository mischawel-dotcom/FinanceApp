import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/AppRouter';
import { useAppStore } from './app/store/useAppStore';
import './index.css';

function App() {
  const { initializeSeedData, loadData } = useAppStore();

  useEffect(() => {
    const init = async () => {
      await initializeSeedData();
      await loadData();
    };
    init();
  }, [initializeSeedData, loadData]);

  return <AppRouter />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
