import { defineConfig } from 'astro/config';

// https://astro.build/config
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import mdx from "@astrojs/mdx";

// https://astro.build/config
import prefetch from "@astrojs/prefetch";

// https://astro.build/config
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  site: "https://skyeto.com",
  integrations: [tailwind(), mdx(), prefetch(), compress()]
});
