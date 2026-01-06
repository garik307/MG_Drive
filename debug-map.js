const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'client', 'dist', 'css', 'main.css.map');

try {
    const mapContent = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(mapContent);

    const sources = map.sources;
    const sourcesContent = map.sourcesContent;

    console.log('Sources found:', sources.length);
    sources.forEach((s, i) => {
        const content = sourcesContent[i];
        console.log(`[${i}] ${s}: ${content ? content.length : 'null'} chars`);
        if (s.includes('main.scss')) {
             console.log('--- PREVIEW of ' + s + ' ---');
             console.log(content ? content.substring(0, 100) : 'NULL');
        }
    });

} catch (err) {
    console.error('Error:', err);
}
