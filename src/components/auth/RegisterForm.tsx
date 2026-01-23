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
          <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
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
            placeholder="At least 8 characters"
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1.5">
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
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>

      <p class="text-center text-sm text-dark-500 dark:text-dark-400">
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
