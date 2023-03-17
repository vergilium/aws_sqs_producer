
import { STSClient } from "@aws-sdk/client-sts";
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AssumeRoleCommand } from "@aws-sdk/client-sts";
import { SQS } from "@aws-sdk/client-sqs";
import { config } from 'dotenv';
import { existsSync, readFileSync } from "fs";
config({path: './.env'});

const REGION = process.env.AWS_REGION;
const client = new STSClient({ region: REGION });

const assumeRole = async () => {
  try {
    const command = new AssumeRoleCommand({
      RoleArn: process.env.AWS_ROLEARN,
      RoleSessionName: process.env.AWS_ROLE_SESSION_NAME,
      DurationSeconds: 900,
    });
    const response = await client.send(command);
    return {
      accessKeyId: response.Credentials?.AccessKeyId,
      secretAccessKey: response.Credentials?.SecretAccessKey,
      sessionToken: response.Credentials?.SessionToken
    } as AwsCredentialIdentity;
  } catch (err) {
    console.error(err);
  }
};

(async (arg) => {
  // create simple producer
  const producer = new SQS({
    endpoint: process.env.AWS_SQS_LINK,
    region: REGION,
    credentials: await assumeRole()
  })

  if (arg.includes('--purge')) {
    await producer.purgeQueue({ QueueUrl: process.env.AWS_SQS_LINK });
    console.log('Queue purged successfully');
    
  } else {
    const fIndex = arg.indexOf('--template');
    let file;
    if (fIndex > -1) {
      const path = arg[fIndex + 1];
      if (existsSync(path)) {
        file = readFileSync(path).toString();
      } else throw new Error('Template file is not exist')
    } else throw new Error('Template file is required')

    await producer.sendMessage(
      Object.assign(
        JSON.parse(file),
        { QueueUrl: process.env.AWS_SQS_LINK }
      )
    );
    console.log('The message sent');
    
  }
})(process.argv)