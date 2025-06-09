const redisCache = require("./dist/services/redisCache");

console.log("Redis client initialized");
console.log("==== Redis Configuration ====");
console.log("HOST:", process.env.REDIS_HOST || 'localhost');
console.log("PORT:", process.env.REDIS_PORT || '6379');
console.log("AUTH_MODE:", process.env.REDIS_AUTH_MODE || 'key');
console.log("TLS:", process.env.REDIS_TLS || 'false');

// Test connection with a ping
async function testConnection() {
  try {
    console.log("\nTesting Redis connection with PING...");
    const result = await redisCache.default.ping();
    console.log("Connection successful:", result);
    
    // Test storing and retrieving data
    console.log("\nTesting cache operations...");
    await redisCache.default.cacheData("test-key", { value: "test-value" }, 1);
    const data = await redisCache.default.getCachedData("test-key");
    console.log("Retrieved data:", data);
    
    process.exit(0);
  } catch (error) {
    console.error("Redis test failed:", error);
    process.exit(1);
  }
}

testConnection();
