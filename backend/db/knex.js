const knex = require('knex');
const config = require('../knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env === 'test' ? 'test' : env === 'production' ? 'production' : 'development']);

module.exports = db;
