const fs = require('fs');
const path = '/Users/fathallahlahlou/Workspace/clients-web/src/components/booking/vehicle-details-panel.tsx';
let code = fs.readFileSync(path, 'utf8');

const targetRegex = /const title = parts\[0\].replace\(\/\\[Day \\d\+\\]\/, ''\).trim\(\);\n                          const mathParts = parts\[1\].split\('='\);\n                          const math = mathParts\[0\].trim\(\);\n                          const total = mathParts\[1\]\?.trim\(\) \|\| '';/;

const replacement = `const title = parts[0].replace(/\\[Day \\d+\\]/, '').trim();
                          const mathParts = parts[1].split('=');
                          const curr = option.currencySymbol || option.currency || '$';
                          let math = mathParts[0].trim().replace('@', '×');
                          if (math.includes('× ') && !math.includes('× $') && !math.includes('× ' + curr)) {
                              math = math.replace('× ', '× ' + curr);
                          }
                          let total = mathParts[1]?.trim() || '';
                          if (total && !total.startsWith('$') && !total.startsWith(curr)) {
                              total = curr + total;
                          }`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync(path, code);
console.log("modal math patched");
