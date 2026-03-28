const fs = require('fs');

const getAllFiles = function(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(dirPath + "/" + file);
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles('f:\\Gem Z\\frontend\\src\\app\\').filter(f => f.endsWith('.tsx'));

const arMap = JSON.parse(fs.readFileSync('f:\\Gem Z\\frontend\\src\\lib\\ar.json', 'utf-8'));
let missing = new Set();

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Extract translations
    const regex = /t\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!arMap[match[1]]) {
            missing.add(match[1]);
        }
    }
    
    let changed = false;
    
    // Wrap GEM Z text
    const logoRegex = /<(span|h1) className="([^"]*text-\[#ff7b00\][^"]*)"(>|.*?>)({t\("GEM Z"\)}|GEM Z)<\/\1>/g;
    if (logoRegex.test(content)) {
        content = content.replace(logoRegex, (innerMatch, tag, cls, attrs, text) => {
            if (innerMatch.includes('gem-z.shop')) return innerMatch; // Safety check
            return `<a href="https://gem-z.shop/"><${tag} className="${cls}"${attrs}${text}</${tag}></a>`;
        });
        changed = true;
    }
    
    // Wrap Avatar
    const avatarRegex = /<img([^>]+alt="User Profile"[^>]+)>/g;
    const clickHandler = `onClick={(e) => { e.preventDefault(); try { const r=JSON.parse(localStorage.getItem('gemz_user')||'{}').role; window.location.href=r==='trainer'?'/trainer':r==='gym_admin'?'/gym':(r==='store_owner'||r==='store_admin')?'/store/dashboard':'/trainee'; } catch(err) { window.location.href='/login'; } }}`;
    if (avatarRegex.test(content)) {
        content = content.replace(avatarRegex, (innerMatch, attrs) => {
            if (innerMatch.includes('onClick')) return innerMatch; // Already wrapped
            return `<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" ${clickHandler}><img${attrs}></a>`;
        });
        changed = true;
    }

    const headerAvatarRegex = /<img([^>]+alt="(?:User Profile|User|Profile)"[^>]+)>/gi;
    if (headerAvatarRegex.test(content)) {
        content = content.replace(headerAvatarRegex, (innerMatch, attrs) => {
            if (innerMatch.includes('onClick')) return innerMatch; 
            return `<a href="#" className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full block" ${clickHandler}><img${attrs}></a>`;
        });
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf-8');
    }
});

console.log('--- MISSING TRANSLATIONS ---');
console.log(JSON.stringify(Array.from(missing), null, 2));
