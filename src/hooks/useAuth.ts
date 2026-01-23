import { useState, useEffect, useCallback } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEncryption } from './useEncryption';

const TOKEN_STORAGE_KEY = 'privacy_chat_token';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { generateKeys, clearKeys } = useEncryption();

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);

  // Load token on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      setToken(stored);
    }
    setIsLoading(false);
  }, []);

  // Store token
  const saveToken = useCallback((newToken: string) => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
  }, []);

  // Clear token
  const removeToken = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  // Register
  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      // Generate encryption keys
      const keyPair = generateKeys();

      try {
        const result = await registerMutation({
          email,
          password,
          displayName,
          publicKey: keyPair.publicKey,
        });

        saveToken(result.token);
        return { success: true };
      } catch (error: any) {
        clearKeys();
        return { success: false, error: error.message };
      }
    },
    [registerMutation, generateKeys, clearKeys, saveToken]
  );

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginMutation({ email, password });

        // Generate keys for this session
        generateKeys();

        saveToken(result.token);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    [loginMutation, generateKeys, saveToken]
  );

  // Logout
  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        // Ignore errors on logout
      }
    }
    clearKeys();
    removeToken();
  }, [token, logoutMutation, clearKeys, removeToken]);

  return {
    token,
    isLoading,
    isAuthenticated: token !== null,
    register,
    login,
    logout,
  };
}
