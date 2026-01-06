module.exports = controllers = {
    // security
    auth: require('./auth'),
    error: require('./error'),
    
    test: require('./test'),
    group: require('./group'),
    question: require('./question'),
    gallery: require('./gallery'),
    registration: require('./registration'),
    image: require('./image'),
    user: require('./user'),
    contact: require('./contact'),
    view: require('./view'),
    review: require('./review'),
    faq: require('./faq'),
    
    // Admin
    admin_view: require('./admin_view'),
};
