const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("typeof input === 'string'")) return;

  const target = 'function imageSize(input) {';
  const replacement = `function imageSize(input) {\n    if (typeof input === 'string') {\n        input = require('fs').readFileSync(input);\n    }`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[patch-image-size] Successfully enabled string path compatibility in:', filePath);
  }
}

const candidates = [
  path.join(__dirname, '..', 'node_modules', 'image-size', 'dist', 'cjs', 'lookup.js'),
  path.join(__dirname, '..', 'node_modules', 'metro', 'node_modules', 'image-size', 'dist', 'cjs', 'lookup.js'),
];

candidates.forEach(patchFile);
