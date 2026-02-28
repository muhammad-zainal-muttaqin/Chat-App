import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthErrorMessage, AuthErrors } from '../../lib/errors';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track key decrypt failures for retry logic
  const [keyDecryptFailures, setKeyDecryptFailures] = useState(0);
  const [showNewKeyWarning, setShowNewKeyWarning] = useState(false);
  const [pendingNewKeyGeneration, setPendingNewKeyGeneration] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  }, []);

  const handleSubmit = async (e: Event, forceNewKeys = false) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Add timeout protection (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout. Silakan coba lagi.')), 30000)
      );

      const result = await Promise.race([
        login(email, password, forceNewKeys),
        timeoutPromise
      ]) as { success: boolean; error?: string; warning?: string };

      if (!result.success) {
        // Handle key decrypt failure specifically
        if (result.error === AuthErrors.KEY_DECRYPT_FAILED) {
          const newFailureCount = keyDecryptFailures + 1;
          setKeyDecryptFailures(newFailureCount);

          if (newFailureCount >= 3) {
            // After 3 failures, offer to generate new keys
            setError('Password tidak cocok dengan kunci enkripsi Anda. Anda dapat mencoba lagi atau membuat kunci baru (pesan lama tidak akan bisa dibaca).');
            setPendingNewKeyGeneration(true);
          } else {
            setError(`Password mungkin salah untuk mendekripsi kunci enkripsi. Silakan coba lagi. (Percobaan ${newFailureCount}/3)`);
          }
        } else {
          setError(getAuthErrorMessage(result.error));
        }
        setIsLoading(false);
        return;
      }

      // Handle warning for new key generation
      if (result.warning === 'new_keys_generated') {
        setShowNewKeyWarning(true);
        setIsLoading(false);
        return;
      }

      // If success without warning, isLoading will be reset by app.tsx when redirecting
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = getAuthErrorMessage(error);
      setError(message);
      setIsLoading(false);
    }
  };

  const handleForceNewKeys = async () => {
    setPendingNewKeyGeneration(false);
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email, password, true);

      if (!result.success) {
        setError(getAuthErrorMessage(result.error));
        setIsLoading(false);
        return;
      }

      // Show warning that old messages won't be readable
      setShowNewKeyWarning(true);
      setIsLoading(false);
    } catch (error: unknown) {
      console.error('Force new keys error:', error);
      setError('Gagal membuat kunci baru. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handleAcceptNewKeys = () => {
    // Close warning and let the app redirect to chat
    setShowNewKeyWarning(false);
    // The login was successful, app.tsx will handle the redirect
  };

  // Show new key warning modal
  if (showNewKeyWarning) {
    return (
      <div class="space-y-4">
        <div class="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
          <div class="flex items-start gap-3">
            <div class="i-carbon-warning text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 class="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2">
                Kunci Enkripsi Baru Dibuat
              </h3>
              <p class="text-amber-700 dark:text-amber-300 text-xs leading-relaxed mb-3">
                Kunci enkripsi baru telah dibuat untuk akun Anda. Ini berarti:
              </p>
              <ul class="text-amber-700 dark:text-amber-300 text-xs list-disc list-inside space-y-1 mb-4">
                <li>Pesan-pesan lama <strong>tidak akan bisa dibaca</strong></li>
                <li>Pesan baru akan terenkripsi dengan kunci baru</li>
                <li>Kunci baru telah di-backup ke server</li>
              </ul>
              <button
                onClick={handleAcceptNewKeys}
                class="btn-primary py-2 px-4 text-xs"
              >
                Saya Mengerti, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1.5 uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            class="input-field"
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1.5 uppercase tracking-wide">
            Password
          </label>
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            class="input-field"
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs leading-relaxed">
          <div class="flex items-start gap-2">
            <div class="i-carbon-warning-filled w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Option to generate new keys after 3 failed decrypt attempts */}
      {pendingNewKeyGeneration && (
        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
          <p class="text-amber-700 dark:text-amber-300 text-xs leading-relaxed mb-3">
            Jika Anda yakin password benar, Anda dapat membuat kunci enkripsi baru.
            <strong> Perhatian: Pesan lama tidak akan bisa dibaca.</strong>
          </p>
          <button
            type="button"
            onClick={handleForceNewKeys}
            class="btn-secondary py-2 text-xs w-full"
            disabled={isLoading}
          >
            Buat Kunci Baru (Pesan Lama Hilang)
          </button>
        </div>
      )}

      <button
        type="submit"
        class="btn py-3 auth-submit"
        disabled={isLoading}
      >
        {isLoading ? (
          <span class="flex items-center gap-2">
            <div class="i-carbon-circle-dash w-4 h-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <p class="text-center text-xs text-dark-400 dark:text-dark-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
