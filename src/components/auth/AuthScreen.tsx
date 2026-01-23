import { useState } from 'preact/hooks';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-dark-100">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span class="i-carbon-chat text-3xl text-white" />
          </div>
          <h1 class="text-2xl font-bold text-dark-900">Privacy Chat</h1>
          <p class="text-dark-500 mt-1">End-to-end encrypted messaging</p>
        </div>

        <div class="card p-6">
          <h2 class="text-xl font-semibold text-dark-900 mb-6">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        <p class="text-center text-xs text-dark-400 mt-6">
          Your messages are encrypted on your device before being sent.
          <br />
          We cannot read your messages.
        </p>
      </div>
    </div>
  );
}
