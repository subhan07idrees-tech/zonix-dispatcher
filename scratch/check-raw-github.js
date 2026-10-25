async function checkRaw() {
  const r = await fetch('https://raw.githubusercontent.com/subhan07idrees-tech/zonix-website/main/public/zonix.html');
  const t = await r.text();
  console.log('Matches in raw GitHub public/zonix.html:');
  console.log(t.match(/ZONIX-Dispatcher-Setup[^\s"']+/g));
}
checkRaw();
