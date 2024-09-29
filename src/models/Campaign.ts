import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import List from './List';

class Campaign extends Model {
    public id!: number;
    public uid!: string; // UUID
    public user_id!: number;
    public list_id!: number;
    public name!: string;
    public status!: 'active' | 'disable';
    public sent_at?: Date;    

    // Timestamps automáticos
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Campaign.init({
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
    list_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: List,
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('active' , 'disable'),
        allowNull: false,
        defaultValue: 'active',
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Campaign',
    tableName: 'campaigns',
    timestamps: true, 
});

export default Campaign;
