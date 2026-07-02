const { Client } = require('ssh2');

const VPS_IP = '76.13.196.51';
const VPS_USER = 'root';
const VPS_PASS = 'KENnEDY1899@2003@';

const SUPABASE_URL = 'https://jlkmrmdfvfobvneqgjya.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_CJ1q9Hdv4_k6aK8VdtReWA_zElr42NH';
const SUPABASE_ANON_KEY = 'sb_publishable_xECF4jmO811QEG3s0MMrgg_fiwQuEQC';
const REPO_URL = 'https://github.com/Kennedyjoshchuang/OTLSystem.git';
const APP_DIR = '/var/www/otlsystem';

function runSSH(conn, command, ignoreError = false) {
  return new Promise((resolve, reject) => {
    let output = '';
    conn.exec(command, (err, stream) => {
      if (err) return ignoreError ? resolve('') : reject(err);
      stream.on('data', d => {
        const t = d.toString();
        output += t;
        process.stdout.write(t);
      });
      stream.stderr.on('data', d => {
        process.stderr.write(d.toString());
      });
      stream.on('close', () => resolve(output));
    });
  });
}

async function deploy(conn) {
  console.log('\n🚀 Starting VPS deployment...\n');

  console.log('\n📦 Step 1: Installing Node.js 20...');
  await runSSH(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -', true);
  await runSSH(conn, 'apt-get install -y nodejs', true);
  const nodeVer = await runSSH(conn, 'node --version');
  console.log('Node:', nodeVer.trim());

  console.log('\n📦 Step 2: Installing PM2 and Nginx...');
  await runSSH(conn, 'npm install -g pm2 2>/dev/null || true', true);
  await runSSH(conn, 'apt-get install -y nginx 2>/dev/null || true', true);

  console.log('\n📥 Step 3: Cloning/updating repository...');
  const exists = await runSSH(conn, `[ -d ${APP_DIR}/.git ] && echo YES || echo NO`);
  const branch = "OTL-(Version-2-Revision)";
  if (exists.includes('YES')) {
    await runSSH(conn, `cd ${APP_DIR} && git fetch origin && git checkout "${branch}" && git reset --hard "origin/${branch}"`, true);
  } else {
    await runSSH(conn, `mkdir -p /var/www && git clone -b "${branch}" ${REPO_URL} ${APP_DIR}`, true);
  }

  console.log('\n📦 Step 4: Installing npm dependencies...');
  await runSSH(conn, `cd ${APP_DIR} && npm install`, true);

  console.log('\n🔑 Step 5: Writing .env file...');
  await runSSH(conn, `printf 'SUPABASE_URL=${SUPABASE_URL}\\nSUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}\\nSUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}\\nPORT=5000\\nNODE_ENV=production\\n' > ${APP_DIR}/.env`);

  console.log('\n🔨 Step 6: Building frontend...');
  await runSSH(conn, `cd ${APP_DIR} && npm run build`, true);

  console.log('\n⚙️  Step 7: Starting PM2 backend...');
  await runSSH(conn, `pm2 delete otl-backend 2>/dev/null; true`, true);
  await runSSH(conn, `cd ${APP_DIR} && pm2 start server/index.cjs --name otl-backend`);
  await runSSH(conn, `pm2 save`);
  await runSSH(conn, `pm2 startup | tail -1 | bash 2>/dev/null; true`, true);

  console.log('\n🌐 Step 8: Configuring Nginx...');
  const nginx = `server {
    listen 80;
    server_name _;
    root ${APP_DIR}/dist;
    index index.html;
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50m;
        proxy_read_timeout 300s;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}`;
  await runSSH(conn, `echo '${nginx}' > /etc/nginx/sites-available/otlsystem`);
  await runSSH(conn, `ln -sf /etc/nginx/sites-available/otlsystem /etc/nginx/sites-enabled/`);
  await runSSH(conn, `rm -f /etc/nginx/sites-enabled/default`);
  await runSSH(conn, `nginx -t && systemctl restart nginx && systemctl enable nginx`);

  const pm2 = await runSSH(conn, `pm2 list`);
  const ng = await runSSH(conn, `systemctl is-active nginx`);

  console.log('\n\n🎉 ============================================================');
  console.log(`✅ DEPLOYMENT COMPLETE!`);
  console.log(`🌐 Website: http://${VPS_IP}`);
  console.log(`📡 API:     http://${VPS_IP}:5000`);
  console.log(`☁️  DB:      Supabase (cloud - no SQLite!)`);
  console.log(`🔄 PM2 auto-restarts backend if it crashes`);
  console.log('=============================================================\n');
}

const conn = new Client();
conn
  .on('ready', () => {
    console.log('✅ SSH connected!');
    deploy(conn).then(() => conn.end()).catch(e => { console.error('❌', e); conn.end(); process.exit(1); });
  })
  .on('error', err => {
    console.error('❌ SSH error:', err.message, err.level);
    process.exit(1);
  })
  .connect({
    host: VPS_IP,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS,
    readyTimeout: 60000,
    tryKeyboard: true
  })
  .on('keyboard-interactive', (n, i, l, prompts, finish) => {
    console.log('Keyboard-interactive prompt received, sending password...');
    finish([VPS_PASS]);
  });
