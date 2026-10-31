// Forwards mail sent to the site's address (hello@...) to a personal inbox.
// SES saves each incoming message to S3, then calls this function with its ID.
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { rewrite } from './rewrite.mjs';

const s3 = new S3Client({});
const ses = new SESv2Client({});
const { BUCKET, PREFIX = '', FORWARD_TO, FROM_ADDRESS, LABEL } = process.env;

export const handler = async (event) => {
  const { mail, receipt } = event.Records[0].ses;
  const log = {
    messageId: mail.messageId,
    spam: receipt.spamVerdict?.status,
    virus: receipt.virusVerdict?.status,
  };

  // Spam and viruses stay in the bucket but don't reach the inbox.
  if (log.spam === 'FAIL' || log.virus === 'FAIL') {
    console.log(JSON.stringify({ ...log, action: 'not forwarded' }));
    return;
  }

  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}${mail.messageId}` }));
  const raw = Buffer.from(await object.Body.transformToByteArray());

  // No FromEmailAddress: SES would replace the rewritten From header with it and drop the
  // sender's name. Without it, SES sends from the From header, which uses FROM_ADDRESS.
  await ses.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [FORWARD_TO] },
      Content: { Raw: { Data: rewrite(raw, { from: FROM_ADDRESS, label: LABEL }) } },
    }),
  );
  console.log(JSON.stringify({ ...log, action: 'forwarded' }));
};
