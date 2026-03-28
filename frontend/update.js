const fs = require('fs');
const ar = JSON.parse(fs.readFileSync('f:\\Gem Z\\frontend\\src\\lib\\ar.json', 'utf8'));
const missing = JSON.parse(fs.readFileSync('f:\\Gem Z\\frontend\\missing_ar.json', 'utf8'));
const newAr = { ...ar, ...missing };
fs.writeFileSync('f:\\Gem Z\\frontend\\src\\lib\\ar.json', JSON.stringify(newAr, null, 4), 'utf8');
console.log('Successfully merged ' + Object.keys(missing).length + ' missing translations into ar.json');
