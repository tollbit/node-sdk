import { TollbitApiClient, TollbitError } from '@tollbit/client';

async function main() {
  // Initialize the client with your configuration
  const client = TollbitApiClient.create({
    apiKey: 'your-api-key-here',
    userAgent: 'MyApp/1.0.0',
    tollbitHost: 'edge.preproduction.tollbit.com',
    debug: true, // Enable debug logging
    knownSites: [
      new URL('https://tollbit.0b1000101.com')
    ]
  });

  try {
    // Example GET request
    console.log('Making GET request...');
    const getResponse = await client.get('https://tollbit.0b1000101.com');
    const getData = await getResponse.text();
    console.log('GET response:', getData);

  } catch (error) {
    if (error instanceof TollbitError) {
      if (error.code === 'MAX_RETRIES_EXCEEDED') {
        console.error('Failed to authenticate after maximum retries');
      } else if (error.code === 'KEY_INIT_FAILED') {
        console.error('API key is missing or invalid');
      } else if (error.code === 'MISSING_USER_AGENT') {
        console.error('User agent is required');
      } else {
        console.error('A Tollbit error occurred:', error.message);
      }
    } else {
      console.error('An unexpected error occurred:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Run the example
main().catch(console.error);
