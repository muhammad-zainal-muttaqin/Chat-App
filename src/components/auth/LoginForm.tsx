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
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
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
          <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
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
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <div class="i-carbon-warning-filled w-5 h-5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        class="w-full btn-primary py-3"
        disabled={isLoading}
      >
        {isLoading ? (
          <span class="flex items-center gap-2">
            <div class="i-carbon-circle-dash w-5 h-5 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <p class="text-center text-sm text-dark-500 dark:text-dark-400">
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
