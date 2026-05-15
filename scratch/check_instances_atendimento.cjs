
const https = require('https');

function checkInstances() {
  const url = 'https://evolution-api-production-c291.up.railway.app/instance/fetchInstances';
  const apikey = '29D69473C319-4BB5-BF80-413F71AC71C1';

  const options = {
    headers: {
      'apikey': apikey
    }
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log(data);
      }
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

checkInstances();
