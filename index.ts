
import { STSClient } from "@aws-sdk/client-sts";
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AssumeRoleCommand } from "@aws-sdk/client-sts";
import { SQS } from "@aws-sdk/client-sqs";
import { config } from 'dotenv';
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

(async () => {
  // create simple producer
  const producer = new SQS({
    endpoint: process.env.AWS_SQS_LINK,
    region: REGION,
    credentials: await assumeRole()
  })


  producer.sendMessage(
    {
      MessageBody: JSON.stringify({
        user: 'Alexei',
        owner: 'Kim Melcher',
        project: 'Test project',
        client: 'Test client',
        task: 'TEst task',
        milestone: 'Test stage',
        due: 'Jun 23 2023',
        view: 'https://qa.focalpointprocurement.com/projects/b39f8346-3a48-4a67-9f62-bca0f728de81/milestones/840ea618-3a67-4941-9417-6681ce0fb0fe/tasks/522a070f-c485-4811-ac27-29c87f80a0a1'
      }),
      MessageAttributes: {
        channel: {
          StringValue: 'slack',
          DataType: 'String',
        },
        subject: {
          StringValue: 'Task Assigned',
          DataType: 'String',
        },
        template: {
          StringValue: '88ac69ad-0cef-4e57-a166-fb88e290f09c',
          DataType: 'String',
        },
        to: {
          DataType: 'String',
          StringValue: 'alexei@getfocalpoint.com'
        },
      },
      QueueUrl: process.env.AWS_SQS_LINK
    }
  );
})()