
import { STSClient } from "@aws-sdk/client-sts";
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AssumeRoleCommand } from "@aws-sdk/client-sts";
import { SQS } from "@aws-sdk/client-sqs";
import { config } from 'dotenv';
import { existsSync, readFileSync } from "fs";
import AWS, { S3 } from "aws-sdk";
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

  //
  // SQS purge
  if (arg.includes('--purge')) {
    await producer.purgeQueue({ QueueUrl: process.env.AWS_SQS_LINK });
    console.log('Queue purged successfully');
  }
  //
  //SQS create new queue
  else if (arg.includes('--create')) {
    const nIndex = arg.indexOf('--create');
    if (nIndex > -1) {
      const sqs = new SQS({
        region: REGION,
        credentials: await assumeRole()
      })
      await sqs.createQueue({ QueueName: arg[nIndex + 1] });
    } else throw new Error('Queue name is required');
  }
  //
  // SQS get attributes of queue
  else if (arg.includes('--attributes')) { 
    const result = await producer.getQueueAttributes({ QueueUrl: process.env.AWS_SQS_LINK, AttributeNames: ['All'] });
    if (!result?.Attributes) throw new Error('Attributes not found');
    console.log('SQS Attributes:');
    for (const att in result.Attributes) {
      console.log(`\x1b[36m${att}: \x1b[32m ${result.Attributes[att]}`);
    }
  }
  //
  // S3 list objects
  else if (arg.includes('--s3-list')) {
    const bucked = arg[arg.indexOf('--s3-list') + 1];
    const s3 = new S3({
      region: REGION, credentials: new AWS.SharedIniFileCredentials({
        profile: process.env.AWS_PROFILE,
      })
    });
    const data = await s3.listObjectsV2({ Bucket: bucked }).promise()
    console.log('S3 Objects:\n' + data.Contents?.map((item) => item.Key).join('\n'));
  }
  //
  // SQS send message by template
  else {
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