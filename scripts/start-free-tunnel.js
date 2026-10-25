const { spawn } = require('child_process');
const http = require('http');

console.log('====================================================');
console.log('🚀 ZONIX FREE REMOTE TUNNEL LAUNCHER');
console.log('====================================================\n');

// 1. Check if local backend is active
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:4000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startTunnel() {
  const backendRunning = await checkBackend();
  
  if (!backendRunning) {
    console.log('[Tunnel] Starting local backend server on port 4000...');
    const backendProcess = spawn('cmd.exe', ['/c', 'npm run dev:backend'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    // Wait 4 seconds for backend server to boot up
    await new Promise(r => setTimeout(r, 4000));
  } else {
    console.log('[Tunnel] Backend is already running on port 4000.');
  }

  console.log('\n[Tunnel] Establishing free public HTTPS tunnel for remote dispatchers...');
  
  const tunnelProcess = spawn('cmd.exe', ['/c', 'npx -y localtunnel --port 4000 --subdomain zonix-dispatcher-tunnel'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  tunnelProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Tunnel Output]: ${output.trim()}`);
    if (output.includes('url is:')) {
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        const publicUrl = urlMatch[0];
        const wsUrl = publicUrl.replace('https://', 'wss://') + '/ws';
        console.log('\n====================================================');
        console.log('✅ FREE REMOTE SERVER TUNNEL ACTIVE!');
        console.log('====================================================');
        console.log(`🌐 Public API URL:  ${publicUrl}`);
        console.log(`📡 Public WSS URL:  ${wsUrl}`);
        console.log('----------------------------------------------------');
        console.log('Share this URL with your 2-3 testing dispatchers!');
        console.log('They can log in from any computer over the internet.');
        console.log('====================================================\n');
      }
    }
  });

  tunnelProcess.stderr.on('data', (data) => {
    console.log(`[Tunnel]: ${data.toString().trim()}`);
  });
}

startTunnel();
