import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config = {
  darkMode: ['class', 'html[class~="dark"]'],
  content: [
    './src/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './public/**/*.svg',
    './craft/**/*.mdx',
  ],
  prefix: 'bd-',
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      transitionTimingFunction: {
        'in-quad': 'cubic-bezier(.55, .085, .68, .53)',
        'in-cubic': 'cubic-bezier(.550, .055, .675, .19)',
        'in-quart': 'cubic-bezier(.895, .03, .685, .22)',
        'in-quint': 'cubic-bezier(.755, .05, .855, .06)',
        'in-expo': 'cubic-bezier(.95, .05, .795, .035)',
        'in-circ': 'cubic-bezier(.6, .04, .98, .335)',
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: 'normal',
            },
            'code::after': {
              content: 'normal',
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: 700,
              '& a': {
                textDecoration: 'none',
              },
            },
          },
        },
      },
      screens: {
        xs: '430px',
      },
      backgroundImage: {
        'navigation-highlight':
          'linear-gradient(to right, rgba(0, 0, 0, 0), hsl(var(--gray-600)) 20%,hsl(var(--gray-900)) 67.19%, rgba(0, 0, 0, 0))',
        'navigation-item-top-highlight':
          'linear-gradient(to right, rgba(0, 0, 0, 0),hsl(var(--gray-400)) 20%,hsl(var(--gray-700)) 67.19%, rgba(0, 0, 0, 0))',
        'navigation-item':
          'linear-gradient(to top right, hsl(var(--gray-200)), hsl(var(--gray-300)), hsl(var(--gray-200)), hsl(var(--gray-300)))',
      },
      backgroundSize: {
        'navigation-item': '200% 100%',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        gray: {
          100: 'hsl(var(--gray-100))',
          200: 'hsl(var(--gray-200))',
          300: 'hsl(var(--gray-300))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
          950: 'hsl(var(--gray-950))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        signature: {
          '0%': { strokeDashoffset: '28.13859748840332' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        signature: 'signature 4s ease-in-out alternate infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
} satisfies Config;

export default config;
