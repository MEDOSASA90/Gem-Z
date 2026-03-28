import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(full));
    } else { 
      if(full.endsWith('.tsx')) results.push(full);
    }
  });
  return results;
}

const files = walk('F:/Gem Z/frontend/src/app');
let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix <style>...</style>
  content = content.replace(/<style>([\s\S]*?)<\/style>/gi, (match, inner) => {
    return `<style dangerouslySetInnerHTML={{ __html: \`${inner.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />`;
  });

  // Self closing <link ...> or <meta ...>
  content = content.replace(/<(link|meta)([^>]*?)>(?!\s*<\/(link|meta)>)/gi, (m, tag, attr) => {
    if (attr.trim().endsWith('/')) return m;
    return `<${tag}${attr} />`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed JSX in ' + file);
    fixedCount++;
  }
});

console.log('Fixed ' + fixedCount + ' files.');

// Double check gem_z_kinetic
const kineticHtml = 'F:/Gem Z/stitch-design/gem_z_kinetic/code.html';
if (fs.existsSync(kineticHtml)) {
   let html = fs.readFileSync(kineticHtml, 'utf8');
   let bodyMatches = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
   let innerHtml = bodyMatches ? bodyMatches[1] : html;
   let jsx = innerHtml
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/\bclass="/g, 'className="')
    .replace(/\bfor="/g, 'htmlFor="')
    .replace(/\btabindex="/g, 'tabIndex="')
    .replace(/\bviewbox="/g, 'viewBox="')
    .replace(/<img([^>]*)>/g, (m, attr) => {
        if (attr.trim().endsWith('/')) return m;
        return `<img${attr} />`;
    })
    .replace(/<input([^>]*)>/g, (m, attr) => {
        if (attr.trim().endsWith('/')) return m;
        return `<input${attr} />`;
    })
    .replace(/<br>/g, '<br />')
    .replace(/<hr>/g, '<hr />')
    .replace(/<style>([\s\S]*?)<\/style>/gi, (match, inner) => {
      return `<style dangerouslySetInnerHTML={{ __html: \`${inner.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />`;
    })
    .replace(/style="([^"]*)"/g, (m, val) => {
      if (val.includes('font-variation-settings')) {
        let isFill = val.includes("'FILL' 1");
        return `style={{ fontVariationSettings: "'FILL' ${isFill ? 1 : 0}" }}`;
      }
      return '';
    });
   
   fs.writeFileSync('F:/Gem Z/frontend/src/app/page.tsx', `import React from 'react';\n\nexport default function Page() {\n  return (\n    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">\n      ${jsx}\n    </div>\n  );\n}\n`);
   console.log('Explicitly forced Gem Z Kinetic to page.tsx');
}
