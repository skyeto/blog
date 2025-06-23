import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/blog" }),
});

const book = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/books" }),
});

export const collections = { blog, book };
