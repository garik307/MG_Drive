const Sequelize = require('sequelize');

const dbName = process.env.DB_NAME;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;

const dbConfig = {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 100,
        min: 10,
        acquire: 20000,
        idle: 5000
    },
    define: {
        timestamp: true,
        createdAt: true,
        updatedAt: true,
        freezeTableName: true
    }
};

const connect = new Sequelize(dbName, dbUsername, dbPassword, dbConfig);
connect
    .authenticate()
    .then(() => {
        console.log('DB connection ✔️');
    })
    .catch((e) => {
        console.error('Error connecting to the database:', e.message);
    });

const DB = { con: connect, Sequelize };

module.exports = DB;
