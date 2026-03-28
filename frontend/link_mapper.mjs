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

const files = walk('F:/Gem Z/frontend/src/app');

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  // Add Link import if not present and if a tags exist
  if (c.includes('<a ') && !c.includes("import Link from 'next/link'")) {
      c = c.replace(/import React[^;]*;/, "$&\nimport Link from 'next/link';");
  }

  // Very aggressive but smart mapping based on icons/text near the href
  c = c.replace(/<a([^>]*)href="#"([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
    let dest = '/';
    
    let textAndIcons = inner.toLowerCase();
    if (textAndIcons.includes('smart_toy') || textAndIcons.includes('coach') || textAndIcons.includes('psychology')) dest = '/ai-coach';
    else if (textAndIcons.includes('shopping_bag') || textAndIcons.includes('shop')) dest = '/shop';
    else if (textAndIcons.includes('group') || textAndIcons.includes('squads')) dest = '/squads';
    else if (textAndIcons.includes('wallet') || textAndIcons.includes('account_balance_wallet')) dest = '/wallet';
    else if (textAndIcons.includes('nutrition') || textAndIcons.includes('restaurant')) dest = '/ai-nutritionist';
    else if (textAndIcons.includes('feed') || textAndIcons.includes('dynamic_feed')) dest = '/social';
    else if (textAndIcons.includes('leaderboard') || textAndIcons.includes('military_tech')) dest = '/challenges';
    else if (textAndIcons.includes('home')) dest = '/trainee';
    else if (textAndIcons.includes('person') || textAndIcons.includes('profile')) dest = '/admin'; // or trainee profile
    else if (textAndIcons.includes('bolt') || textAndIcons.includes('activity')) dest = '/progress';
    else if (textAndIcons.includes('gavel') || textAndIcons.includes('auctions')) dest = '/bidding';
    else if (textAndIcons.includes('gym')) dest = '/gym';

    let linkAttrs = attrs;
    // Replace class with className in case of any raw a tags missed
    linkAttrs = linkAttrs.replace(/\bclass="/gi, 'className="');
    
    return `<Link${linkAttrs}href="${dest}"${inner}</Link>`;
  });

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Mapped links in ' + f);
  }
});
