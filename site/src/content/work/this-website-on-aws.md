---
title: This website and its email, on AWS for about a dollar a month
summary: A static site behind CloudFront, deployed from GitHub with no stored AWS keys, and email on my own domain through SES. All of it defined in AWS CDK, in my own account.
context: My own consulting business
area: Cloud infrastructure
order: 5
stack:
  - AWS CDK
  - CloudFront and S3
  - Route 53 and ACM
  - Amazon SES and Lambda
  - GitHub Actions with OIDC
---

## The situation

I needed a website and an email address for my consulting work. I wanted them built the way I'd build them for a client: everything in code, nothing clicked together by hand, no long-lived keys anywhere, and a bill small enough to forget about.

## What I built

- **Hosting.** The site is static, built with Astro. It sits in a private S3 bucket that only CloudFront can read, through origin access control. A CloudFront Function redirects `www` to the main domain and serves clean URLs. Security headers (HSTS, a content security policy, no framing) are set at the edge.
- **Domain and TLS.** The domain is registered in Route 53, and the certificate comes from ACM, validated through DNS in the same hosted zone.
- **Deployments.** Every push to the main branch builds the site in GitHub Actions and syncs it to S3. Hashed assets are cached for a year and pages for five minutes, and the CloudFront cache is cleared at the end. GitHub signs in to AWS with OIDC, through a role that only trusts the main branch of this repository and can only touch this bucket and clear this distribution's cache. No AWS keys are stored in GitHub.
- **Email.** SES receives mail for `hello@` on the domain, scans it for spam and viruses, and keeps a copy in S3 for 90 days. A small Lambda function forwards it to my inbox, rewriting the sender as "Name via nicolasmoreale.com" with the original address as Reply-To, so replying just works. DKIM, a custom MAIL FROM domain and a DMARC policy mean forwarded mail passes SPF, DKIM and DMARC.
- **Guardrails.** A CloudWatch alarm emails me if forwarding ever fails, and an AWS Budgets alert emails me if the month's spend heads past five dollars.

## Three things that didn't go by the book

- **The certificate region.** CloudFront only accepts certificates from us-east-1, but this account's organization policy blocks CloudFormation there. The stack lives in us-east-2 and uses a small custom resource to request and validate the certificate in us-east-1, which the policy does allow.
- **GitHub's new OIDC subject.** The usual trust policy matches `repo:owner/repo:ref:refs/heads/main`. This repository sends an ID-based subject instead, with the owner and repository IDs in it, so the first deploy was refused. The role now trusts both forms. The ID-based one is safer, because it can't be reused if the repository is renamed or deleted.
- **Sender names disappearing.** The first forwarded emails arrived from a bare `hello@` address. SES's `SendEmail` call replaces the message's From header when you also pass a From address, which wiped the rewritten sender name. Leaving that parameter out for raw messages fixed it. The header rewrite now has its own unit tests.

## Outcome

- About a dollar a month: fifty cents for the hosted zone and pennies for S3, CloudFront and SES, plus the yearly domain renewal.
- A change to the site is live about twenty seconds after it's pushed.
- Mail to `hello@` arrives in seconds and lands in the inbox, not spam.
- The whole setup is reproducible from the [source code](https://github.com/nramrezmoreale/nicolasmoreale.com): one CDK stack and two GitHub workflows.
