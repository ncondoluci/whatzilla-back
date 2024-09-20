import sequelize from '../config/db';

const dbConnection = async () => {
    try {
        await sequelize.authenticate();  // Verificar la conexión
        console.log('Conexión a la base de datos exitosa');

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true, logging: false });
            console.log('Tablas sincronizadas con alter');
        } else {
            console.log('Entorno de producción: no se realiza la sincronización automática');
        }

    } catch (error) {
        console.error('Error conectando a la base de datos:', error);
    }
}

export default dbConnection;
