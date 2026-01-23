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
      <div>
        <label class="block text-sm font-medium text-dark-700 mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
          class="input"
          placeholder="Your name"
          required
          disabled={isLoading}
        />
      </div>

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
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-dark-700 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
          class="input"
          placeholder="Confirm your password"
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div class="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-700 text-sm">
        <div class="flex items-start gap-2">
          <span class="i-carbon-locked text-lg flex-shrink-0 mt-0.5" />
          <span>
            Your messages will be end-to-end encrypted. Encryption keys are generated
            locally on your device and never sent to our servers.
          </span>
        </div>
      </div>

      <button
        type="submit"
        class="btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>

      <p class="text-center text-sm text-dark-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
