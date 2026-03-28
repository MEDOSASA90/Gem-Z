import fs from 'fs';
import path from 'path';

function walk(dir) {
  let r = [];
  fs.readdirSync(dir).forEach(f => {
    let full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) r = r.concat(walk(full));
    else if (full.endsWith('.tsx')) r.push(full);
  });
  return r;
}

let count = 0;
walk('F:/Gem Z/frontend/src/app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  // Revert the incorrect self-closing of Next.js Link tags
  let fixed = c.replace(/<Link([^>]*?)\s*\/\>/ig, '<Link$1>');
  if (c !== fixed) {
    fs.writeFileSync(f, fixed);
    console.log('Fixed Links in ' + f);
    count++;
  }
});
console.log('Total files fixed: ' + count);
