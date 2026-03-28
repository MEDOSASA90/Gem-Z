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

const svgAttrs = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stop-color', 'stop-opacity', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule', 'clip-path', 'vector-effect'];

walk('F:/Gem Z/frontend/src/app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  c = c.replace(/\bchecked(?:="")?/g, 'defaultChecked');
  c = c.replace(/<lineargradient/gi, '<linearGradient');
  c = c.replace(/<\/lineargradient>/gi, '</linearGradient>');
  
  // TabIndex
  c = c.replace(/\btabindex="/gi, 'tabIndex="');
  
  // rows="x"
  c = c.replace(/\brows="(\d+)"/g, 'rows={$1}');
  c = c.replace(/\bmaxlength="(\d+)"/gi, 'maxLength={$1}');

  svgAttrs.forEach(attr => {
     let camel = attr.split('-').map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join('');
     let regex = new RegExp(attr + '=', 'gi');
     c = c.replace(regex, camel + '=');
  });

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Fixed TS in ' + f);
  }
});
