import { render } from 'preact';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AuthProvider } from './contexts/AuthContext';
import { App } from './app';
import 'virtual:uno.css';
import '@unocss/reset/tailwind.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

render(
  <ConvexProvider client={convex}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ConvexProvider>,
  document.getElementById('app')!
);
