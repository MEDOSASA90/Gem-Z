import fs from 'fs';

const htmlFile = 'F:/Gem Z/stitch-design/stitch_gem_z_ecosystem_blueprint/code.html';
const outPath = 'F:/Gem Z/frontend/src/app/page.tsx';

if (fs.existsSync(htmlFile)) {
   let html = fs.readFileSync(htmlFile, 'utf8');
   let bodyMatches = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
   let innerHtml = bodyMatches ? bodyMatches[1] : html;
   
   let jsx = innerHtml
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/\bclass="/g, 'className="')
    .replace(/\bfor="/g, 'htmlFor="')
    .replace(/\btabindex="/g, 'tabIndex="')
    .replace(/\bviewbox="/g, 'viewBox="')
    // self close imgs/inputs
    .replace(/<img([^>]*)>(?!\s*<\/img>)/gi, (m, attr) => {
        if (attr.trim().endsWith('/')) return m;
        return `<img${attr} />`;
    })
    .replace(/<input([^>]*)>(?!\s*<\/input>)/gi, (m, attr) => {
        if (attr.trim().endsWith('/')) return m;
        return `<input${attr} />`;
    })
    .replace(/<(link|meta)([^>]*?)>(?!\s*<\/(link|meta)>)/gi, (m, tag, attr) => {
        if (attr.trim().endsWith('/')) return m;
        return `<${tag}${attr} />`;
    })
    .replace(/<br>/gi, '<br />')
    .replace(/<hr>/gi, '<hr />')
    // Extract styles safely
    .replace(/<style>([\s\S]*?)<\/style>/gi, (match, inner) => {
      return `<style dangerouslySetInnerHTML={{ __html: \`${inner.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />`;
    })
    // Material icons font-variation-settings
    .replace(/style="([^"]*)"/g, (m, val) => {
      if (val.includes('font-variation-settings')) {
        let isFill = val.includes("'FILL' 1");
        return `style={{ fontVariationSettings: "'FILL' ${isFill ? 1 : 0}" }}`;
      }
      return '';
    });

    // Fix TS stuff
    jsx = jsx.replace(/\bchecked(?:="")?/g, 'defaultChecked');
    jsx = jsx.replace(/<lineargradient/gi, '<linearGradient');
    jsx = jsx.replace(/<\/lineargradient>/gi, '</linearGradient>');
    jsx = jsx.replace(/\bpreserveaspectratio="/gi, 'preserveAspectRatio="');
    jsx = jsx.replace(/\bmaxlength="(\d+)"/gi, 'maxLength={$1}');
    jsx = jsx.replace(/\brows="(\d+)"/g, 'rows={$1}');

    const svgAttrs = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stop-color', 'stop-opacity', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule', 'clip-path', 'vector-effect'];
    svgAttrs.forEach(attr => {
        let camel = attr.split('-').map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join('');
        let regex = new RegExp(attr + '=', 'gi');
        jsx = jsx.replace(regex, camel + '=');
    });

    const svgFilters = {
        'femerge': 'feMerge', 'femergenode': 'feMergeNode', 'feoffset': 'feOffset',
        'fegaussianblur': 'feGaussianBlur', 'fecolormatrix': 'feColorMatrix',
        'feblend': 'feBlend', 'feflood': 'feFlood', 'fecomposite': 'feComposite',
        'fefill': 'feFill', 'stddeviation': 'stdDeviation',
        'flood-opacity': 'floodOpacity', 'flood-color': 'floodColor',
        'color-interpolation-filters': 'colorInterpolationFilters'
    };
    Object.entries(svgFilters).forEach(([lower, camel]) => {
        let regex = new RegExp('<' + lower, 'gi');
        jsx = jsx.replace(regex, '<' + camel);
        let regexClose = new RegExp('</' + lower + '>', 'gi');
        jsx = jsx.replace(regexClose, '</' + camel + '>');
        let regexAttr = new RegExp('\\b' + lower + '=', 'gi');
        jsx = jsx.replace(regexAttr, camel + '=');
    });

   // Write Final page
   const finalCode = `import React from 'react';\n\nexport default function LandingPage() {\n  return (\n    <div className="bg-surface-container-lowest text-on-surface min-h-screen relative font-body">\n      ${jsx}\n    </div>\n  );\n}\n`;
   fs.writeFileSync(outPath, finalCode);
   console.log('[SUCCESS] Replaced src/app/page.tsx with stitch_gem_z_ecosystem_blueprint HTML');
} else {
   console.log('[ERROR] code.html not found in the blueprint directory');
}
