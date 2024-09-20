import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import Campaign from './Campaign';
class CampaignReport extends Model {
    public id!: number;
    public campaign_id!: number;
    public status!: 'cancelled' | 'stopped' | 'sent' | 'pending';
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
    campaign_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Campaign,
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    status: {
        type: DataTypes.ENUM('cancelled', 'stopped', 'sent', 'pending'),
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
