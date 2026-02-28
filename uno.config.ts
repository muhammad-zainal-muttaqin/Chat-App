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
      sans: '"DM Sans", "Segoe UI", system-ui, sans-serif',
      brand: '"Bricolage Grotesque", "DM Sans", system-ui, sans-serif',
    },
    colors: {
      primary: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
        950: '#042f2e',
      },
      accent: {
        500: '#f59e0b',
      },
      dark: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
        950: '#0c0a09',
      },
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'btn': 'px-5 py-2.5 rounded-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 text-sm',
    'btn-primary': 'btn bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md',
    'btn-secondary': 'btn bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-200 border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 shadow-sm',
    'btn-ghost': 'btn hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-600 dark:text-dark-400',
    'input-field': 'w-full px-4 py-3 rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 placeholder-dark-400 dark:placeholder-dark-500',
  },
});
