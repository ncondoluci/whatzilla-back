import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import Campaign from './Campaign';
class CampaignReport extends Model {
    public id!: number;
    public uid!: string; // UUID
    public campaign_id!: string;
    public status!: 'cancelled' | 'stopped' | 'sent' | 'pending' | 'running';
    public sent_porcent!: number;
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
    sent_porcent: {
        type: DataTypes.FLOAT,
        allowNull: false,
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
