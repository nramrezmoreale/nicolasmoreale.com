// Everything personal about the site lives here. Edit this file first.

export const site = {
  name: 'Nicolás Moreale',
  url: 'https://nicolasmoreale.com',
  title: 'Amazon Connect and AWS engineer',
  description:
    'Independent AWS engineer in Buenos Aires. I build, fix and modernize Amazon Connect contact centers and turn their data into reporting teams can trust.',
  location: 'Buenos Aires, Argentina',

  // Set up mail for this address before launch (see README, "Email").
  email: 'hello@nicolasmoreale.com',

  // Create a free Cal.com (or Calendly) event and paste its link here.
  bookingUrl: 'https://cal.com/nicolasmoreale/intro',

  linkedin: 'https://www.linkedin.com/in/nicolasmoreale/',

  // Your GitHub profile and this site's repo. Leave empty to hide the links.
  github: '',
  sourceRepo: '',
};

export const nav = [
  { href: '/services/', label: 'Services' },
  { href: '/work/', label: 'Work' },
  { href: '/writing/', label: 'Writing' },
  { href: '/about/', label: 'About' },
];

export type Service = {
  slug: string;
  name: string;
  summary: string;
  format: string;
  includes: string[];
};

export const services: Service[] = [
  {
    slug: 'health-check',
    name: 'Connect health check',
    summary:
      'A fixed-scope review of your Amazon Connect instance, with a written report and a fix list ranked by impact.',
    format: 'Fixed price, 1 to 2 weeks',
    includes: [
      'Contact flows, routing profiles and queues',
      'Hours of operation, holidays and closed messages',
      'Voicemail, callbacks and transfers',
      'Lambda and DynamoDB integrations',
      'Permissions, security profiles and IAM',
      'Cost, and the reports your team relies on',
      'A 60-minute walkthrough of the findings',
    ],
  },
  {
    slug: 'build-and-fix',
    name: 'Builds and fixes',
    summary:
      'New IVRs and queues, Salesforce Service Cloud Voice integration, voicemail and callbacks, multilingual prompts, and the problems that keep coming back.',
    format: 'Scoped sprints',
    includes: [
      'IVR and contact flow builds, in any of five languages',
      'Salesforce Service Cloud Voice setup and troubleshooting',
      'Voicemail delivery and callback flows',
      'Moving routing and reports off legacy platforms',
      'Promoting flows safely between environments',
    ],
  },
  {
    slug: 'reporting-and-data',
    name: 'Reporting and data',
    summary:
      'Metrics defined the way your contracts define them, scheduled reports for supervisors, and a contact data lake you can query.',
    format: 'Project',
    includes: [
      'Mapping legacy reports to Amazon Connect metrics',
      'Custom dashboard metrics for contractual SLAs',
      'Amazon Connect data lake with Athena',
      'Scheduled CSV reports by email',
    ],
  },
  {
    slug: 'ai',
    name: 'AI in the contact center',
    summary:
      'Self-service with Amazon Lex and Bedrock, and call summaries and analytics with Contact Lens.',
    format: 'Project',
    includes: [
      'Bots that answer the common questions before a caller reaches the queue',
      'Post-call summaries and transcripts with Contact Lens',
      'Reporting on what callers actually ask about',
    ],
  },
  {
    slug: 'support',
    name: 'Ongoing support',
    summary:
      'A monthly block of hours for changes, incidents and the questions your team does not have time for.',
    format: 'Monthly retainer',
    includes: [
      'Flow and queue changes on request',
      'Incident investigation and root-cause notes',
      'Monthly check of errors, costs and reports',
    ],
  },
];
