import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/blog" }),
});

export const collections = { blog };
