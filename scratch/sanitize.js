const fs = require('fs');
const filePath = 'src/services/email.js';
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('gcqedtxkounkyxzs') || content.includes('vxsptoejkthmqooj')) {
    content = content.replace(/'gcqedtxkounkyxzs'/g, "''");
    content = content.replace(/'vxsptoejkthmqooj'/g, "''");
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
