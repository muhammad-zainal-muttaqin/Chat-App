import { useState } from 'preact/hooks';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useTheme } from '../../contexts/ThemeContext';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { isDark, toggleTheme } = useTheme();

  return (
    <div class="min-h-screen relative flex items-center justify-center p-4 app-shell-bg">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        class="absolute top-5 right-5 z-20 w-9 h-9 rounded-lg text-dark-400 hover:text-dark-600 dark:text-dark-500 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex-center"
      >
        <div class={`w-[18px] h-[18px] ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
      </button>

      <div class="w-full max-w-[380px] animate-slide-up">
        {/* Logo */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-2xl mb-4 shadow-sm">
            <div class="i-carbon-chat w-6 h-6 text-white" />
          </div>
          <h1 class="brand-title text-2xl font-bold text-dark-900 dark:text-white">
            Priva Chat
          </h1>
          <p class="text-dark-500 dark:text-dark-400 text-sm mt-1.5">
            Secure, encrypted messaging
          </p>
        </div>

        {/* Card */}
        <div class="card-surface rounded-2xl p-6">
          {/* Tab Switcher */}
          <div class="flex bg-dark-100 dark:bg-dark-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              class={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm'
                  : 'text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('register')}
              class={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm'
                  : 'text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300'
              }`}
            >
              Create account
            </button>
          </div>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Footer */}
        <p class="text-center text-xs text-dark-400 dark:text-dark-500 mt-6 flex items-center justify-center gap-1.5">
          <div class="i-carbon-locked w-3.5 h-3.5" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
