import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';
import List from './List';

class Campaign extends Model {
    public id!: number;
    public uid!: string; // UUID
    public user_id!: string;
    public list_id!: string;
    public name!: string;
    public status!: 'active' | 'disable' | 'running';
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
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    list_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: List,
            key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('active' , 'disable', 'running'),
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
