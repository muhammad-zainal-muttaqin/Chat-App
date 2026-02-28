import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthErrorMessage } from '../../lib/errors';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsLoading(false);
    };
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Add timeout protection (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout. Silakan coba lagi.')), 30000)
      );

      const result = await Promise.race([
        register(email, password, displayName),
        timeoutPromise
      ]) as { success: boolean; error?: string };

      if (!result.success) {
        setError(getAuthErrorMessage(result.error));
        setIsLoading(false);
      }
      // If success, isLoading will be reset by app.tsx when redirecting
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const message = getAuthErrorMessage(error);
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1.5 uppercase tracking-wide">
            Name
          </label>
          <input
            type="text"
            value={displayName}
            onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
            class="input-field"
            placeholder="Your name"
            required
            disabled={isLoading}
          />
        </div>

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
            placeholder="At least 8 characters"
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1.5 uppercase tracking-wide">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
            class="input-field"
            placeholder="Confirm password"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs leading-relaxed flex items-center gap-2">
          <div class="i-carbon-warning-filled w-4 h-4 flex-shrink-0" />
          {error}
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
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>

      <p class="text-center text-xs text-dark-400 dark:text-dark-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
