import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatLayout } from './components/chat/ChatLayout';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'preact/hooks';
import { initCrypto } from './lib/crypto';

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

  // Loading crypto
  if (!cryptoReady) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-dark-50">
        <div class="text-center">
          <span class="i-carbon-locked text-4xl text-primary-600 mb-4 block animate-pulse" />
          <div class="text-dark-500">Initializing encryption...</div>
        </div>
      </div>
    );
  }

  // Loading auth state
  if (authLoading) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-dark-50">
        <div class="text-dark-500">Loading...</div>
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
      <div class="min-h-screen flex items-center justify-center bg-dark-50">
        <span class="i-carbon-circle-dash animate-spin text-3xl text-primary-600" />
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
