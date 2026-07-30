import type { Config } from "tailwindcss"

const config: Config = {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				mirava: {
					canvas: 'rgb(var(--mirava-canvas-rgb) / <alpha-value>)',
					'canvas-raised': 'rgb(var(--mirava-canvas-raised-rgb) / <alpha-value>)',
					surface: 'rgb(var(--mirava-surface-rgb) / <alpha-value>)',
					'surface-raised': 'rgb(var(--mirava-surface-raised-rgb) / <alpha-value>)',
					ink: 'rgb(var(--mirava-ink-rgb) / <alpha-value>)',
					'ink-secondary': 'rgb(var(--mirava-ink-secondary-rgb) / <alpha-value>)',
					muted: 'rgb(var(--mirava-ink-muted-rgb) / <alpha-value>)',
					line: 'var(--mirava-line)',
					'line-strong': 'var(--mirava-line-strong)',
					accent: 'rgb(var(--mirava-accent-rgb) / <alpha-value>)',
					success: 'rgb(var(--mirava-success-rgb) / <alpha-value>)',
					danger: 'rgb(var(--mirava-danger-rgb) / <alpha-value>)',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['var(--font-sans)', 'sans-serif'],
				jakarta: ['var(--font-jakarta)', 'sans-serif'],
			},
			keyframes: {
				'spin-double': {
					'0%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(180deg)' },
					'35%': { transform: 'rotate(180deg)' },
					'80%': { transform: 'rotate(360deg)' },
					'100%': { transform: 'rotate(360deg)' },
				},
			},
			animation: {
				'spin-double': 'spin-double 1.8s ease-in-out infinite',
			},
		}
	},
	plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
}

export default config
