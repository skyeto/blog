// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { h } from "hastscript";
import rehypeTypeset from "./src/lib/rehype-typeset";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkDecorations from "./src/lib/remark-decorations";
import remarkSectionize from "remark-sectionize";
import { fromHtml } from "hast-util-from-html";
import {
  transformerNotationDiff,
  transformerMetaWordHighlight,
  transformerNotationWordHighlight,
  transformerRemoveNotationEscape,
} from "@shikijs/transformers";
import shakuCodeAnnotateShikiTransformer from "shaku-code-annotate-shiki-transformer";
import tailwindcss from "@tailwindcss/vite";
import { optimizeCssModules } from "vite-plugin-optimize-css-modules";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import rename from "astro-rename";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import postcssRename from "postcss-rename";
import { fileURLToPath } from "node:url";
import { readdir, readFile, writeFile } from "node:fs/promises";
import cssnano from "cssnano";

let classMap = {};
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hToLevel = (node) => {
  switch (node.tagName) {
    case "h1":
      return 1;
    case "h2":
      return 2;
    case "h3":
      return 3;
  }
};

// https://astro.build/config
export default defineConfig({
  site: "https://skyeto.com",
  vite: {
    plugins: [wasm(), topLevelAwait(), tailwindcss()],
    css: {
      transformer: "postcss",
    },
  },
  integrations: [
    mdx({
      rehypePlugins: [
        rehypeTypeset,
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "prepend",
            content: (node) => {
              const level = hToLevel(node);
              return h(
                "span.heading-link",
                fromHtml(
                  `<svg class="inline w-2 h-2 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/></svg>`
                )
              );
            },
          },
        ],
      ],
      remarkPlugins: [remarkDecorations, remarkSectionize],
    }),
    react(),
    {
      name: "rename-classes",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          // /* The problem with this is that it replaces not just classes, but words that match the class names. */
          // const dist = fileURLToPath(dir);
          // for await (const file of await readdir(dist, { recursive: true })) {
          //   if (!["html", "js"].some((ext) => file.endsWith(ext))) continue;
          //   const fileName = dist + file;
          //   let content = await readFile(fileName, "utf-8");
          //   Object.keys(classMap).forEach((key) => {
          //     const regex = new RegExp(
          //       `(:^|[^-&;:_])(${escapeRegExp(key)})(?![a-zA-Z0-9_-])(:$|[^-&;:_\./])`,
          //       "g"
          //     );
          //     content = content.replaceAll(regex, `$1${classMap[key]}$3`);
          //   });
          //   await writeFile(fileName, content, {
          //     encoding: "utf8",
          //     flag: "w",
          //   });
          // }
        },
      },
    },
  ],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-frappe",
      transformers: [
        transformerMetaWordHighlight(),
        transformerNotationWordHighlight(),
        {
          name: "shiki:inline-decorations",
          preprocess(code, options) {
            const reg = /^\/\/ @decorations:(.*)\n/;
            code = code.replace(reg, (match, decorations) => {
              options.decorations ||= [];
              options.decorations.push(...JSON.parse(decorations));
              return "";
            });
            return code;
          },
        },

        transformerNotationDiff(),
        shakuCodeAnnotateShikiTransformer({
          shakuTrigger: /annotate/,
          theme: "astro-code",
        }),
      ],
    },
  },
});
