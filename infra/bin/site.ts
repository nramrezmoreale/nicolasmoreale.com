import * as cdk from 'aws-cdk-lib';
import { SiteStack } from '../lib/site-stack.ts';

const app = new cdk.App();
const ctx = (key: string): string => String(app.node.tryGetContext(key) ?? '');

const config = {
  domainName: ctx('domainName'),
  hostedZoneId: ctx('hostedZoneId'),
  githubRepo: ctx('githubRepo'),
  alertEmail: ctx('alertEmail'),
  createGithubOidcProvider: ctx('createGithubOidcProvider') !== 'false',
  monthlyBudgetUsd: Number(ctx('monthlyBudgetUsd') || 5),
};

// Fail early, with a clear message, if cdk.json still has placeholders.
// alertEmail is passed on the command line (-c alertEmail=...) so it stays out of the public repo.
const unset = Object.entries(config).filter(([, v]) => typeof v === 'string' && (v === '' || v.startsWith('REPLACE')));
if (unset.length) {
  throw new Error(
    `Missing settings: ${unset.map(([k]) => k).join(', ')}. ` +
      'Set them in infra/cdk.json under "context" (alertEmail: pass -c alertEmail=you@example.com).',
  );
}
if (!/^[\w.-]+\/[\w.-]+$/.test(config.githubRepo)) {
  throw new Error('githubRepo must look like owner/repo, for example nicolasmoreale/website');
}

// Optional: GitHub's numeric owner and repo IDs as "ownerId/repoId". Newer repos send
// an ID-based subject to AWS; get the IDs with
//   gh api repos/OWNER/REPO/actions/oidc/customization/sub
const githubRepoIds = ctx('githubRepoIds');
if (githubRepoIds && !/^\d+\/\d+$/.test(githubRepoIds)) {
  throw new Error('githubRepoIds must look like ownerId/repoId, for example 37057810/1433870736');
}

// Mail for hello@<domain> goes to the alert address unless -c forwardEmailTo=... says otherwise.
const forwardEmailTo = ctx('forwardEmailTo') || config.alertEmail;
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(forwardEmailTo)) {
  throw new Error('forwardEmailTo (or alertEmail) must be an email address');
}

// Search-engine ownership checks (Google Search Console, Bing Webmaster Tools), as the
// full TXT values, e.g. "google-site-verification=...". They're public, so they live in cdk.json.
const siteVerification: string[] = app.node.tryGetContext('siteVerification') ?? [];
if (!Array.isArray(siteVerification) || siteVerification.some((v) => typeof v !== 'string' || !v.includes('='))) {
  throw new Error('siteVerification must be a list of TXT values like "google-site-verification=..."');
}

new SiteStack(app, 'PersonalSite', {
  // us-east-2 is this account's home region. The certificate is created in us-east-1
  // from inside the stack (see SiteStack).
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' },
  description: `${config.domainName}: S3 + CloudFront + Route 53 + SES mail, deployed from GitHub Actions`,
  ...config,
  githubRepoIds: githubRepoIds || undefined,
  forwardEmailTo,
  siteVerification,
});

cdk.Tags.of(app).add('project', 'personal-site');
