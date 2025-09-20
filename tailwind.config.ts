import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(216, 20%, 8%)',
        surface: 'hsl(216, 20%, 12%)',
        primary: 'hsl(210, 100%, 63%)',
        subtle: 'hsl(216, 10%, 60%)',
      },
    },
  },
  plugins: [],
} satisfies Config;

