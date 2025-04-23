/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./src/layouts/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./src/components/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./src/style/**/*.{css,astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
  darkMode: "selector",
  safelist: ["grow-1", "h-64", "rotate-10", "!opacity-0"],
};
