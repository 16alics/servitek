/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gradient1: {
          start: '#FFFDEE',
          end: '#E3EF26',
        },
        gradient2: {
          start: '#E2FBCE',
          end: '#076653',
        },
        gradient3: {
          start: '#E3EF26',
          end: '#0C342C',
        },
        gradient4: {
          start: '#076653',
          end: '#06231D',
        },
        brand: {
          light: '#E3EF26',
          DEFAULT: '#076653',
          dark: '#0C342C',
          darker: '#06231D'
        }
      }
    },
  },
  plugins: [],
}
