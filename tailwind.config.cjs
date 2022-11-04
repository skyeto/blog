/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
    fontSize: {
      sm:   ['0.97rem', '1.3'],
      base: ['1.13rem', '1.39'], // 1.33 is the old val.
      lg:   ['1.26rem', '1.3'],
      xl:   ['1.7rem', '1.3'],
      '2xl':  ['1.8rem', '1.3']
    },
		extend: {},
	},
	plugins: [],
}
