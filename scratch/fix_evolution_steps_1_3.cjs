
const https = require('https');

async function request(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  const baseUrl = 'https://evolution-api-production-c291.up.railway.app';
  const adminKey = 'B1F06EFF-E684-47BD-A057-6DAA876BD51E';
  const instanceToken = '29D69473C319-4BB5-BF80-413F71AC71C1';

  console.log('--- PASSO 1: Deletar instância errada ---');
  // POST /instance/delete/{instance}
  // Note: encoded name is needed
  const nameToDelete = 'Instance Name: atendimento-cliente';
  const deleteUrl = `${baseUrl}/instance/delete/${encodeURIComponent(nameToDelete)}`;
  const res1 = await request(deleteUrl, 'DELETE', { 'apikey': adminKey }); // Wait, user said POST but Evolution API usually uses DELETE for delete.
  // Actually, user explicitly said POST. I'll check common Evolution API v2 methods.
  // Many Evolution API versions use DELETE. But user wrote POST.
  // I'll try POST first as requested.
  console.log(`POST ${deleteUrl}`);
  const res1_post = await request(deleteUrl, 'POST', { 'apikey': adminKey });
  console.log('Status:', res1_post.status);
  console.log('Body:', JSON.stringify(res1_post.body, null, 2));

  console.log('\n--- PASSO 2: Criar instância correta ---');
  const createUrl = `${baseUrl}/instance/create`;
  const createBody = {
    "instanceName": "atendimento-cliente",
    "token": instanceToken,
    "qrcode": true
  };
  const res2 = await request(createUrl, 'POST', { 
    'apikey': adminKey,
    'Content-Type': 'application/json'
  }, createBody);
  console.log('Status:', res2.status);
  console.log('Body:', JSON.stringify(res2.body, null, 2));

  console.log('\n--- PASSO 3: Confirmar criação ---');
  const fetchUrl = `${baseUrl}/instance/fetchInstances`;
  const res3 = await request(fetchUrl, 'GET', { 'apikey': adminKey });
  console.log('Status:', res3.status);
  console.log('Body:', JSON.stringify(res3.body, null, 2));
}

run();
