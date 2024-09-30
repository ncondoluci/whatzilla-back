import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db'; 
import List from './List';

class Subscriber extends Model {
    public id!: number;
    public uid!: string; // UUID
    public list_id!: string;
    public first_name!: string;
    public last_name!: string;
    public email!: string;
    public status!: 'unsuscribed' | 'confirmed' | 'blacklisted';

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Subscriber.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, 
    },
    uid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
    list_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: List,
            key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true,
        },
        unique: true,
    },
    status: {
        type: DataTypes.ENUM('unsuscribed', 'confirmed', 'blacklisted'),
        allowNull: false,
        defaultValue: 'confirmed',
    },
}, {
    sequelize,
    modelName: 'Subscriber',
    tableName: 'subscribers',
    timestamps: true,
});

export default Subscriber;
