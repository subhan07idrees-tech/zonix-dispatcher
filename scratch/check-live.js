async function check() {
  try {
    const res1 = await fetch('https://thezonix.com/');
    const text1 = await res1.text();
    console.log('--- https://thezonix.com/ ---');
    console.log('Matches:', text1.match(/ZONIX-Dispatcher-Setup[^\s"']+/g));

    const res2 = await fetch('https://thezonix.com/zonix.html');
    const text2 = await res2.text();
    console.log('--- https://thezonix.com/zonix.html ---');
    console.log('Matches:', text2.match(/ZONIX-Dispatcher-Setup[^\s"']+/g));
  } catch (err) {
    console.error(err);
  }
}
check();
