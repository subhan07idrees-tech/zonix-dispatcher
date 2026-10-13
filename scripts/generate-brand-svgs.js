const fs = require('fs');

fs.mkdirSync('assets/brand', { recursive: true });
fs.mkdirSync('src/renderer/public/brand', { recursive: true });

function makeSvg(slateColor, cobaltColor) {
  return `<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H150L57 120L0 150L22 120L89 30H0V0Z" fill="${slateColor}"/>
  <path d="M57 120H150V150H0L57 120Z" fill="${cobaltColor}"/>
</svg>`;
}

function makeMonoSvg(color) {
  return `<svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H150L57 120H150V150H0L22 120L89 30H0V0Z" fill="${color}"/>
</svg>`;
}

// 1. Light mark
const markLight = makeSvg('#3B4A63', '#2447D6');
fs.writeFileSync('assets/brand/zonix-mark.svg', markLight);
fs.writeFileSync('src/renderer/public/brand/zonix-mark.svg', markLight);

// 2. Reverse (dark background) mark
const markDark = makeSvg('#AEB9CC', '#5B7CFF');
fs.writeFileSync('assets/brand/zonix-mark-reverse.svg', markDark);
fs.writeFileSync('src/renderer/public/brand/zonix-mark-reverse.svg', markDark);

// 3. Mono ink
const markMonoInk = makeMonoSvg('#14161B');
fs.writeFileSync('assets/brand/zonix-mark-mono-ink.svg', markMonoInk);
fs.writeFileSync('src/renderer/public/brand/zonix-mark-mono-ink.svg', markMonoInk);

// 4. Mono white
const markMonoWhite = makeMonoSvg('#FFFFFF');
fs.writeFileSync('assets/brand/zonix-mark-mono-white.svg', markMonoWhite);
fs.writeFileSync('src/renderer/public/brand/zonix-mark-mono-white.svg', markMonoWhite);

console.log('All brand SVGs generated successfully in assets/brand and src/renderer/public/brand');
