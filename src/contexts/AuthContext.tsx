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
  getOrCreateDeviceId,
} from '../lib/crypto';

// Login result with possible warnings
interface LoginResult {
  success: boolean;
  error?: string;
  warning?: 'new_keys_generated'; // Warning when new keys had to be generated (old messages unreadable)
}

interface AuthContextType {
  token: string | null;
  keyPair: KeyPair | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string, forceGenerateNewKeys?: boolean) => Promise<LoginResult>;
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

        // Get or create device ID for session binding (prevents session hijacking)
        const deviceId = getOrCreateDeviceId();

        const result = await registerMutation({
          email,
          password,
          displayName,
          publicKey: newKeyPair.publicKey,
          encryptedPrivateKey,
          deviceId,
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
    async (email: string, password: string, forceGenerateNewKeys?: boolean): Promise<LoginResult> => {
      try {
        // Get or create device ID for session binding (prevents session hijacking)
        const deviceId = getOrCreateDeviceId();

        const result = await loginMutation({ email, password, deviceId });

        // Type the response properly
        const authResponse = result as {
          userId: string;
          token: string;
          encryptedPrivateKey?: string;
          publicKey?: string;
        };
        let currentKeyPair: KeyPair | null = null;
        let warning: 'new_keys_generated' | undefined;

        // STEP 1: Server has keys - try to restore (SERVER IS SOURCE OF TRUTH)
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
            // IMPORTANT: Overwrite localStorage with server keys (server is source of truth)
            storeKeyPair(currentKeyPair);
            console.log('Keys restored from server successfully');
          } catch (e) {
            console.error('Failed to decrypt keys from server:', e);

            // If user explicitly requested new keys, generate them
            if (forceGenerateNewKeys) {
              console.warn('User requested new key generation - old messages will be unreadable');
              currentKeyPair = generateKeyPair();
              storeKeyPair(currentKeyPair);
              warning = 'new_keys_generated';

              // Backup new keys to server
              try {
                const encryptedPrivateKey = await encryptPrivateKeyWithPassword(currentKeyPair.privateKey, password);
                await syncKeysMutation({
                  token: result.token,
                  publicKey: currentKeyPair.publicKey,
                  encryptedPrivateKey
                });
              } catch (syncError) {
                console.error('Failed to backup new keys:', syncError);
              }
            } else {
              // SECURITY: Do NOT fall back to localStorage - it may belong to different account
              // Do NOT generate new keys automatically - user must explicitly choose
              // Return error so UI can prompt user to retry password or generate new keys
              return {
                success: false,
                error: 'ERR_KEY_DECRYPT_FAILED',
              };
            }
          }
        }

        // STEP 2: Server has NO keys (new user or keys were never backed up)
        if (!currentKeyPair && !authResponse.encryptedPrivateKey) {
          // Check localStorage as potential recovery (only if server has no keys)
          const localKeys = loadKeyPair();

          if (localKeys) {
            console.log('Using keys from localStorage (server had no backup)');
            currentKeyPair = localKeys;

            // Backup to server for future logins
            try {
              console.log('Backing up local keys to server...');
              const encryptedPrivateKey = await encryptPrivateKeyWithPassword(
                currentKeyPair.privateKey,
                password
              );
              await syncKeysMutation({
                token: result.token,
                publicKey: currentKeyPair.publicKey,
                encryptedPrivateKey
              });
            } catch (e) {
              console.error('Failed to backup keys to server:', e);
            }
          } else {
            // No keys anywhere - generate new ones with WARNING
            console.warn('No encryption keys found anywhere - generating new keys');
            currentKeyPair = generateKeyPair();
            storeKeyPair(currentKeyPair);
            warning = 'new_keys_generated';

            // Backup new keys to server
            try {
              const encryptedPrivateKey = await encryptPrivateKeyWithPassword(
                currentKeyPair.privateKey,
                password
              );
              await syncKeysMutation({
                token: result.token,
                publicKey: currentKeyPair.publicKey,
                encryptedPrivateKey
              });
            } catch (e) {
              console.error('Failed to backup new keys:', e);
            }
          }
        }

        // Store token and finalize
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        setToken(result.token);
        setKeyPair(currentKeyPair);

        return { success: true, warning };
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
      } catch {
        // Ignore errors on logout
      }
    }

    // Clear storage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
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
