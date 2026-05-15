
const https = require('https');

async function getJson(url, apikey) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'apikey': apikey }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function run() {
  const baseUrl = 'https://evolution-api-production-c291.up.railway.app';
  const key1 = 'B1F06EFF-E684-47BD-A057-6DAA876BD51E'; // mtsolar
  const key2 = '29D69473C319-4BB5-BF80-413F71AC71C1'; // atendimento-cliente

  console.log('--- Fetch with Key 1 (mtsolar) ---');
  const res1 = await getJson(`${baseUrl}/instance/fetchInstances`, key1);
  console.log(JSON.stringify(res1, null, 2));

  console.log('\n--- Fetch with Key 2 (atendimento-cliente) ---');
  const res2 = await getJson(`${baseUrl}/instance/fetchInstances`, key2);
  console.log(JSON.stringify(res2, null, 2));
}

run();
