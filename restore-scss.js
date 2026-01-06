const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'client', 'dist', 'css', 'main.css.map');
const targetPath = path.join(__dirname, 'public', 'client', 'assets', 'scss', 'layout', '__main.scss');

try {
    const mapContent = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(mapContent);

    const sources = map.sources;
    const sourcesContent = map.sourcesContent;

    if (!sources || !sourcesContent) {
        console.error('Source map does not contain sources or sourcesContent');
        process.exit(1);
    }

    // Find layout/__main.scss (or similar path)
    const index = sources.findIndex(s => s.includes('layout/__main.scss') || s.includes('layout/_main.scss'));

    if (index === -1) {
        console.error('Could not find layout/__main.scss in sources');
        console.log('Available sources:', sources);
        process.exit(1);
    }

    const content = sourcesContent[index];
    if (!content) {
        console.error('Content for layout/__main.scss is null or undefined');
        process.exit(1);
    }

    console.log('Recovered content length:', content.length);
    
    // Write recovered content
    fs.writeFileSync(targetPath, content);
    console.log('Successfully restored layout/__main.scss');

} catch (err) {
    console.error('Error:', err);
}
