import { useState } from 'preact/hooks';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useTheme } from '../../contexts/ThemeContext';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { isDark, toggleTheme } = useTheme();

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-dark-50 dark:bg-dark-950">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        class="absolute top-4 right-4 p-2 rounded-lg text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
      >
        <div class={`w-5 h-5 ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
      </button>

      <div class="w-full max-w-sm">
        {/* Logo */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl mb-4">
            <div class="i-carbon-chat w-7 h-7 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-dark-900 dark:text-white">Priva Chat</h1>
          <p class="text-dark-500 dark:text-dark-400 text-sm mt-1">
            Secure, encrypted messaging
          </p>
        </div>

        {/* Card */}
        <div class="bg-white dark:bg-dark-900 rounded-2xl border border-dark-200 dark:border-dark-800 p-6 shadow-lg">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white mb-6 text-center">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Footer */}
        <p class="text-center text-xs text-dark-400 dark:text-dark-500 mt-6 flex items-center justify-center gap-1.5">
          <div class="i-carbon-locked w-4 h-4" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
