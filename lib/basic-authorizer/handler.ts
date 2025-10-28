const credentials = process.env

const generatePolicy = (principalId: string, effect: string, resource: string) => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}

export async function main(event: { authorizationToken?: string, methodArn: string }) {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const {authorizationToken = ''} = event;
    if(authorizationToken === '' || !authorizationToken.startsWith('Basic ')) {
      console.log('Invalid or missing Authorization header', authorizationToken);
      return generatePolicy('unknown', 'Deny', event.methodArn);
    }
    const decodedString = Buffer.from(authorizationToken.split(' ')[1], 'base64').toString('utf-8');
    const [username, password] = decodedString.split('=');

    if(!username || !password) {
      console.log('Invalid credentials');
      return generatePolicy('unknown', 'Deny', event.methodArn);
    }

    if(credentials[username] !== password) {
      throw new Error('Unauthorized');
    }

    return generatePolicy(username, 'Allow', event.methodArn);
  } catch (error) {
    console.error('Error:', error);
    return generatePolicy('unknown', 'Deny', event.methodArn);
  }
}
