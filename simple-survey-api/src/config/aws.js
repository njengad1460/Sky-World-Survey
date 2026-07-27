const { S3Client } = require("@aws-sdk/client-s3");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Note: Environment variables come from Docker compose or process.env
// No need to call dotenv.config() in Docker containers

const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
};

// Only explicitly set credentials if they are provided in the environment.
// Otherwise, allow the AWS SDK to automatically use the EC2 IAM Instance Profile.
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

// Only initialize JWT verifier if Cognito credentials are provided
let jwtVerifier = null;
if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
  jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    tokenUse: "id",
    clientId: process.env.COGNITO_CLIENT_ID,
  });
}

module.exports = {
  s3Client,
  jwtVerifier,
};