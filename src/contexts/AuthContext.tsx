import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  generateKeyPair,
  storeKeyPair,
  loadKeyPair,
  clearKeyPair,
  isKeyPairConsistent,
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
  deviceId: string | null;
  keyPair: KeyPair | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string, forceGenerateNewKeys?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_STORAGE_KEY = 'privacy_chat_token';

function canUseStorage(storage: Storage | undefined): storage is Storage {
  if (!storage) return false;
  try {
    const probeKey = '__privacy_chat_token_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function getPreferredTokenStorage(): Storage | null {
  const maybeSessionStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  if (canUseStorage(maybeSessionStorage)) return maybeSessionStorage;

  const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  if (canUseStorage(maybeLocalStorage)) return maybeLocalStorage;

  return null;
}

function readStoredToken(): string | null {
  const storage = getPreferredTokenStorage();
  if (!storage) return null;
  return storage.getItem(TOKEN_STORAGE_KEY);
}

function writeStoredToken(token: string): void {
  const storage = getPreferredTokenStorage();
  if (!storage) return;
  storage.setItem(TOKEN_STORAGE_KEY, token);

  // If token is stored in sessionStorage, clear old localStorage copy.
  const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  if (canUseStorage(maybeLocalStorage) && storage !== maybeLocalStorage) {
    maybeLocalStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function clearStoredToken(): void {
  const maybeSessionStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  if (canUseStorage(maybeSessionStorage)) {
    maybeSessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  if (canUseStorage(maybeLocalStorage)) {
    maybeLocalStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: preact.ComponentChildren }) {
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);
  const syncKeysMutation = useMutation(api.auth.updatePublicKey);
  const backfillSenderPublicKeysMutation = useMutation(api.messages.backfillSenderPublicKeys);

  // Load token and keys on mount
  useEffect(() => {
    const currentDeviceId = getOrCreateDeviceId();
    setDeviceId(currentDeviceId);

    const storedToken = readStoredToken();
    const storedKeyPair = loadKeyPair();

    // Never keep an auth session without a valid encryption key pair.
    // Force re-login so keys can be restored from encrypted server backup.
    if (storedToken && !storedKeyPair) {
      console.warn('Session token found without valid encryption keys. Forcing re-authentication.');
      clearStoredToken();
    } else if (storedToken) {
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
        const currentDeviceId = deviceId ?? getOrCreateDeviceId();
        setDeviceId(currentDeviceId);

        // Generate encryption keys first
        const newKeyPair = generateKeyPair();

        // Encrypt private key with password
        const encryptedPrivateKey = await encryptPrivateKeyWithPassword(newKeyPair.privateKey, password);

        // Get or create device ID for session binding (prevents session hijacking)
        const result = await registerMutation({
          email,
          password,
          displayName,
          publicKey: newKeyPair.publicKey,
          encryptedPrivateKey,
          deviceId: currentDeviceId,
        });

        // Store token and keys
        writeStoredToken(result.token);
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
    [registerMutation, deviceId]
  );

  const login = useCallback(
    async (email: string, password: string, forceGenerateNewKeys?: boolean): Promise<LoginResult> => {
      try {
        const currentDeviceId = deviceId ?? getOrCreateDeviceId();
        setDeviceId(currentDeviceId);

        // Get or create device ID for session binding (prevents session hijacking)
        const result = await loginMutation({ email, password, deviceId: currentDeviceId });

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

            if (!isKeyPairConsistent(authResponse.publicKey, privateKey)) {
              throw new Error('Recovered private key does not match server public key');
            }

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
                  deviceId: currentDeviceId,
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
          const serverPublicKey = authResponse.publicKey;
          const localMatchesServer = Boolean(
            localKeys &&
            serverPublicKey &&
            localKeys.publicKey === serverPublicKey &&
            isKeyPairConsistent(localKeys.publicKey, localKeys.privateKey)
          );

          if (localMatchesServer && localKeys) {
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
                deviceId: currentDeviceId,
                publicKey: currentKeyPair.publicKey,
                encryptedPrivateKey
              });
            } catch (e) {
              console.error('Failed to backup keys to server:', e);
            }
          } else {
            if (localKeys && !localMatchesServer) {
              console.warn('Ignoring local keys because they do not match server public key');
              clearKeyPair();
            }

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
                deviceId: currentDeviceId,
                publicKey: currentKeyPair.publicKey,
                encryptedPrivateKey
              });
            } catch (e) {
              console.error('Failed to backup new keys:', e);
            }
          }
        }

        // Store token and finalize
        writeStoredToken(result.token);
        setToken(result.token);
        setKeyPair(currentKeyPair);

        // Best-effort migration for historical messages missing sender key snapshots.
        // This keeps decryption resilient after key updates for old records.
        void backfillSenderPublicKeysMutation({
          token: result.token,
          deviceId: currentDeviceId,
        }).catch((migrationError) => {
          console.error('Failed to backfill sender key snapshots:', migrationError);
        });

        return { success: true, warning };
      } catch (error: unknown) {
        console.error('Login error:', error);
        const message = error instanceof Error ? error.message : 'Login gagal. Periksa email dan password Anda.';
        return { success: false, error: message };
      }
    },
    [loginMutation, syncKeysMutation, backfillSenderPublicKeysMutation, deviceId]
  );

  const logout = useCallback(async () => {
    const currentDeviceId = deviceId ?? getOrCreateDeviceId();
    setDeviceId(currentDeviceId);

    if (token) {
      try {
        await logoutMutation({ token, deviceId: currentDeviceId });
      } catch {
        // Ignore errors on logout
      }
    }

    // Clear storage
    clearStoredToken();
    clearKeyPair();

    setToken(null);
    setKeyPair(null);
  }, [token, logoutMutation, deviceId]);

  return (
    <AuthContext.Provider
      value={{
        token,
        deviceId,
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
