module.exports = function server(app) {
    const DB = require('../models');
    DB.con
        .sync({ alter: false })
        .then(async (res) => {
            // await ensureQuestionNumberColumn();
            const port = process.env.PORT || 3300;
            const server = app.listen(port, () => console.log(`App running on port ${port}...`));
 
            process.on('unhandledRejection', e => {
                console.log('UNHANDLED REJECTION! Shutting down...');
                console.log(e.name, e.message);
                server.close(() => process.exit(1));
            })
        }).catch(e => console.log(e));
    return DB;
} 
