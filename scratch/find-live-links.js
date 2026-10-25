async function findLinks() {
  const r = await fetch('https://thezonix.com/zonix.html');
  const text = await r.text();
  const lines = text.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('1.9.')) {
      console.log(`Line ${idx+1}: ${l.trim()}`);
    }
  });
}
findLinks();
