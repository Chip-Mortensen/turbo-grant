import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing env.PINECONE_API_KEY');
}
if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing env.PINECONE_ENVIRONMENT');
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('Missing env.PINECONE_INDEX_NAME');
}

let pineconeClient: Pinecone | null = null;

export async function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export async function initializePineconeIndex() {
  const client = await getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME!;
  
  // List existing indexes
  const indexes = await client.listIndexes();
  
  // Check if our index already exists
  const indexExists = Object.keys(indexes).includes(indexName);
  
  if (!indexExists) {
    // Create the index
    await client.createIndex({
      name: indexName,
      dimension: 3072, // matches text-embedding-3-large
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-west-2'
        }
      }
    });
    
    console.log(`Created Pinecone index: ${indexName}`);
  } else {
    console.log(`Using existing Pinecone index: ${indexName}`);
  }
  
  // Get and return the index
  return client.index(indexName);
} 