import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useAuthStore } from './store/authStore';
import './index.css';

// OS Eviction Defense: Request persistent storage to protect PGLite IndexedDB
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (err) {
      console.error('[Storage] Failed to request persistence:', err);
    }
  }
}
requestPersistentStorage();

function App() {
  const auth = useAuthStore();
  
  // Initialize Supabase session on boot
  useEffect(() => {
    auth.initialize();
  }, []);

  // Block the Router from booting until Supabase has checked local storage
  if (!auth.isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171f30] text-emerald-500 font-mono text-sm tracking-widest uppercase">
        Initializing Offline Vault...
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
