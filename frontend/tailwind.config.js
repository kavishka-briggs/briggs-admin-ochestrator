/** @type {import('tailwindcss').Config} */
const { getTokens } = require('./src/tokens');
const theme = process.env.THEME || 'BriggsDefault';
const tokens = getTokens(theme);

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: tokens.colors
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
