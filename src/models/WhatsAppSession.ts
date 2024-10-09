import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/db';
import User from '@/models/User'; 

class WhatsAppSession extends Model {
  public id!: number;
  public uid!: string;
  public user_id!: number;
  public session_data!: object; 
  public isActive!: boolean;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WhatsAppSession.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
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
    session_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
    {
        sequelize, 
        tableName: 'whatsapp_sessions',
        modelName: 'WhatsAppSession',
        timestamps: true   
    }
);

export default WhatsAppSession;
