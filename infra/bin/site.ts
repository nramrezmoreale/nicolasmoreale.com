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

new SiteStack(app, 'PersonalSite', {
  // us-east-2 is this account's home region. The certificate is created in us-east-1
  // from inside the stack (see SiteStack).
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' },
  description: `${config.domainName}: S3 + CloudFront + Route 53, deployed from GitHub Actions`,
  ...config,
});

cdk.Tags.of(app).add('project', 'personal-site');
