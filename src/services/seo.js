// services/seo.js
const SEO_DEFAULT = {
    title: 'Ավտոդպրոց Արթիկում - Վարորդական Դասընթացներ',
    description: 'Սկսեք վարորդական տարրալույսը ինչպես պատշաճ է՝ պրոֆեսիոնալ տեսական և գործնական դասերով։',
    og_image: '/client/images/share-logo.jpg'
};

function cleanURL(req) {
    return `${req.protocol}://${req.get('host')}${req.path}`;
}

function buildSEO(req, overrides = {}) {
    const seo = {
        title: overrides.title ?? SEO_DEFAULT.title,
        description: overrides.description ?? SEO_DEFAULT.description,
        canonical: cleanURL(req),
        og_image: `${req.protocol}://${req.get('host')}${overrides.og_image ?? SEO_DEFAULT.og_image}`
    };

    return seo;
}

module.exports = { buildSEO, SEO_DEFAULT };
