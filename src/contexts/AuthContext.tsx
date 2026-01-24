import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  generateKeyPair,
  storeKeyPair,
  loadKeyPair,
  clearKeyPair,
  KeyPair,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
} from '../lib/crypto';

interface AuthContextType {
  token: string | null;
  keyPair: KeyPair | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_STORAGE_KEY = 'privacy_chat_token';

export function AuthProvider({ children }: { children: preact.ComponentChildren }) {
  const [token, setToken] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);
  const syncKeysMutation = useMutation(api.auth.updatePublicKey);

  // Load token and keys on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedKeyPair = loadKeyPair();

    if (storedToken) {
      setToken(storedToken);
    }
    if (storedKeyPair) {
      setKeyPair(storedKeyPair);
    }

    setIsLoading(false);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      try {
        // Generate encryption keys first
        const newKeyPair = generateKeyPair();

        // Encrypt private key with password
        const encryptedPrivateKey = await encryptPrivateKeyWithPassword(newKeyPair.privateKey, password);

        const result = await registerMutation({
          email,
          password,
          displayName,
          publicKey: newKeyPair.publicKey,
          encryptedPrivateKey,
        });

        // Store token and keys
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        storeKeyPair(newKeyPair);

        setToken(result.token);
        setKeyPair(newKeyPair);

        return { success: true };
      } catch (error: unknown) {
        console.error('Registration error:', error);
        const message = error instanceof Error ? error.message : 'Registrasi gagal. Silakan coba lagi.';
        return { success: false, error: message };
      }
    },
    [registerMutation]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginMutation({ email, password });

        // Load existing keys - type the response properly
        const authResponse = result as {
          userId: string;
          token: string;
          encryptedPrivateKey?: string;
          publicKey?: string;
        };
        let currentKeyPair: KeyPair | null = null;

        // 1. Try to restore keys from server (Preferred)
        if (authResponse.encryptedPrivateKey && authResponse.publicKey) {
          try {
            console.log('Restoring encryption keys from server...');
            const privateKey = await decryptPrivateKeyWithPassword(
              authResponse.encryptedPrivateKey,
              password
            );
            currentKeyPair = {
              publicKey: authResponse.publicKey,
              privateKey,
            };
            storeKeyPair(currentKeyPair);
          } catch (e) {
            console.error('Failed to restore keys from server:', e);
          }
        }

        // 2. If valid keys not found from server, check local storage
        if (!currentKeyPair) {
          currentKeyPair = loadKeyPair();
        }

        // 3. If no keys exist (new device and no backup), generate new ones automatically
        // NOTE: This means old messages will be unreadable, but allows immediate use on new devices
        if (!currentKeyPair) {
          console.warn('Generating new encryption keys for new session (old messages will be unreadable)...');
          currentKeyPair = generateKeyPair();
          storeKeyPair(currentKeyPair);
        }

        // 4. Sync keys to server if we have them but server doesn't (or just to be safe)
        if (currentKeyPair) {
          try {
            // Only sync if server didn't return keys OR if we generated new ones
            if (!authResponse.encryptedPrivateKey || !authResponse.publicKey) {
              console.log('Syncing keys to server for future backup...');
              const encryptedPrivateKey = await encryptPrivateKeyWithPassword(currentKeyPair.privateKey, password);
              await syncKeysMutation({
                token: result.token,
                publicKey: currentKeyPair.publicKey,
                encryptedPrivateKey
              });
            }
          } catch (e) {
            console.error("Failed to sync keys:", e);
          }
        }

        // Store token
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);

        setToken(result.token);
        setKeyPair(currentKeyPair);

        return { success: true };
      } catch (error: unknown) {
        console.error('Login error:', error);
        const message = error instanceof Error ? error.message : 'Login gagal. Periksa email dan password Anda.';
        return { success: false, error: message };
      }
    },
    [loginMutation, syncKeysMutation]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
        // Also force delete the session data locally to be sure
      } catch (err) {
        console.error('Logout failed on server:', err);
      }
    }

    // Clear storage immediately
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    clearKeyPair();

    setToken(null);
    setKeyPair(null);
    
    // Force reload to clear any in-memory states (like Convex query subscriptions)
    window.location.reload();
  }, [token, logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        token,
        keyPair,
        isLoading,
        isAuthenticated: token !== null,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
