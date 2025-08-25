/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        digital: ["'Orbitron'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        tempoBlue: '#0a88ff',
        tempoGold: '#c2a14a',
        tempoBlack: '#1a1f24',
        tempoBezel: '#2a3036',
      },
    },
  },
  plugins: [],
}
