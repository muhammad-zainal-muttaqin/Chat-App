import { useState } from 'preact/hooks';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-dark-100 dark:from-dark-950 dark:to-dark-900 transition-colors duration-300">
      <div class="w-full max-w-md animate-fade-in-up">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-primary-600 to-primary-500 rounded-3xl shadow-lg shadow-primary-500/30 mb-6 transform hover:scale-105 transition-transform duration-300">
            <span class="i-carbon-chat text-4xl text-white" />
          </div>
          <h1 class="text-3xl font-bold text-dark-900 dark:text-white mb-2">Privacy Chat</h1>
          <p class="text-dark-500 dark:text-dark-400 text-lg">End-to-end encrypted messaging</p>
        </div>

        <div class="glass-card p-8 backdrop-blur-xl bg-white/80 dark:bg-dark-900/60 shadow-2xl shadow-primary-500/10 border-white/20 dark:border-dark-700/30">
          <h2 class="text-2xl font-bold text-dark-900 dark:text-white mb-6 text-center">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        <p class="text-center text-xs text-dark-400 dark:text-dark-500 mt-8 leading-relaxed">
          <span class="i-carbon-locked inline-block mr-1 align-text-bottom" />
          Your messages are encrypted on your device before being sent.
          <br />
          We cannot read your messages.
        </p>
      </div>
    </div>
  );
}
