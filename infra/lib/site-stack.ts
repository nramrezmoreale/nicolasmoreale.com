import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export interface SiteStackProps extends cdk.StackProps {
  /** Apex domain, e.g. nicolasmoreale.com. www.<domain> redirects to it. */
  domainName: string;
  /** ID of the Route 53 hosted zone for the domain (created when you register it in Route 53). */
  hostedZoneId: string;
  /** GitHub repository allowed to deploy, as owner/repo. */
  githubRepo: string;
  /** Only one GitHub OIDC provider can exist per account. Set false if you already have one. */
  createGithubOidcProvider: boolean;
  /** Where budget alerts go. */
  alertEmail: string;
  /** Monthly cost alert threshold for the whole account, in USD. */
  monthlyBudgetUsd: number;
}

/**
 * Static website: private S3 bucket behind CloudFront (origin access control),
 * TLS certificate and DNS in Route 53, a deploy role for GitHub Actions (OIDC,
 * no long-lived keys) and a monthly cost alert.
 */
export class SiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { domainName } = props;
    const wwwName = `www.${domainName}`;

    // DNS and certificate ------------------------------------------------

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: domainName,
    });

    // CloudFront only accepts certificates from us-east-1. This account's organization
    // policy blocks CloudFormation in us-east-1 but allows ACM there, so the stack lives in
    // us-east-2 and a small custom resource requests and DNS-validates the certificate in
    // us-east-1. (DnsValidatedCertificate is deprecated in favour of cross-region stacks,
    // which would need CloudFormation in us-east-1.)
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName,
      subjectAlternativeNames: [wwwName],
      hostedZone: zone,
      region: 'us-east-1',
      cleanupRoute53Records: true,
    });

    // Storage -------------------------------------------------------------

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Edge ----------------------------------------------------------------

    // Viewer-request function: www -> apex, /page -> /page/, /page/ -> /page/index.html
    const router = new cloudfront.Function(this, 'Router', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Redirect www to apex and serve directory index pages',
      code: cloudfront.FunctionCode.fromInline(`
function qs(q) {
  var parts = [];
  for (var key in q) {
    var v = q[key];
    if (v.multiValue) {
      v.multiValue.forEach(function (m) { parts.push(key + '=' + m.value); });
    } else {
      parts.push(key + '=' + v.value);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;

  if (host === '${wwwName}') {
    return redirect('https://${domainName}' + uri + qs(request.querystring));
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    return redirect(uri + '/' + qs(request.querystring));
  }
  return request;
}
`),
    });

    const headers = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      comment: `Security headers for ${domainName}`,
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(730),
          includeSubdomains: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
          override: true,
        },
      },
    });

    const notFound = {
      responseHttpStatus: 404,
      responsePagePath: '/404.html',
      ttl: cdk.Duration.minutes(5),
    };

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: domainName,
      domainNames: [domainName, wwwName],
      certificate,
      defaultRootObject: 'index.html',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: headers,
        compress: true,
        functionAssociations: [
          { function: router, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      // A missing object in a private bucket comes back as 403; show the 404 page for both.
      errorResponses: [
        { httpStatus: 403, ...notFound },
        { httpStatus: 404, ...notFound },
      ],
    });

    const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
    new route53.ARecord(this, 'ApexA', { zone, target });
    new route53.AaaaRecord(this, 'ApexAAAA', { zone, target });
    new route53.ARecord(this, 'WwwA', { zone, recordName: 'www', target });
    new route53.AaaaRecord(this, 'WwwAAAA', { zone, recordName: 'www', target });

    // Deploys from GitHub Actions -------------------------------------------

    const providerArn = props.createGithubOidcProvider
      ? new iam.OidcProviderNative(this, 'GithubOidc', {
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
        }).oidcProviderArn
      : `arn:${this.partition}:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    const deployRole = new iam.Role(this, 'GithubDeployRole', {
      description: `Deploys ${domainName} from ${props.githubRepo} (main branch only)`,
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(providerArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
    });
    bucket.grantReadWrite(deployRole);
    distribution.grantCreateInvalidation(deployRole);

    // Cost alert ----------------------------------------------------------------

    const subscribers = [{ subscriptionType: 'EMAIL', address: props.alertEmail }];
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'monthly-account-budget',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: props.monthlyBudgetUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
      ],
    });

    // Values the GitHub workflow needs --------------------------------------------

    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${domainName}` });
    new cdk.CfnOutput(this, 'SiteBucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'DistributionDomain', { value: distribution.distributionDomainName });
    new cdk.CfnOutput(this, 'DeployRoleArn', { value: deployRole.roleArn });
  }
}
