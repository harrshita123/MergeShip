import { Client, Databases, ID, Query } from 'node-appwrite';

// Production-ready: No fallback values - fail fast if env vars missing
if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 
    !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 
    !process.env.APPWRITE_API_KEY) {
  throw new Error('Missing required Appwrite environment variables: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY')
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

export const serverDatabases = new Databases(client);
export { ID, Query };
