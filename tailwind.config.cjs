/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
    fontSize: {
      sm:   ['0.97rem', '1.3'],
      base: ['1.11rem', '1.35'],
      lg:   ['1.55rem', '1.3'],
      xl:   ['1.7rem', '1.3'],
    },
		extend: {},
	},
	plugins: [],
}
