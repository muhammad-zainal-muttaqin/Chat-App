import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatLayout } from './components/chat/ChatLayout';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'preact/hooks';
import { initCrypto } from './lib/crypto';
import { usePresence } from './hooks/usePresence';

export function App() {
  const [cryptoReady, setCryptoReady] = useState(false);
  const { token, deviceId, isLoading: authLoading, isAuthenticated } = useAuth();

  // Initialize crypto
  useEffect(() => {
    initCrypto().then(() => setCryptoReady(true));
  }, []);

  // Query user only when authenticated (include deviceId for session hijacking protection)
  const user = useQuery(
    api.users.getMe,
    isAuthenticated && token && deviceId ? { token, deviceId } : 'skip'
  );

  // Start presence heartbeat when authenticated
  usePresence(isAuthenticated && token && deviceId ? token : null, deviceId);

  // Loading crypto
  if (!cryptoReady) {
    return (
      <div class="min-h-screen flex items-center justify-center app-shell-bg">
        <div class="text-center animate-fade-in">
          <div class="w-14 h-14 rounded-2xl bg-primary-600 flex-center mx-auto mb-5 shadow-sm">
            <span class="i-carbon-locked text-white text-2xl" />
          </div>
          <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400 animate-breathe">
            Initializing Security
          </div>
        </div>
      </div>
    );
  }

  // Loading auth state
  if (authLoading) {
    return (
      <div class="min-h-screen flex items-center justify-center app-shell-bg">
        <div class="flex flex-col items-center gap-4">
          <div class="w-8 h-8 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
          <div class="text-[10px] font-medium uppercase tracking-widest text-dark-400 dark:text-dark-500">
            Verifying session...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Loading user data
  if (user === undefined) {
    return (
      <div class="min-h-screen flex items-center justify-center app-shell-bg">
        <div class="flex flex-col items-center gap-4">
          <div class="w-8 h-8 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
          <div class="text-[10px] font-medium uppercase tracking-widest text-dark-400 dark:text-dark-500">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  // User not found (session invalid)
  if (user === null) {
    return <AuthScreen />;
  }

  // Authenticated
  return <ChatLayout user={user} />;
}
