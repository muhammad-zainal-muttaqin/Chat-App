import { render } from 'preact';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { App } from './app';
import 'virtual:uno.css';
import '@unocss/reset/tailwind.css';
import './index.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

render(
  <ConvexProvider client={convex}>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </ConvexProvider>,
  document.getElementById('app')!
);
