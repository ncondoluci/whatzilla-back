import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import Campaign from './Campaign';

class CampaignReport extends Model {
    public id!: number;
    public uid!: string; // UUID
    public campaign_id!: string;
    public status!: 'cancelled' | 'stopped' | 'sent' | 'pending' | 'running';
    public pending!: number;
    public delivered!: number;
    public read!: number;
    public with_error!: number;
    public sent_percent!: number;
    public total_batch!: number; 
    public run_at!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CampaignReport.init({
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
    campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Campaign,
            key: 'uid',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    status: {
        type: DataTypes.ENUM('cancelled', 'stopped', 'sent', 'pending', 'running'),
        allowNull: false,
    },
    pending: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    delivered: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    read: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    sent_percent: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
    },
    with_error: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    total_batch: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    run_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'CampaignReport',
    tableName: 'campaign_reports',
    timestamps: true,
});

export default CampaignReport;
