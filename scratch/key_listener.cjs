const http = require('http');
const fs = require('fs');
let capturedKeys = {};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/keys') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        capturedKeys = JSON.parse(body);
        fs.writeFileSync('supabase_keys.json', body);
        console.log('>>> Keys received and saved to supabase_keys.json <<<');
        console.log(body);
      } catch(e) {}
      res.writeHead(200);
      res.end('OK');
    });
  } else if (req.method === 'GET' && req.url === '/get-keys') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(capturedKeys));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(7777, () => {
  console.log('Key listener running on http://localhost:7777');
  console.log('Waiting for keys from browser... Open scratch/get_supabase_keys.html');
});
