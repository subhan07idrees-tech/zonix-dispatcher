async function inspectHeaders() {
  const r = await fetch('https://thezonix.com/');
  console.log('--- HEADERS for https://thezonix.com/ ---');
  for (const [k, v] of r.headers.entries()) {
    console.log(`${k}: ${v}`);
  }
}
inspectHeaders();
