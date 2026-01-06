const { SitemapStream, streamToPromise } = require('sitemap');

async function generateSitemap() {
    const sitemap = new SitemapStream({ hostname: 'https://mg-drive.com' });

    sitemap.write({ url: '/', changefreq: 'weekly', priority: 1 });
    sitemap.write({ url: '/tests', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/groups', changefreq: 'monthly', priority: 0.5 });
    sitemap.end();

    return streamToPromise(sitemap).then((data) => data.toString());
}

module.exports = generateSitemap;
