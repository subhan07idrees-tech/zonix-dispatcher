async function testBust() {
  const t = Date.now();
  const r = await fetch(`https://thezonix.com/zonix.html?t=${t}`, {
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
  });
  console.log('CF Cache Status:', r.headers.get('cf-cache-status'));
  const text = await r.text();
  console.log('Matches:', text.match(/ZONIX-Dispatcher-Setup[^\s"']+/g));
}
testBust();
