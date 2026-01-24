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
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();

  // Initialize crypto
  useEffect(() => {
    initCrypto().then(() => setCryptoReady(true));
  }, []);

  // Query user only when authenticated
  const user = useQuery(
    api.users.getMe,
    isAuthenticated && token ? { token } : 'skip'
  );

  // Start presence heartbeat when authenticated
  usePresence(isAuthenticated && token ? token : null);

  // Loading crypto
  if (!cryptoReady) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-white dark:bg-dark-950">
        <div class="text-center animate-fade-in">
          <div class="relative w-20 h-20 mx-auto mb-6">
            <div class="absolute inset-0 rounded-[2rem] bg-primary-500/10 blur-xl animate-pulse" />
            <div class="relative w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary-500 to-primary-700 flex-center shadow-lg shadow-primary-500/20">
              <span class="i-carbon-locked text-white text-3xl" />
            </div>
          </div>
          <div class="text-[11px] font-black uppercase tracking-[0.2em] text-primary-500">Initializing Security</div>
        </div>
      </div>
    );
  }

  // Loading auth state
  if (authLoading) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-white dark:bg-dark-950">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
          <div class="text-[10px] font-bold uppercase tracking-widest text-dark-400">Verifying session...</div>
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
      <div class="min-h-screen flex items-center justify-center bg-white dark:bg-dark-950">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
          <div class="text-[10px] font-bold uppercase tracking-widest text-dark-400">Loading Profile...</div>
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
