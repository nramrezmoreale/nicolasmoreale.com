// /llms.txt: a plain-text summary of the site for AI assistants (https://llmstxt.org).
// Built from the same config and content as the pages, so it never goes stale.
import { getCollection } from 'astro:content';
import { practices, site, support } from '../site.config';

export async function GET() {
  const work = (await getCollection('work', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order,
  );
  const writing = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${site.name} (also listed as ${site.alternateNames.join(', ')}) is an independent AWS engineer based in ${site.location}. He works in English and Spanish, during US business hours, with clients in the US and Europe. Work is done in the client's own AWS account and delivered as code.`,
    '',
    `- Email: ${site.email}`,
    `- Book a 30-minute intro call: ${site.bookingUrl}`,
    `- LinkedIn: ${site.linkedin}`,
    ...(site.github ? [`- GitHub: ${site.github}`] : []),
    ...(site.builderCenter ? [`- AWS Builder Center: ${site.builderCenter}`] : []),
    '',
    '## Services',
    '',
    ...[...practices, { name: support.name, tools: '', services: [support] }].flatMap((p) => [
      `### ${p.name}`,
      '',
      ...(p.tools ? [`Mostly: ${p.tools}.`, ''] : []),
      ...p.services.map(
        (s) => `- [${s.name}](${site.url}/services/#${s.slug}): ${s.summary} (${s.format})`,
      ),
      '',
    ]),
    '## Case studies',
    '',
    ...work.map(
      (w) => `- [${w.data.title}](${site.url}/work/${w.id}/): ${w.data.area}. ${w.data.summary}`,
    ),
    '',
    '## Writing',
    '',
    ...writing.map(
      (a) =>
        `- [${a.data.title}](${a.data.url ?? `${site.url}/writing/${a.id}/`}) (${day(a.data.pubDate)}${a.data.source ? `, on ${a.data.source}` : ''}): ${a.data.description}`,
    ),
    '',
    '## Optional',
    '',
    `- [About](${site.url}/about/): background, experience and education`,
    `- [How this website is built](${site.url}/work/this-website-on-aws/)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
