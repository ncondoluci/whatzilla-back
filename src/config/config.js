require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'whatzilla_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'whatzilla_test',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'whatzilla_prod',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
  }
};
