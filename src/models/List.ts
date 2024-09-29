import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

class List extends Model {
    public id!: number;
    public uid!: string; // UUID
    public user_id!: number;  
    public name!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

List.init({
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
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'List',
    tableName: 'lists',
    timestamps: true,
});

export default List;
