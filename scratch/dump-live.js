async function dump() {
  const r = await fetch('https://thezonix.com/zonix.html');
  console.log('Headers:');
  for (const [k, v] of r.headers.entries()) {
    console.log(k + ':', v);
  }
  const text = await r.text();
  console.log('Contains v1.9.30?', text.includes('1.9.30'));
  console.log('Contains v1.9.22?', text.includes('1.9.22'));
}
dump();
