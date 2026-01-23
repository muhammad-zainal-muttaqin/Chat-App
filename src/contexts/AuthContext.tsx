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
  const updatePublicKeyMutation = useMutation(api.auth.updatePublicKey);

  // Load token and keys on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
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
        // Generate encryption keys
        const newKeyPair = generateKeyPair();

        const result = await registerMutation({
          email,
          password,
          displayName,
          publicKey: newKeyPair.publicKey,
        });

        // Store token and keys
        sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        storeKeyPair(newKeyPair);

        setToken(result.token);
        setKeyPair(newKeyPair);

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message || 'Registration failed' };
      }
    },
    [registerMutation]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginMutation({ email, password });

        // Load existing keys or generate new ones
        let currentKeyPair = loadKeyPair();
        if (!currentKeyPair) {
          // Generate new keys if none exist
          currentKeyPair = generateKeyPair();
          storeKeyPair(currentKeyPair);

          // IMPORTANT: Update public key in database to match new keys
          await updatePublicKeyMutation({
            token: result.token,
            publicKey: currentKeyPair.publicKey,
          });
        }

        // Store token
        sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token);

        setToken(result.token);
        setKeyPair(currentKeyPair);

        return { success: true };
      } catch (error: any) {
        console.error('Login error:', error);
        return { success: false, error: error.message || 'Login gagal. Periksa email dan password Anda.' };
      }
    },
    [loginMutation, updatePublicKeyMutation]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        // Ignore errors on logout
      }
    }

    // Clear storage
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    clearKeyPair();

    setToken(null);
    setKeyPair(null);
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
