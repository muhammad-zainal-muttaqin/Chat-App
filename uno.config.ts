import { defineConfig, presetUno, presetIcons, presetAttributify, presetTypography } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetAttributify(),
    presetTypography(),
  ],
  theme: {
    fontFamily: {
      sans: 'Outfit, "Segoe UI", sans-serif',
      brand: '"Space Grotesk", Outfit, sans-serif',
    },
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
      },
      accent: {
        500: '#f43f5e',
      },
      // Keep "dark" for backward compatibility
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
        950: '#020617',
      },
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'btn': 'px-5 py-2.5 rounded-2xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 text-sm',
    'btn-primary': 'btn bg-gradient-to-r from-primary-600 to-cyan-500 text-white shadow-lg shadow-primary-600/30 hover:from-primary-500 hover:to-cyan-400',
    'btn-secondary': 'btn bg-white/70 dark:bg-dark-800/80 text-dark-700 dark:text-dark-200 border border-dark-200/70 dark:border-dark-700 hover:bg-white dark:hover:bg-dark-700',
    'btn-ghost': 'btn hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-400',
    'input-field': 'w-full px-4 py-3 rounded-xl border border-dark-200/80 dark:border-dark-700 bg-white/80 dark:bg-dark-800/90 text-dark-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all duration-200 placeholder-dark-400 dark:placeholder-dark-500 backdrop-blur-sm',
  },
});
