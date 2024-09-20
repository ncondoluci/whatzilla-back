import { Sequelize } from 'sequelize';

const isDevelopment = process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST!,
    dialect: 'mysql',
    logging: isDevelopment ? console.log : false, 
  }
);

export default sequelize;
