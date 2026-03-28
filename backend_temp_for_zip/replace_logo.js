const fs = require('fs');

const config = [
  { file: '../frontend/src/app/login/page.tsx', depth: 2 },
  { file: '../frontend/src/app/register/page.tsx', depth: 2 },
  { file: '../frontend/src/app/register/trainer/page.tsx', depth: 3 },
  { file: '../frontend/src/app/register/trainee/page.tsx', depth: 3 },
  { file: '../frontend/src/app/register/store/page.tsx', depth: 3 },
  { file: '../frontend/src/app/register/gym/page.tsx', depth: 3 },
  { file: '../frontend/src/app/pricing/page.tsx', depth: 2 },
  { file: '../frontend/src/app/page.tsx', depth: 1 }
];

for (const {file, depth} of config) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('gem-z-logo.png')) {
     // Swap out the img tag
     content = content.replace(/<img[^>]*src="\/gem-z-logo[^"]*\.png"[^>]*>/g, '<div className="flex justify-center w-full"><GemZLogo size={60} variant="full" /></div>');
     
     // Add missing import
     if (!content.includes('components/GemZLogo')) {
        let rel = '../'.repeat(depth) + 'components/GemZLogo';
        if(depth === 1) rel = '../components/GemZLogo';
        
        // Find a safe spot to insert the import
        if (content.includes("import React")) {
            content = content.replace("import React", `import GemZLogo from '${rel}';\nimport React`);
        } else {
            content = `import GemZLogo from '${rel}';\n` + content;
        }
     }
     fs.writeFileSync(file, content);
     console.log('Replaced in ' + file);
  }
}
console.log('Done replacing logos');
