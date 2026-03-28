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

const svgFilters = {
  'femerge': 'feMerge',
  'femergenode': 'feMergeNode',
  'feoffset': 'feOffset',
  'fegaussianblur': 'feGaussianBlur',
  'fecolormatrix': 'feColorMatrix',
  'feblend': 'feBlend',
  'feflood': 'feFlood',
  'fecomposite': 'feComposite',
  'fefill': 'feFill',
  'stddeviation': 'stdDeviation',
  'flood-opacity': 'floodOpacity',
  'flood-color': 'floodColor',
  'color-interpolation-filters': 'colorInterpolationFilters'
};

walk('F:/Gem Z/frontend/src/app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  Object.entries(svgFilters).forEach(([lower, camel]) => {
     let regex = new RegExp('<' + lower, 'gi');
     c = c.replace(regex, '<' + camel);
     let regexClose = new RegExp('</' + lower + '>', 'gi');
     c = c.replace(regexClose, '</' + camel + '>');
     
     // Also replace as attribute if needed
     let regexAttr = new RegExp('\\b' + lower + '=', 'gi');
     c = c.replace(regexAttr, camel + '=');
  });

  if (c !== original) {
    fs.writeFileSync(f, c);
    console.log('Fixed SVG filters in ' + f);
  }
});
