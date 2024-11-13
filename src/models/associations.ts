import User from './User';
import List from './List';
import Campaign from './Campaign';
import Subscriber from './Subscriber';
import CampaignReport from './CampaignReport';
import WhatsAppSession from '@/models/WhatsAppSession';

User.hasMany(Campaign, { foreignKey: 'user_id' });
Campaign.belongsTo(User, { foreignKey: 'user_id' });

Campaign.belongsTo(CampaignReport, { foreignKey: 'last_report_id', as: 'lastReport' });
CampaignReport.hasOne(Campaign, { foreignKey: 'last_report_id', as: 'campaign' });

User.hasMany(WhatsAppSession, { foreignKey: 'user_id', as: 'whatsappSessions'});
WhatsAppSession.belongsTo(User, { foreignKey: 'user_id', as: 'user'});

User.hasMany(List, { foreignKey: 'user_id' });
List.belongsTo(User, { foreignKey: 'user_id' });

List.hasMany(Subscriber, { foreignKey: 'list_id' });
Subscriber.belongsTo(List, { foreignKey: 'list_id' });

List.hasMany(Campaign, { foreignKey: 'list_id' });
Campaign.belongsTo(List, { foreignKey: 'list_id' });

Campaign.hasMany(CampaignReport, { foreignKey: 'campaign_id' });
CampaignReport.belongsTo(Campaign, { foreignKey: 'campaign_id' });

export { User, List, Campaign, Subscriber, CampaignReport };
