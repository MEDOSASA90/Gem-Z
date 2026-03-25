const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
            let content = fs.readFileSync(p, 'utf8');
            let original = content;

            // Fix shadows (usually need higher alpha like 0.3)
            content = content.replace(/shadow-\[([^\]]+)rgba\(var\(--color-(primary|secondary)-rgb\), \)/g, 'shadow-[$1rgba(var(--color-$2-rgb), 0.3');

            // Fix borders (usually 0.2 to 0.3)
            content = content.replace(/border: '1px solid rgba\(var\(--color-(primary|secondary)-rgb\), \)\]?'/g, "border: '1px solid rgba(var(--color-$1-rgb), 0.25)'");
            content = content.replace(/border: \`1px solid \$\{.*?rgba\(var\(--color-(primary|secondary)-rgb\), \)\}\`/g, "border: `1px solid rgba(var(--color-$1-rgb), 0.25)`");

            // Fix backgrounds (usually 0.05 to 0.1)
            content = content.replace(/background: 'rgba\(var\(--color-(primary|secondary)-rgb\), \)'/g, "background: 'rgba(var(--color-$1-rgb), 0.1)'");
            content = content.replace(/background: \`rgba\(var\(--color-(primary|secondary)-rgb\), \)\`/g, "background: `rgba(var(--color-$1-rgb), 0.1)`");

            // Fix linear gradients
            content = content.replace(/rgba\(var\(--color-(primary|secondary)-rgb\), \)/g, 'rgba(var(--color-$1-rgb), 0.1)'); // fallback

            if (content !== original) {
                fs.writeFileSync(p, content);
                console.log('Fixed:', p);
            }
        }
    });
}
walk('src');
console.log('Done!');
