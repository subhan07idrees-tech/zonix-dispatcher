async function checkText() {
  const r = await fetch('https://thezonix.com/zonix.html');
  const text = await r.text();
  console.log('Has "The Operating System for Freight Dispatch Teams":', text.includes('The Operating System for Freight Dispatch Teams'));
  console.log('Has "bg-grid-cyber":', text.includes('bg-grid-cyber'));
  console.log('Title:', text.match(/<title>([^<]+)<\/title>/)?.[1]);
  console.log('First 500 chars:');
  console.log(text.slice(0, 500));
}
checkText();
