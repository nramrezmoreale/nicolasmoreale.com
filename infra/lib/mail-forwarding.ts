import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import type * as sns from 'aws-cdk-lib/aws-sns';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface MailForwardingProps {
  zone: route53.IHostedZone;
  /** Mailbox name on the domain, e.g. "hello" for hello@<domain>. */
  mailbox: string;
  /** Personal inbox that receives the forwarded mail. */
  forwardTo: string;
  /** Notified if forwarding starts failing. */
  alerts: sns.ITopic;
}

/**
 * Email for the domain without a mail provider: SES receives mail for <mailbox>@<domain>,
 * keeps a copy in S3 and forwards it to a personal inbox. Messages are sent from the
 * domain with DKIM and a custom MAIL FROM, so they pass SPF, DKIM and DMARC.
 */
export class MailForwarding extends Construct {
  readonly address: string;

  constructor(scope: Construct, id: string, props: MailForwardingProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const { zone } = props;
    const domain = zone.zoneName;
    this.address = `${props.mailbox}@${domain}`;

    // Sending identity: DKIM records and the MAIL FROM domain's MX and SPF records are
    // created in the hosted zone automatically.
    new ses.EmailIdentity(this, 'Domain', {
      identity: ses.Identity.publicHostedZone(zone),
      mailFromDomain: `mail.${domain}`,
    });

    // While the account is in the SES sandbox, SES only delivers to verified addresses.
    // Creating this identity emails a verification link to the personal inbox.
    new ses.EmailIdentity(this, 'ForwardTo', { identity: ses.Identity.email(props.forwardTo) });

    // Mail for the domain is delivered to SES in this region.
    new route53.MxRecord(this, 'Mx', {
      zone,
      values: [{ priority: 10, hostName: `inbound-smtp.${stack.region}.amazonaws.com` }],
    });
    new route53.TxtRecord(this, 'Spf', { zone, values: ['v=spf1 include:amazonses.com ~all'] });
    new route53.TxtRecord(this, 'Dmarc', {
      zone,
      recordName: '_dmarc',
      values: ['v=DMARC1; p=quarantine; adkim=r; aspf=r'],
    });

    // A copy of every message, kept for 90 days.
    const bucket = new s3.Bucket(this, 'Inbox', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const prefix = 'inbox/';

    const forwarder = new lambda.Function(this, 'Forwarder', {
      description: `Forwards mail for ${this.address}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lambda', 'forward-email'),
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BUCKET: bucket.bucketName,
        PREFIX: prefix,
        FROM_ADDRESS: this.address,
        FORWARD_TO: props.forwardTo,
        LABEL: domain,
      },
      logGroup: new logs.LogGroup(this, 'ForwarderLogs', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    bucket.grantRead(forwarder, `${prefix}*`);
    forwarder.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: [stack.formatArn({ service: 'ses', resource: 'identity', resourceName: '*' })],
      }),
    );

    // Receipt rules: scan for spam and viruses, save to S3, then forward.
    const ruleSet = new ses.ReceiptRuleSet(this, 'RuleSet');
    ruleSet.addRule('Forward', {
      recipients: [this.address],
      scanEnabled: true,
      actions: [
        new sesActions.S3({ bucket, objectKeyPrefix: prefix }),
        new sesActions.Lambda({ function: forwarder, invocationType: sesActions.LambdaInvocationType.EVENT }),
      ],
    });

    // CloudFormation can create a rule set but not switch it on; only one can be active per region.
    const activate = {
      service: 'SES',
      action: 'SetActiveReceiptRuleSet',
      parameters: { RuleSetName: ruleSet.receiptRuleSetName },
      physicalResourceId: cr.PhysicalResourceId.of(`${stack.stackName}-active-receipt-rule-set`),
    };
    new cr.AwsCustomResource(this, 'ActivateRuleSet', {
      onCreate: activate,
      onUpdate: activate,
      onDelete: { service: 'SES', action: 'SetActiveReceiptRuleSet', parameters: {} },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({ actions: ['ses:SetActiveReceiptRuleSet'], resources: ['*'] }),
      ]),
      installLatestAwsSdk: false,
    });

    // Tell the owner if mail stops being forwarded. Messages are still saved in the bucket.
    new cloudwatch.Alarm(this, 'ForwarderErrors', {
      alarmDescription: `Mail to ${this.address} is not being forwarded. Messages are still saved in the inbox bucket.`,
      metric: forwarder.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cwActions.SnsAction(props.alerts));

    new cdk.CfnOutput(stack, 'MailInboxBucket', { value: bucket.bucketName });
  }
}
