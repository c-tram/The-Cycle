// Jest setup file for handling environment-specific configuration
console.log('Setting up Jest environment...');

// Detect if we're running in CI
const isCI = process.env.CI === 'true' || process.env.AZURE_PIPELINE === 'true';
if (isCI) {
  console.log('Detected CI environment - adjusting test configuration...');
  
  // Set timeout higher for all tests in CI
  jest.setTimeout(60000); // Increased timeout for CI environment
  
  // Make sure CI env var is available to tests
  process.env.CI = 'true';
  
  // Configure mock endpoints for network-dependent tests in CI
  process.env.USE_MOCK_DATA = 'true';
  process.env.SKIP_CACHE_VALIDATION = 'true';
  process.env.SKIP_LOCALHOST_TESTS = 'true';
  
  console.log('CI test configuration applied - using mock data where appropriate.');
} else {
  console.log('Running in local environment.');
  
  // For local runs, we'll use a lower timeout
  jest.setTimeout(30000);
}

// Setup global error handler to improve debugging
if (isCI) {
  // More detailed error logging in CI 
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// Detect system memory to adjust test behavior in limited environments
const os = require('os');
const totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;
if (totalMemoryGB < 4) {
  console.warn(`Low memory environment detected (${totalMemoryGB.toFixed(1)}GB) - some tests may be skipped or modified`);
  process.env.LOW_MEMORY = 'true';
}
