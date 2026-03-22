const fs = require('fs');
const path = require('path');
const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const replaceArabic = (str) => {
    return str.replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));
};

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
    const content = fs.readFileSync(file, 'utf8');
    if (/[٠-٩]/.test(content)) {
        const newContent = replaceArabic(content);
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Fixed:', file);
    }
});
console.log('Done!');
