require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

async function scanPattern(pattern, limit = 1000) {
  let cursor = '0';
  let keys = [];
  do {
    const res = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = res[0];
    const batch = res[1] || [];
    keys = keys.concat(batch);
  } while (cursor !== '0' && keys.length < limit);
  return keys;
}

(async () => {
  try {
    const playerKeys = await scanPattern('splits:player:*');
    const teamKeys = await scanPattern('splits:team:*');

    console.log(`splits:player:* -> ${playerKeys.length} keys`);
    console.log(`splits:team:*   -> ${teamKeys.length} keys`);

    const sample = (playerKeys[0] || teamKeys[0]);
    if (sample) {
      const val = await redis.get(sample);
      console.log('\nSample key:', sample);
      if (val) {
        const obj = JSON.parse(val);
        console.log('Fields:', Object.keys(obj));
        console.log('Has splits:', !!obj.splits, 'games count:', Array.isArray(obj.games) ? obj.games.length : (obj.games || []).length);
      } else {
        console.log('No value for sample key');
      }
    } else {
      console.log('No splits macro keys found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    redis.disconnect();
  }
})();
