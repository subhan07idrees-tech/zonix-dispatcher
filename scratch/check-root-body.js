async function checkRootBody() {
  const r = await fetch('https://thezonix.com/');
  const text = await r.text();
  console.log('Matches on /:');
  console.log(text.match(/ZONIX-Dispatcher-Setup[^\s"']+/g));
  console.log('Matches for 1.9:');
  text.split('\n').forEach((l, i) => {
    if (l.includes('1.9.')) console.log(`L${i+1}: ${l.trim()}`);
  });
}
checkRootBody();
