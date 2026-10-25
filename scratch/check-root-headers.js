async function checkRoot() {
  const r = await fetch('https://thezonix.com/', { redirect: 'manual' });
  console.log('Status:', r.status);
  for (const [k, v] of r.headers.entries()) {
    console.log(k + ':', v);
  }
}
checkRoot();
