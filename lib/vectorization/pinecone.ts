import { PineconeClient } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing env.PINECONE_API_KEY');
}
if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing env.PINECONE_ENVIRONMENT');
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('Missing env.PINECONE_INDEX_NAME');
}

let pineconeClient: PineconeClient | null = null;

export async function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new PineconeClient();
    await pineconeClient.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

export async function initializePineconeIndex() {
  const client = await getPineconeClient();
  
  // List existing indexes
  const indexes = await client.listIndexes();
  
  // Check if our index already exists
  if (!indexes.includes(process.env.PINECONE_INDEX_NAME!)) {
    // Create the index
    await client.createIndex({
      name: process.env.PINECONE_INDEX_NAME!,
      dimension: 3072, // matches text-embedding-3-large
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-west-2'
        }
      }
    });
    
    console.log(`Created Pinecone index: ${process.env.PINECONE_INDEX_NAME}`);
  } else {
    console.log(`Using existing Pinecone index: ${process.env.PINECONE_INDEX_NAME}`);
  }
  
  // Get and return the index
  return client.Index(process.env.PINECONE_INDEX_NAME);
} 