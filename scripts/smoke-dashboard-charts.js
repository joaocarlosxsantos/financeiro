const http = require('http');

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || '3000';

const year = process.argv[2] || (new Date()).getFullYear();
const month = process.argv[3] || (new Date()).getMonth() + 1;
const path = `/api/dashboard/charts?year=${year}&month=${month}`;

const options = {
  hostname: host,
  port,
  path,
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const keys = ['summary','dailyByCategory','dailyByWallet','dailyByTag','monthlyData','topExpenseCategories'];
      const missing = keys.filter(k => !(k in json));
      if (missing.length) {
        console.error('Missing keys in response:', missing);
        process.exitCode = 2;
        return;
      }
      console.log('OK: keys present. Summary keys:', Object.keys(json.summary || {}));
      process.exitCode = 0;
    } catch (e) {
      console.error('Response is not valid JSON', e.message);
      process.exitCode = 3;
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e.message);
  process.exitCode = 4;
});
req.end();
