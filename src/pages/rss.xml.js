import rss from '@astrojs/rss';

export const get = () => rss({
  title: 'skyeto | Ramblings of a Fox',
  description: 'A rambly collection of posts with everything from CTF writeups, bad ideas, bikepacking excursions, and more.',
  site: 'https://skyeto.com',
  items: import.meta.glob('./**/*.{md,mdx}'),
  customData: `<language>en-us</language>`,
});
