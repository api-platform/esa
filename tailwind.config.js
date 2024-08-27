/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './api/public/*.html',
    './api/templates/*.html',
    './api/public/*.js',
  ],
  theme: {
    extend: {
      screens: {
        'mobile-only': { max: '767px' },
      },
      fontFamily: {
        sans: 'Inter Variable',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};

