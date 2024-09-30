import sequelize from '../config/db';

const dbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection successful');

        if (process.env.DB_SYNC === 'true') {
            await sequelize.sync({ force: true });
            console.log('Database synchronized for the first time');
        } else {
            console.log('Database connected without synchronization');
        }

    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
};

const closeDBConnection = async () => {
    try {
        await sequelize.close();
        console.log('Database connection closed successfully.');
    } catch (error) {
        console.error('Error closing the database connection:', error);
    }
};

export { dbConnection, closeDBConnection };
