import { defineConfig, presetUno, presetIcons, presetAttributify, presetTypography } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
    presetAttributify(),
    presetTypography(),
  ],
  theme: {
    fontFamily: {
      sans: 'Outfit, Inter, system-ui, sans-serif',
      display: 'Outfit, sans-serif',
    },
    colors: {
      primary: {
        50: '#f0f4ff',
        100: '#e0e9fe',
        200: '#c1d2fd',
        300: '#a2bbfa',
        400: '#648cf4',
        500: '#3b82f6', // Bright standard blue
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
      },
      accent: {
        500: '#f43f5e', // Rose for accents
      },
      dark: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#0b0f1a', // Lifted from black to deep navy
      },
    },
    boxShadow: {
      'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
      'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'btn': 'px-6 py-3 rounded-2xl font-bold transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 text-sm',
    'btn-primary': 'btn bg-primary-600 text-white hover:bg-primary-500 hover:shadow-glow active:bg-primary-700',
    'btn-secondary': 'btn bg-white/10 dark:bg-white/5 text-dark-800 dark:text-white border border-dark-200/50 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 shadow-sm',
    'btn-ghost': 'btn hover:bg-dark-100 dark:hover:bg-white/5 text-dark-600 dark:text-dark-300',
    'input-field': 'w-full px-5 py-4 rounded-2xl border border-dark-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all duration-300 placeholder-dark-400 backdrop-blur-sm',
    'glass': 'bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-white/20 dark:border-white/10',
    'glass-card': 'glass rounded-[2rem] shadow-glass',
    'sidebar-item': 'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer group',
    'sidebar-item-active': 'bg-primary-500/15 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-sm',
    'sidebar-item-inactive': 'text-dark-500 dark:text-dark-400 hover:bg-white/5 hover:text-dark-900 dark:hover:text-white',
  },
  rules: [
    ['animate-fade-in', { animation: 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }],
  ],
});
