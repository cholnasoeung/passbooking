/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        grab: {
          green: '#00B14F',
          dark: '#0D5C2E',
          light: '#E8F5EE'
        }
      }
    }
  },
  plugins: []
};
