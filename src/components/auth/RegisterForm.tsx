import { useState } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';

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

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, displayName);

    if (!result.success) {
      setError(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-1.5 ml-1">
            Display Name
          </label>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 i-carbon-user text-dark-400 group-focus-within:text-primary-500 transition-colors text-lg" />
            <input
              type="text"
              value={displayName}
              onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm placeholder-dark-400 dark:placeholder-dark-500"
              placeholder="Your name"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-1.5 ml-1">
            Email
          </label>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 i-carbon-email text-dark-400 group-focus-within:text-primary-500 transition-colors text-lg" />
            <input
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm placeholder-dark-400 dark:placeholder-dark-500"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-1.5 ml-1">
            Password
          </label>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 i-carbon-password text-dark-400 group-focus-within:text-primary-500 transition-colors text-lg" />
            <input
              type="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm placeholder-dark-400 dark:placeholder-dark-500"
              placeholder="At least 8 characters"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-1.5 ml-1">
            Confirm Password
          </label>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 i-carbon-password text-dark-400 group-focus-within:text-primary-500 transition-colors text-lg" />
            <input
              type="password"
              value={confirmPassword}
              onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm placeholder-dark-400 dark:placeholder-dark-500"
              placeholder="Confirm your password"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {error && (
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <span class="i-carbon-warning-filled text-lg" />
          {error}
        </div>
      )}

      <div class="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20 rounded-xl text-primary-700 dark:text-primary-300 text-xs">
        <div class="flex items-start gap-2.5">
          <span class="i-carbon-locked text-lg flex-shrink-0 mt-0.5" />
          <span class="leading-relaxed opacity-90">
            Your messages will be end-to-end encrypted. Encryption keys are generated
            locally on your device and never sent to our servers.
          </span>
        </div>
      </div>

      <button
        type="submit"
        class="w-full btn-primary py-3.5 rounded-xl text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
        disabled={isLoading}
      >
        {isLoading ? (
          <div class="flex items-center justify-center gap-2">
            <span class="i-carbon-circle-dash animate-spin text-xl" />
            <span>Creating account...</span>
          </div>
        ) : (
          'Create Account'
        )}
      </button>

      <p class="text-center text-sm text-dark-500 dark:text-dark-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold hover:underline"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
