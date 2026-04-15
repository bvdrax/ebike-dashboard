/**
 * Runs a local OAuth callback server to get Strava tokens.
 * Usage: STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy node scripts/get_strava_token.js
 */
const http = require('http');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: STRAVA_CLIENT_ID=xxx STRAVA_CLIENT_SECRET=yyy node scripts/get_strava_token.js');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:9876';
const authUrl =
  `https://www.strava.com/oauth/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&approval_prompt=force` +
  `&scope=read,activity:read_all`;

console.log('\n1. Open this URL in your browser (log in as the athlete you want to track):\n');
console.log('   ' + authUrl);
console.log('\n2. After authorizing, your browser will redirect to localhost. Waiting...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:9876');
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('No code in URL. Try the authorization link again.');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body style="font-family:sans-serif;padding:2rem"><h2>✓ Success!</h2><p>Check your terminal.</p></body></html>');

  try {
    const tokenResp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenResp.json();

    if (!data.refresh_token) {
      console.error('Error from Strava:', data);
      server.close();
      return;
    }

    console.log('✓ Authorization successful!\n');
    console.log('Add these to your .env:\n');
    console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
    console.log(`LACHLAN_STRAVA_ID=${data.athlete?.id}`);
    console.log(`\nAthlete: ${data.athlete?.firstname} ${data.athlete?.lastname} (id: ${data.athlete?.id})`);
  } catch (err) {
    console.error('Error exchanging code:', err.message);
  }

  server.close();
});

server.listen(9876, () => {
  console.log('   (Listening on port 9876 for Strava redirect...)\n');
});
