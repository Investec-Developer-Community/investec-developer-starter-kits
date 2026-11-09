const originalFetch = globalThis.fetch;
if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile = () => {};
}

globalThis.fetch = async (input, init) => {
  if (process.env.TEST_FETCH_MODE === 'deny') {
    throw new Error('This test must not make any network requests.');
  }
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Tests permit HTTP requests only to a local fake server.');
  }
  return originalFetch(input, init);
};
