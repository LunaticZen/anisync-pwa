const fs = require('fs');
let content = fs.readFileSync('package.json', 'utf8');

const json = JSON.parse(content);
// If there are duplicate keys, JSON.parse naturally takes the last one.
// Let's just stringify it back to remove duplicates.
fs.writeFileSync('package.json', JSON.stringify(json, null, 2) + '\n');
console.log('Fixed package.json');
