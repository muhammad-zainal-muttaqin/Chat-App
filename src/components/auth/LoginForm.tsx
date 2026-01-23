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
      <div>
        <label class="block text-sm font-medium text-dark-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          class="input"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-dark-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          class="input"
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        class="btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Logging in...' : 'Log in'}
      </button>

      <p class="text-center text-sm text-dark-500">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
