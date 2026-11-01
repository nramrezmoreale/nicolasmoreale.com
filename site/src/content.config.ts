import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Case studies. Keep them anonymized: no client, program or employer names.
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    context: z.string(),
    area: z.enum(['Contact centers', 'Data engineering', 'Cloud infrastructure']),
    order: z.number(),
    stack: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

// Articles. Set draft: true to keep one out of the build.
// An article published elsewhere has a url and a source, and no body: the site lists it and
// links out instead of giving it a page of its own.
// Set featured: false to list an article on /writing/ but keep it off the homepage.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    url: z.string().url().optional(),
    source: z.string().optional(),
    featured: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, writing };
