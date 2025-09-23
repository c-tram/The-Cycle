require('dotenv').config();
const Redis = require('ioredis');

const key = process.argv[2];
if (!key) {
  console.error('Usage: node scripts/getRedisKey.cjs <redis-key>');
  process.exit(1);
}

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

(async () => {
  try {
    const val = await redis.get(key);
    if (!val) {
      console.log('(nil)');
    } else {
      try {
        const obj = JSON.parse(val);
        console.log(JSON.stringify(obj, null, 2));
      } catch {
        console.log(val);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    redis.disconnect();
  }
})();
