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
        class="absolute top-4 right-4 z-20 p-2 rounded-xl text-dark-500 hover:text-dark-700 dark:text-dark-300 hover:bg-white/60 dark:hover:bg-dark-800/80 transition-colors backdrop-blur-sm border border-dark-200/70 dark:border-dark-700"
      >
        <div class={`w-5 h-5 ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
      </button>

      <div class="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-primary-600/30 animate-pulse">
            <div class="i-carbon-chat w-7 h-7 text-white" />
          </div>
          <h1 class="brand-title text-3xl font-bold text-dark-900 dark:text-white">Priva Chat</h1>
          <p class="text-dark-600 dark:text-dark-300 text-sm mt-1">
            Secure, encrypted messaging
          </p>
        </div>

        {/* Card */}
        <div class="card-surface rounded-3xl p-6">
          <h2 class="brand-title text-lg font-semibold text-dark-900 dark:text-white mb-6 text-center">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        {/* Footer */}
        <p class="text-center text-xs text-dark-500 dark:text-dark-400 mt-6 flex items-center justify-center gap-1.5">
          <div class="i-carbon-locked w-4 h-4" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
