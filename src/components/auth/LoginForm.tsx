import { useState } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-5">
      <div class="space-y-4">
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
              placeholder="Enter your password"
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

      <button
        type="submit"
        class="w-full btn-primary py-3.5 rounded-xl text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
        disabled={isLoading}
      >
        {isLoading ? (
          <div class="flex items-center justify-center gap-2">
            <span class="i-carbon-circle-dash animate-spin text-xl" />
            <span>Logging in...</span>
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      <p class="text-center text-sm text-dark-500 dark:text-dark-400">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
