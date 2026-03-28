import fs from 'fs';
import path from 'path';

const stitchDir = 'F:/Gem Z/stitch-design';
const outDir = 'F:/Gem Z/frontend/src/app';

const mappings = {
  'admin_panel_v2': 'admin/page.tsx',
  'ai_coach_chat_with_fab': 'ai-coach/page.tsx',
  'ai_form_analysis_fab': 'ai-form/page.tsx',
  'ai_nutritionist_fab': 'ai-nutritionist/page.tsx',
  'auctions_bidding_with_fab_2': 'bidding/page.tsx',
  'challenges_ranks_with_fab': 'challenges/page.tsx',
  'direct_chat_with_fab_2': 'chat/page.tsx',
  'exercise_library_with_fab': 'exercises/page.tsx',
  'flash_deals_with_fab_2': 'flash-deals/page.tsx',
  'gem_z_kinetic': 'page.tsx',
  'gem_z_shop_with_fab': 'shop/page.tsx',
  'gem_z_wallet_with_fab_2': 'wallet/page.tsx',
  'gym_dashboard_v2': 'gym/page.tsx',
  'gym_map_navigator_with_fab': 'gym-map/page.tsx',
  'gym_registration_wizard': 'register/gym/page.tsx',
  'social_feed_with_kinetic_fab': 'social/page.tsx',
  'live_training_session_with_fab_2': 'live/page.tsx',
  'progress_hub_with_fab_2': 'progress/page.tsx',
  'store_dashboard_v2': 'store/dashboard/page.tsx',
  'store_registration_wizard': 'register/store/page.tsx',
  'trainee_dashboard_v2': 'trainee/page.tsx',
  'trainee_registration_wizard': 'register/trainee/page.tsx',
  'trainer_dashboard_v2': 'trainer/page.tsx',
  'trainer_registration_wizard': 'register/trainer/page.tsx',
  // Extra aliases based on your screenshot
  'challenges_ranks_fab': 'challenges/page.tsx',
  'gym_map_navigator_fab': 'gym-map/page.tsx',
  'kinetic_social_feed_v2': 'social/page.tsx',
  'social_feed_with_fab': 'social/page.tsx',
};

function convertHtmlToJsx(html) {
  let bodyMatches = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let innerHtml = bodyMatches ? bodyMatches[1] : html;
  
  // Basic translation 
  let jsx = innerHtml
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/\bclass="/g, 'className="')
    .replace(/\bfor="/g, 'htmlFor="')
    .replace(/\btabindex="/g, 'tabIndex="')
    .replace(/\bviewbox="/g, 'viewBox="')
    // Avoid double closing already closed imgs
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
    .replace(/style="([^"]*)"/g, (m, val) => {
      // Basic inline style conversion for font-variation-settings which Stitch uses heavily for icons
      if (val.includes('font-variation-settings')) {
        let isFill = val.includes("'FILL' 1");
        return `style={{ fontVariationSettings: "'FILL' ${isFill ? 1 : 0}" }}`;
      }
      return ''; // Strip inline styles
    });

  return `import React from 'react';

export default function Page() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">
      ${jsx}
    </div>
  );
}
`;
}

let count = 0;
Object.entries(mappings).forEach(([folder, route]) => {
  const htmlFile = path.join(stitchDir, folder, 'code.html');
  if (fs.existsSync(htmlFile)) {
    const outPath = path.join(outDir, route);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    
    try {
        const html = fs.readFileSync(htmlFile, 'utf8');
        const jsx = convertHtmlToJsx(html);
        fs.writeFileSync(outPath, jsx);
        console.log(`[SUCCESS] Converted ${folder} -> ${route}`);
        count++;
    } catch(err) {
        console.error(`[ERROR] Failed to convert ${folder}:`, err.message);
    }
  }
});
console.log(`\\nTotal converted pages: ${count}`);
