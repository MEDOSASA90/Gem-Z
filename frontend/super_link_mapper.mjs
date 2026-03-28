import fs from 'fs';
import path from 'path';

function walk(dir) {
  let r = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) r = r.concat(walk(full));
    else if (full.endsWith('.tsx')) r.push(full);
  });
  return r;
}

const files = walk('F:/Gem Z/frontend/src/app');

// Keywords to routes mapping mapping with strong English and Arabic heuristics
const routeMap = [
  { match: /login|sign in|دخول/i, route: '/login' },
  { match: /register|get started|join|apply|تسجيل|اشتراك/i, route: '/register' },
  { match: /coach|smart_toy|psychology|مدرب/i, route: '/ai-coach' },
  { match: /shop|shopping|store|متجر/i, route: '/shop' },
  { match: /squad|group|team|فرق/i, route: '/squads' },
  { match: /wallet|account_balance|محفظة/i, route: '/wallet' },
  { match: /feed|social|dynamic_feed|مجتمع/i, route: '/social' },
  { match: /challenge|military_tech|leaderboard|ranking|تحدي/i, route: '/challenges' },
  { match: /home|الرئيسية/i, route: '/trainee' },
  { match: /admin|person|profile|إدارة/i, route: '/admin' },
  { match: /progress|activity|tracking|تقدم/i, route: '/progress' },
  { match: /auction|bid|gavel|مزاد/i, route: '/bidding' },
  { match: /gym|صالة/i, route: '/gym' },
  { match: /trainer|تدريب/i, route: '/trainer' },
  { match: /nutrition|restaurant|food|تغذية/i, route: '/ai-nutritionist' },
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  if (c.includes('<a ') || c.includes('<button ')) {
      if (!c.includes("import Link from 'next/link'")) {
          c = c.replace(/import React[^;]*;/, "$&\nimport Link from 'next/link';");
      }
  }

  // 1. Handle actual <a> tags with empty or hash hrefs
  c = c.replace(/<a([^>]*)href="(?:#|)"([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    let dest = '/';
    let text = inner.toLowerCase();
    for (let r of routeMap) {
      if (r.match.test(text)) { dest = r.route; break; }
    }
    return `<Link${attrs}href="${dest}"${inner}</Link>`;
  });

  // 2. Convert <button> to <Link> if it's likely meant for navigation.
  c = c.replace(/<button([^>]*)>([\s\S]*?)<\/button>/gi, (m, attrs, inner) => {
    let dest = null;
    let text = inner.toLowerCase();
    
    // exclude tiny icon-only buttons like notifications to prevent bizarre jumps
    if (text.includes('notifications') || text.includes('menu') || text.includes('close')) return m;

    for (let r of routeMap) {
      if (r.match.test(text)) { dest = r.route; break; }
    }

    if (dest) {
        let safeAttrs = attrs.replace(/\btype="[^"]*"/gi, '').replace(/\bdisabled(?:="")?\b/gi, '');
        // Replace class inside attrs if not using className
        safeAttrs = safeAttrs.replace(/\bclass="/gi, 'className="');
        return `<Link href="${dest}"${safeAttrs}>${inner}</Link>`;
    }
    return m;
  });

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Automapped interactive buttons in: ' + f);
  }
});
