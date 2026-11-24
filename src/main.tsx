import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { FirebaseProvider } from './contexts/FirebaseContext.tsx';
import { isCapacitorNative } from './utils/apiClient';
import './index.css';

if (typeof window !== 'undefined' && !isCapacitorNative()) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('AI VIDEO MAKER PRO is ready for offline studio use.');
    },
    onRegisterError(error) {
      console.warn('Service worker registration skipped or failed:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  </ErrorBoundary>
);
