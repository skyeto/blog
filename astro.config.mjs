import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";

import prefetch from "@astrojs/prefetch";

// https://astro.build/config
import react from "@astrojs/react";

// https://astro.build/config

// https://astro.build/config

// https://astro.build/config
export default defineConfig({
  site: "https://skyeto.com",
  integrations: [tailwind(), mdx(), /*prefetch(),*/ react()]
});
