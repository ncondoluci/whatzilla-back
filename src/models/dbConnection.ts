import sequelize from '../config/db';

const dbConnection = async () => {
    try {
        await sequelize.authenticate();  // Verify the connection
        console.log('Database connection successful');

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true, logging: false });
            console.log('Tables synchronized with alter');
        } else {
            console.log('Production environment: automatic synchronization is not performed');
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
