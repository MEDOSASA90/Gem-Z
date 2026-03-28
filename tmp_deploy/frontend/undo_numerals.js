const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src', 'app'));
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Reverse the exact corruption logic (- becomes -1) -> (-1 becomes -)
    if (content.includes('-1')) {
        const restored = content.split('-1').join('-');
        fs.writeFileSync(file, restored, 'utf8');
         console.log('Restored:', file);
    }
});
console.log('Done!');
