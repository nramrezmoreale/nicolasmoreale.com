// Everything personal about the site lives here. Edit this file first.

export const site = {
  name: 'Nicolás Moreale',
  url: 'https://nicolasmoreale.com',
  title: 'AWS engineer for data, contact centers and cloud',
  description:
    'Independent AWS engineer in Buenos Aires. I build data pipelines and data lakes, Amazon Connect contact centers, and the AWS infrastructure they run on, for teams in the US and Europe.',
  location: 'Buenos Aires, Argentina',

  email: 'hello@nicolasmoreale.com',
  bookingUrl: 'https://cal.com/nicolasmoreale/intro',
  linkedin: 'https://www.linkedin.com/in/nicolasmoreale/',

  // Your GitHub profile and this site's repo. Leave empty to hide the links.
  github: 'https://github.com/nramrezmoreale',
  sourceRepo: 'https://github.com/nramrezmoreale/nicolasmoreale.com',

  // Your AWS Builder Center profile, where some of the articles are published. Leave empty to hide.
  builderCenter: 'https://builder.aws.com/community/@yoyiwatts',
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

export type Practice = {
  slug: string;
  name: string;
  /** The AWS services this area mostly uses, shown as a short line under the name. */
  tools: string;
  summary: string;
  services: Service[];
};

// The three areas of work, in the order they're shown: data first, then contact centers, then cloud.
export const practices: Practice[] = [
  {
    slug: 'data',
    name: 'Data engineering',
    tools: 'S3, Glue and PySpark, Athena, Lambda, EventBridge, QuickSight',
    summary:
      'Pipelines that bring data from databases, files and APIs into S3, a data lake you can query with SQL, and dashboards built on data that has been cleaned and checked.',
    services: [
      {
        slug: 'data-pipelines',
        name: 'Data pipelines',
        summary:
          'Batch and event-driven pipelines that bring data from your systems into S3, cleaned, partitioned and checked, with an alert when a load fails.',
        format: 'Project',
        includes: [
          'Ingestion from relational databases, REST APIs, CSV exports and file drops',
          'Cleansing, validation, deduplication and transformations in AWS Glue with PySpark',
          'Automation with Lambda, EventBridge and Step Functions',
          'Curated datasets in Parquet, with CloudWatch monitoring and failure alerts',
          'Moving existing jobs from Azure Data Factory, scripts or legacy tools',
        ],
      },
      {
        slug: 'data-lakes-and-reporting',
        name: 'Data lakes and reporting',
        summary:
          'An S3 data lake with Athena on top, and reports whose numbers you can defend, including contact-center data from Amazon Connect.',
        format: 'Project',
        includes: [
          'S3 data lake with the Glue Data Catalog and Athena',
          'Amazon Connect data lake and contact-center analytics',
          'Metric definitions written down and tested against the raw data',
          'Mapping legacy reports to the new source, with side-by-side checks',
          'Dashboards in Amazon QuickSight, or scheduled reports by email',
        ],
      },
    ],
  },
  {
    slug: 'contact-centers',
    name: 'Contact centers',
    tools: 'Amazon Connect, Salesforce Service Cloud Voice, Lambda, DynamoDB, Lex',
    summary:
      'Contact flows, routing, SMS, voicemail and callbacks, Salesforce Service Cloud Voice, and AI self-service, built and fixed by someone who works in Amazon Connect every day.',
    services: [
      {
        slug: 'connect-health-check',
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
        slug: 'connect-builds',
        name: 'Builds and fixes',
        summary:
          'New IVRs and queues, SMS, Salesforce Service Cloud Voice integration, voicemail and callbacks, multilingual prompts, and the problems that keep coming back.',
        format: 'Scoped sprints',
        includes: [
          'IVR and contact flow builds, in any of five languages',
          'Two-way SMS in Amazon Connect: numbers, flows, routing and testing',
          'Salesforce Service Cloud Voice setup and troubleshooting',
          'Lambda and DynamoDB integrations: caller lookups, routing tables, holiday calendars',
          'Voicemail delivery and callback flows',
          'Moving routing and reports off legacy platforms',
          'Promoting flows between environments with CloudFormation',
        ],
      },
      {
        slug: 'contact-center-ai',
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
    ],
  },
  {
    slug: 'cloud',
    name: 'Cloud infrastructure',
    tools: 'IAM, CloudFormation, AWS CDK, GitHub Actions, CloudWatch',
    summary:
      'AWS accounts set up with sensible security and cost controls, infrastructure defined as code, and deployments that need no stored keys. This website is an example.',
    services: [
      {
        slug: 'aws-account-review',
        name: 'AWS account review',
        summary:
          'A fixed-scope review of your AWS account for security, cost and reliability, with a fix list ranked by impact.',
        format: 'Fixed price, 1 week',
        includes: [
          'IAM users, roles, access keys and who can do what',
          'Root account, MFA and organization policies',
          'Public buckets, open ports and exposed endpoints',
          'Your biggest costs, budgets and anomaly alerts',
          'Backups, logging and alarms',
          'A 60-minute walkthrough of the findings',
        ],
      },
      {
        slug: 'infrastructure-as-code',
        name: 'Infrastructure as code and CI/CD',
        summary:
          'Your infrastructure defined in AWS CDK and deployed from GitHub Actions, so every change is reviewed, repeatable and easy to roll back.',
        format: 'Project',
        includes: [
          'CloudFormation or AWS CDK for new and existing resources',
          'GitHub Actions deployments through OIDC, with no stored AWS keys',
          'Separate test and production environments',
          'Static sites, serverless APIs and domain email on S3, CloudFront, Lambda and SES',
          'Cost, error and budget alarms that reach a person',
        ],
      },
    ],
  },
];

// Available across all three areas.
export const support: Service = {
  slug: 'support',
  name: 'Ongoing support',
  summary:
    'A monthly block of hours for changes, incidents and the questions your team doesn’t have time for, across your contact center, data and AWS setup.',
  format: 'Monthly retainer',
  includes: [
    'Changes on request: flows, pipelines, infrastructure',
    'Incident investigation and root-cause notes',
    'A monthly check of errors, costs and reports',
  ],
};
