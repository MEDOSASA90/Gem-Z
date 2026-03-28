import fs from 'fs';
import path from 'path';

function walk(dir) {
  let r = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) r = r.concat(walk(full));
    else if (full.endsWith('.tsx') && !full.includes('layout.tsx')) r.push(full);
  });
  return r;
}

const files = walk('F:/Gem Z/frontend/src/app');

let dictionary = {};

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  // Skip if already has t() mapping to avoid double wrapping
  if (c.includes('const { t } = useLanguage()')) return;

  // Add use client
  if (!c.includes("'use client'") && !c.includes('"use client"')) {
      c = "'use client';\n" + c;
  }

  // Count depth to context
  let depth = (f.split(/\\|\//).length - 'F:/Gem Z/frontend/src/app'.split('/').length);
  let prefix = depth === 1 ? '../' : depth === 2 ? '../../' : '../../../';
  
  if (!c.includes('useLanguage')) {
      c = c.replace(/import React/, `import React`);
      c = c.replace(/(import [^;]+;\n)(?!import)/, `$1import { useLanguage } from '${prefix}context/LanguageContext';\n`);
  }

  // Find the component export to inject hook
  c = c.replace(/export default function ([a-zA-Z0-9_]+)\s*\([^)]*\)\s*{/g, "export default function $1() {\n    const { t } = useLanguage();");

  // Recursively find text nodes > text <
  c = c.replace(/>\s*([a-zA-Z][a-zA-Z0-9_&\-.,!?'"/:() ]{2,})\s*</g, (match, p1) => {
      let t = p1.trim();
      
      // Skip common icons that got missed by auto-linker
      if (['smart_toy', 'psychology', 'restaurant', 'bolt', 'gavel', 'military_tech', 'home', 'shopping_bag', 'group', 'account_balance_wallet', 'notifications', 'settings', 'more_vert', 'mic', 'send', 'add_circle', 'trending_up', 'account_balance', 'fitness_center', 'search'].includes(t)) {
          return match;
      }
      
      // Skip if it contains react brace
      if (t.includes('{') || t.includes('}')) return match;

      dictionary[t] = t;
      let escaped = t.replace(/"/g, '\\"');
      return `>{t("${escaped}")}<`;
  });

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Extracted strings for: ' + f);
  }
});

fs.writeFileSync('F:/Gem Z/frontend/src/lib/en.json', JSON.stringify(dictionary, null, 2));
console.log('Total unique strings extracted:', Object.keys(dictionary).length);
